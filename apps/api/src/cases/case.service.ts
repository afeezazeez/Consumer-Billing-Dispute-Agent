import { needsStatementRecheck } from "../documents/document-review";
import type { DocumentReviewService } from "../documents/document-review.service";
import type { AttachmentService } from "../storage/attachment.service";
import type { PendingCaseAttachment, StoredCaseAttachment } from "./case-attachment";
import { randomUUID } from "node:crypto";
import { createEmptyCaseIntake } from "./case-intake";
import type { CaseAgentToolActivity, CaseIntakeAgent, CaseIntakeAgentResult } from "./case-intake-agent";
import { appendEmailDraftEvent, createPendingEmailDraft, type ApprovedCaseEmailDraft, type CaseEmailDraft, type EmailApprovalDecision } from "./case-email-draft";
import type { EmailConnector } from "../connectors/email/email-connector.interface";
import { EmailDeliveryError } from "../connectors/email/email-delivery-error";
import { ClientErrorException } from "../exceptions/client.error.exception";
import { ResponseStatus } from "../enums/response-status";
import type { AgentTurnQueueJob } from "../jobs/job.types";
import type { CaseConversation, CaseMessageRecord, CaseRepository, CaseSummary } from "./case.repository";

export interface CreateCaseInput {
  attachments?: PendingCaseAttachment[];
  attachmentIds?: string[];
  openingMessage: string;
  caseId?: string;
  messageId?: string;
}

export interface AppendCaseMessageInput {
  attachments?: PendingCaseAttachment[];
  attachmentIds?: string[];
  messageId?: string;
  caseId: string;
  content: string;
}

export interface RetryCaseMessageInput {
  caseId: string;
  messageId: string;
  content?: string;
}

export class CaseService {
  constructor(
    private readonly caseRepository: CaseRepository,
    private readonly caseIntakeAgent: CaseIntakeAgent,
    private readonly attachmentService: AttachmentService,
    private readonly documentReviewService: DocumentReviewService,
    private readonly emailConnector: EmailConnector,
  ) {}

  async createCase(userId: string, input: CreateCaseInput): Promise<CaseConversation> {
    const existingCase = input.caseId ? await this.caseRepository.findForUser(userId, input.caseId) : undefined;
    if (existingCase) {
      return input.attachments?.length || input.attachmentIds?.length ? existingCase : this.resumeExistingCase(userId, existingCase, input);
    }
    const userMessage = createMessage("user", input.openingMessage, input.messageId);
    const billingCase = await this.saveWithAttachments(input.attachments, (attachments) => this.caseRepository.createPendingCase({
      userId,
      caseId: input.caseId,
      title: createTitle(input.openingMessage),
      userMessage,
      attachments,
      attachmentIds: input.attachmentIds,
      intake: createEmptyCaseIntake(),
    }));
    if (!billingCase) throw new Error("Unable to save case");
    return billingCase;
  }

  private saveWithAttachments(
    files: PendingCaseAttachment[] | undefined,
    persist: (attachments: StoredCaseAttachment[]) => Promise<CaseConversation | undefined>,
  ): Promise<CaseConversation | undefined> {
    return this.attachmentService.save(files, async (attachments) => {
      const result = await persist(attachments);
      const retainedIds = new Set(result?.messages.flatMap((message) =>
        message.attachments?.map(({ id }) => id) ?? [],
      ));
      return { result, retainedIds };
    });
  }

  private async resumeExistingCase(
    userId: string,
    billingCase: CaseConversation,
    input: CreateCaseInput,
  ): Promise<CaseConversation> {
    const message = billingCase.messages.find((item) => item.id === input.messageId);
    if (!message || message.processingStatus !== "failed") return billingCase;
    return (await this.retryFailedMessage(userId, {
      caseId: billingCase.id,
      messageId: message.id,
      content: input.openingMessage === message.content ? undefined : input.openingMessage,
    })) ?? billingCase;
  }

  async appendMessage(userId: string, input: AppendCaseMessageInput): Promise<CaseConversation | undefined> {
    const billingCase = await this.caseRepository.findForUser(userId, input.caseId);
    if (!billingCase) return undefined;
    if (input.messageId && billingCase.messages.some(({ id }) => id === input.messageId)) return billingCase;
    const userMessage = createMessage("user", input.content, input.messageId);
    const updatedCase = await this.saveWithAttachments(input.attachments, (attachments) => this.caseRepository.appendPendingMessage({
      userId,
      caseId: input.caseId,
      userMessage,
      attachments,
      attachmentIds: input.attachmentIds,
    }));
    if (!updatedCase) return undefined;
    return updatedCase;
  }

  async retryFailedMessage(userId: string, input: RetryCaseMessageInput): Promise<CaseConversation | undefined> {
    const billingCase = await this.caseRepository.findForUser(userId, input.caseId);
    if (!hasFailedUserMessage(billingCase, input.messageId)) return undefined;
    const retryCase = await this.caseRepository.prepareFailedMessageRetry({
      userId,
      caseId: input.caseId,
      messageId: input.messageId,
      content: input.content?.trim(),
    });
    if (!retryCase) return undefined;
    return retryCase;
  }

  async processAgentTurn(job: AgentTurnQueueJob, userFirstName?: string): Promise<CaseConversation> {
    const startedAt = Date.now();
    const billingCase = await this.caseRepository.findForUser(job.userId, job.caseId);
    if (!billingCase) throw new Error("Case disappeared while processing the message");
    const userMessage = billingCase.messages.find((message) => message.id === job.messageId);
    if (!userMessage) throw new Error("Message disappeared while processing the case");
    await this.readTurnDocuments(job, userMessage, billingCase.messages);
    const isOpeningTurn = billingCase.messages[0]?.id === job.messageId
      && !billingCase.messages.some((message) => message.role === "assistant");
    let activities = userMessage.toolActivities ?? [];
    let activityWrites = Promise.resolve();
    const result = await this.caseIntakeAgent.respond({
      caseId: job.caseId,
      userId: job.userId,
      messages: billingCase.messages,
      messageId: job.messageId,
      intake: billingCase.intake,
      gmailConnected: (await this.emailConnector.getStatus(job.userId)).connected,
      nextAction: billingCase.nextAction,
      userFirstName,
      generateCaseTitle: isOpeningTurn,
    }, (activity) => {
      activities = upsertActivity(activities, activity);
      const snapshot = [...activities];
      activityWrites = activityWrites.then(() =>
        this.caseRepository.updatePendingMessageActivities(job.userId, job.caseId, job.messageId, snapshot));
    });
    await activityWrites;
    const assistantMessage = createAssistantMessage(result, userMessage.createdAt, Date.now() - startedAt);
    const completedCase = await this.caseRepository.completeTurn({
      userId: job.userId,
      caseId: job.caseId,
      userMessageId: job.messageId,
      assistantMessage,
      caseTitle: isOpeningTurn && result.caseTitle ? createTitle(result.caseTitle) : undefined,
      intake: result.intake,
      nextAction: result.nextAction,
    });
    if (!completedCase) throw new Error("Unable to save the agent response");
    return completedCase;
  }

  async failAgentTurn(userId: string, caseId: string, messageId: string): Promise<void> {
    await this.caseRepository.markMessageFailed(userId, caseId, messageId);
  }

  async decideEmailDraft(userId: string, caseId: string, messageId: string, decision: EmailApprovalDecision): Promise<CaseConversation | undefined> {
    if (decision.decision === "approve") await this.ensureGmailConnected(userId);
    if (decision.decision === "approve") validateApprovedDraft(decision.draft);
    const approvedDraft = decision.decision === "approve" ? decision.draft : undefined;
    const billingCase = await this.caseRepository.decideEmailDraft({ userId, caseId, messageId, decision: decision.decision, approvedDraft });
    if (!billingCase) throw new ClientErrorException("This email draft is no longer waiting for a decision.", ResponseStatus.CONFLICT);
    let assistantReply: string | undefined;
    try {
      assistantReply = await this.caseIntakeAgent.resumeEmailApproval(userId, caseId, messageId, decision);
    } catch (error) {
      logEmailDeliveryFailure(error, caseId, messageId);
      return decision.decision === "approve"
        ? this.updateEmailDraftStatus(userId, caseId, messageId, billingCase, "failed", getEmailDeliveryMessage(error), error)
        : billingCase;
    }
    return decision.decision === "approve"
      ? this.updateEmailDraftStatus(userId, caseId, messageId, billingCase, "sent", "Gmail accepted the email.", undefined, assistantReply)
      : billingCase;
  }

  private async ensureGmailConnected(userId: string): Promise<void> {
    const status = await this.emailConnector.getStatus(userId);
    if (!status.connected) throw new ClientErrorException("Connect Gmail before approving and sending this draft.", ResponseStatus.UNPROCESSABLE_ENTITY);
  }

  private updateEmailDraftStatus(userId: string, caseId: string, messageId: string, billingCase: CaseConversation, status: "sent" | "failed", summary: string, error?: unknown, assistantReply?: string): Promise<CaseConversation | undefined> {
    const draft = billingCase.messages.find((item) => item.id === messageId)?.emailDraft;
    if (!draft) return Promise.resolve(billingCase);
    const updated = appendEmailDraftEvent(draft, status, summary);
    if (status === "sent") {
      updated.sentAt = new Date().toISOString();
      if (assistantReply) updated.sentConfirmation = assistantReply;
    }
    else {
      updated.deliveryError = summary;
      updated.deliveryDiagnostic = getEmailDeliveryDiagnostic(error);
    }
    return this.caseRepository.updateEmailDraft({ userId, caseId, messageId, draft: updated });
  }

  private async readTurnDocuments(job: AgentTurnQueueJob, message: CaseMessageRecord, history: CaseMessageRecord[]): Promise<void> {
    const unread = this.findAttachmentsToRead(message, history);
    if (!unread.length) return;
    const activities = (message.toolActivities ?? []).filter(({ name }) => name !== "read_documents");
    await this.writeDocumentActivity(job, message, [
      ...activities,
      { id: `read-${job.messageId}`, name: "read_documents", label: "Reading attachments", status: "running" },
    ]);
    try {
      await this.extractAttachments(job.userId, unread);
    } finally {
      await this.writeDocumentActivity(job, message, activities);
    }
  }

  private findAttachmentsToRead(message: CaseMessageRecord, history: CaseMessageRecord[]) {
    const current = (message.attachments ?? []).filter(({ review }) => !review || needsStatementRecheck(review));
    if (current.length || message.attachments?.length) return current;
    const previous = [...history].reverse().find((item) => item.attachments?.some(({ review }) => review && needsStatementRecheck(review)));
    return (previous?.attachments ?? []).filter(({ review }) => review && needsStatementRecheck(review));
  }

  private async extractAttachments(userId: string, attachments: NonNullable<CaseMessageRecord["attachments"]>): Promise<void> {
    for (const attachment of attachments) await this.extractAttachment(userId, attachment);
  }

  private async extractAttachment(userId: string, attachment: NonNullable<CaseMessageRecord["attachments"]>[number]): Promise<void> {
    try {
      attachment.review = await this.documentReviewService.extract(userId, attachment.id);
    } catch {
      return;
    }
  }

  private writeDocumentActivity(job: AgentTurnQueueJob, message: CaseMessageRecord, activities: CaseAgentToolActivity[]): Promise<void> {
    message.toolActivities = activities;
    return this.caseRepository.updatePendingMessageActivities(job.userId, job.caseId, job.messageId, activities);
  }

  stageAttachment(userId: string, file: PendingCaseAttachment): Promise<string> {
    return this.attachmentService.save([file], async ([stored]) => {
      await this.caseRepository.stageAttachment(userId, stored);
      return { result: stored.id, retainedIds: new Set([stored.id]) };
    });
  }

  discardStagedAttachment(userId: string, attachmentId: string): Promise<void> {
    return this.caseRepository.discardStagedAttachment(userId, attachmentId);
  }

  async findAttachment(userId: string, attachmentId: string) {
    const attachment = await this.caseRepository.findAttachment(userId, attachmentId);
    return attachment ? this.attachmentService.read(attachment) : undefined;
  }

  listCases(userId: string): Promise<CaseSummary[]> {
    return this.caseRepository.listForUser(userId);
  }

  async findCase(userId: string, caseId: string): Promise<CaseConversation | undefined> {
    const billingCase = await this.caseRepository.findForUser(userId, caseId);
    if (!billingCase) return undefined;
    const gmailConnected = (await this.emailConnector.getStatus(userId)).connected;
    return {
      ...billingCase,
      messages: billingCase.messages.map((message) => message.emailDraft
        ? { ...message, emailDraft: { ...message.emailDraft, gmailConnected } }
        : message),
    };
  }

  deleteCase(userId: string, caseId: string): Promise<boolean> {
    return this.caseRepository.deleteForUser(userId, caseId);
  }

  renameCase(userId: string, caseId: string, title: string): Promise<boolean> {
    return this.caseRepository.renameForUser(userId, caseId, title.trim());
  }
}

function logEmailDeliveryFailure(error: unknown, caseId: string, messageId: string): void {
  const details = error instanceof EmailDeliveryError
    ? { certainty: error.certainty, providerCode: error.providerCode, statusCode: error.statusCode }
    : { certainty: "unknown", providerCode: "unexpected_error" };
  console.error(JSON.stringify({ event: "gmail_email_delivery_failed", caseId, messageId, ...details }));
}

function getEmailDeliveryMessage(error: unknown): string {
  if (error instanceof EmailDeliveryError && error.certainty === "not_sent") {
    return "Gmail authorization failed before sending. Reconnect Gmail, then create a new draft.";
  }
  if (error instanceof EmailDeliveryError && error.certainty === "rejected") {
    return "Gmail rejected this email. Check the recipient and connection, then create a new draft.";
  }
  return "Delivery is uncertain. Check Gmail Sent before taking another action.";
}

function getEmailDeliveryDiagnostic(error: unknown): CaseEmailDraft["deliveryDiagnostic"] {
  if (!(error instanceof EmailDeliveryError)) return { certainty: "unknown", providerCode: "unexpected_error" };
  return { certainty: error.certainty, providerCode: error.providerCode, statusCode: error.statusCode };
}

function validateApprovedDraft(draft?: ApprovedCaseEmailDraft): asserts draft is ApprovedCaseEmailDraft {
  if (!draft || !draft.recipients.trim() || !draft.subject.trim() || !draft.body.trim()) {
    throw new ClientErrorException("Add a recipient, subject, and message before sending.");
  }
  if (/[\r\n]/.test(draft.recipients) || /[\r\n]/.test(draft.subject)) {
    throw new ClientErrorException("Recipient and subject fields cannot contain line breaks.");
  }
  const emails = draft.recipients.split(/[;,]/).map((item) => item.trim());
  if (emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new ClientErrorException("Enter a valid email address for each recipient.");
  }
}

function createMessage(role: CaseMessageRecord["role"], content: string, messageId?: string): CaseMessageRecord {
  return { id: messageId ?? randomUUID(), role, content, createdAt: new Date(), processingStatus: "pending" };
}

function createAssistantMessage(result: CaseIntakeAgentResult, createdAt: Date, durationMs: number): CaseMessageRecord {
  return {
    id: randomUUID(),
    role: "assistant",
    content: result.response,
    emailDraft: result.emailDraft ? createPendingEmailDraft(result.emailDraft, new Date(createdAt.getTime() + 1), result.gmailConnected ?? false) : undefined,
    createdAt: new Date(createdAt.getTime() + 1),
    processingStatus: "complete",
    agentTurnDurationMs: durationMs,
    sources: result.sources,
    toolActivities: result.toolActivities,
    nextAction: result.nextAction,
  };
}

function upsertActivity(activities: CaseAgentToolActivity[], activity: CaseAgentToolActivity): CaseAgentToolActivity[] {
  const index = activities.findIndex((item) => item.id === activity.id);
  if (index < 0) return [...activities, activity];
  return activities.map((item) => item.id === activity.id ? activity : item);
}

function hasFailedUserMessage(
  billingCase: CaseConversation | undefined,
  messageId: string,
): boolean {
  return Boolean(billingCase?.messages.some((message) =>
    message.id === messageId && message.role === "user" && message.processingStatus === "failed"));
}

function createTitle(message: string): string {
  const normalized = message.trim().replace(/\s+/g, " ");
  return normalized.length <= 60 ? normalized : `${normalized.slice(0, 57).trimEnd()}…`;
}

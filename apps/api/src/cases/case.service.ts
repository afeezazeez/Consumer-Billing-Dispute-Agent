import { needsStatementRecheck } from "../documents/document-review";
import type { DocumentReviewService } from "../documents/document-review.service";
import type { AttachmentService } from "../storage/attachment.service";
import type { PendingCaseAttachment, StoredCaseAttachment } from "./case-attachment";
import { randomUUID } from "node:crypto";
import { createEmptyCaseIntake } from "./case-intake";
import type { CaseAgentToolActivity, CaseIntakeAgent, CaseIntakeAgentResult } from "./case-intake-agent";
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
      messages: billingCase.messages,
      intake: billingCase.intake,
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
    const assistantMessage = createAssistantMessage(result, userMessage.createdAt);
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

  findCase(userId: string, caseId: string): Promise<CaseConversation | undefined> {
    return this.caseRepository.findForUser(userId, caseId);
  }

  deleteCase(userId: string, caseId: string): Promise<boolean> {
    return this.caseRepository.deleteForUser(userId, caseId);
  }

  renameCase(userId: string, caseId: string, title: string): Promise<boolean> {
    return this.caseRepository.renameForUser(userId, caseId, title.trim());
  }
}

function createMessage(role: CaseMessageRecord["role"], content: string, messageId?: string): CaseMessageRecord {
  return { id: messageId ?? randomUUID(), role, content, createdAt: new Date(), processingStatus: "pending" };
}

function createAssistantMessage(result: CaseIntakeAgentResult, createdAt: Date): CaseMessageRecord {
  return {
    id: randomUUID(),
    role: "assistant",
    content: result.response,
    emailDraft: result.emailDraft,
    createdAt: new Date(createdAt.getTime() + 1),
    processingStatus: "complete",
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

import { randomUUID } from "node:crypto";
import { createEmptyCaseIntake } from "./case-intake";
import type { CaseAgentToolActivity, CaseIntakeAgent, CaseIntakeAgentResult } from "./case-intake-agent";
import type { AgentTurnJob } from "./agent-turn-job.repository";
import type { CaseConversation, CaseMessageRecord, CaseRepository, CaseSummary } from "./case.repository";

export interface CreateCaseInput {
  openingMessage: string;
  caseId?: string;
  messageId?: string;
}

export interface AppendCaseMessageInput {
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
  ) {}

  async createCase(userId: string, input: CreateCaseInput): Promise<CaseConversation> {
    const existingCase = input.caseId ? await this.caseRepository.findForUser(userId, input.caseId) : undefined;
    if (existingCase) return this.resumeExistingCase(userId, existingCase, input);
    const userMessage = createMessage("user", input.openingMessage, input.messageId);
    const billingCase = await this.caseRepository.createPendingCase({
      userId,
      caseId: input.caseId,
      title: createTitle(input.openingMessage),
      userMessage,
      intake: createEmptyCaseIntake(),
    });
    return billingCase;
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
    const userMessage = createMessage("user", input.content);
    const updatedCase = await this.caseRepository.appendPendingMessage({
      userId,
      caseId: input.caseId,
      userMessage,
    });
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

  async processAgentTurn(job: AgentTurnJob, userFirstName?: string): Promise<CaseConversation> {
    const billingCase = await this.caseRepository.findForUser(job.userId, job.caseId);
    if (!billingCase) throw new Error("Case disappeared while processing the message");
    const userMessage = billingCase.messages.find((message) => message.id === job.messageId);
    if (!userMessage) throw new Error("Message disappeared while processing the case");
    const isOpeningTurn = billingCase.messages[0]?.id === job.messageId
      && !billingCase.messages.some((message) => message.role === "assistant");
    let activities = userMessage.toolActivities ?? [];
    let activityWrites = Promise.resolve();
    const result = await this.caseIntakeAgent.respond({
      messages: billingCase.messages,
      intake: billingCase.intake,
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
    });
    if (!completedCase) throw new Error("Unable to save the agent response");
    return completedCase;
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

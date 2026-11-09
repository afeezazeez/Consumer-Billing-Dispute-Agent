import { randomUUID } from "node:crypto";
import { createEmptyCaseIntake } from "./case-intake";
import type { CaseAgentProgressHandler, CaseIntakeAgent, CaseIntakeAgentResult } from "./case-intake-agent";
import type { CaseConversation, CaseMessageRecord, CaseRepository, CaseSummary } from "./case.repository";

export interface CreateCaseInput {
  openingMessage: string;
  caseId?: string;
  messageId?: string;
  userFirstName?: string;
  onProgress?: CaseAgentProgressHandler;
}

export interface AppendCaseMessageInput {
  caseId: string;
  content: string;
  userFirstName?: string;
  onProgress?: CaseAgentProgressHandler;
}

export interface RetryCaseMessageInput {
  caseId: string;
  messageId: string;
  content?: string;
  userFirstName?: string;
  onProgress?: CaseAgentProgressHandler;
}

interface ProcessPendingMessageInput {
  userId: string;
  caseId: string;
  userMessageId: string;
  userFirstName?: string;
  onProgress?: CaseAgentProgressHandler;
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
    return this.processPendingMessage({
      userId,
      caseId: billingCase.id,
      userMessageId: userMessage.id,
      userFirstName: input.userFirstName,
      onProgress: input.onProgress,
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
      userFirstName: input.userFirstName,
      onProgress: input.onProgress,
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
    return this.processPendingMessage({
      userId,
      caseId: input.caseId,
      userMessageId: userMessage.id,
      userFirstName: input.userFirstName,
      onProgress: input.onProgress,
    });
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
    return this.processPendingMessage({
      userId,
      caseId: input.caseId,
      userMessageId: input.messageId,
      userFirstName: input.userFirstName,
      onProgress: input.onProgress,
    });
  }

  private async processPendingMessage(input: ProcessPendingMessageInput): Promise<CaseConversation> {
    try {
      return await this.completeAgentTurn(input);
    } catch {
      const failedCase = await this.caseRepository.markMessageFailed({
        userId: input.userId,
        caseId: input.caseId,
        messageId: input.userMessageId,
      });
      if (!failedCase) throw new Error("Unable to record the failed agent response");
      return failedCase;
    }
  }

  private async completeAgentTurn(input: ProcessPendingMessageInput): Promise<CaseConversation> {
    const billingCase = await this.caseRepository.findForUser(input.userId, input.caseId);
    if (!billingCase) throw new Error("Case disappeared while processing the message");
    const userMessage = billingCase.messages.find((message) => message.id === input.userMessageId);
    if (!userMessage) throw new Error("Message disappeared while processing the case");
    const result = await this.caseIntakeAgent.respond({
      messages: billingCase.messages,
      intake: billingCase.intake,
      userFirstName: input.userFirstName,
    }, input.onProgress);
    const assistantMessage = createAssistantMessage(result, userMessage.createdAt);
    const completedCase = await this.caseRepository.completeTurn({
      userId: input.userId,
      caseId: input.caseId,
      userMessageId: input.userMessageId,
      assistantMessage,
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
    createdAt: new Date(createdAt.getTime() + 1),
    processingStatus: "complete",
    sources: result.sources,
    toolActivities: result.toolActivities,
  };
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

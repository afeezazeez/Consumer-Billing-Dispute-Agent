import { randomUUID } from "node:crypto";
import { createEmptyCaseIntake } from "./case-intake";
import type { CaseIntakeAgent } from "./case-intake-agent";
import type { CaseConversation, CaseMessageRecord, CaseRepository, CaseSummary } from "./case.repository";

export interface CreateCaseInput {
  openingMessage: string;
  caseId?: string;
  messageId?: string;
  userFirstName?: string;
}

export interface AppendCaseMessageInput {
  caseId: string;
  content: string;
  userFirstName?: string;
}

export interface RetryCaseMessageInput {
  caseId: string;
  messageId: string;
  content?: string;
  userFirstName?: string;
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
    return this.processPendingMessage(userId, billingCase.id, userMessage.id, input.userFirstName);
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
    return this.processPendingMessage(userId, input.caseId, userMessage.id, input.userFirstName);
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
    return this.processPendingMessage(userId, input.caseId, input.messageId, input.userFirstName);
  }

  private async processPendingMessage(
    userId: string,
    caseId: string,
    userMessageId: string,
    userFirstName?: string,
  ): Promise<CaseConversation> {
    try {
      return await this.completeAgentTurn(userId, caseId, userMessageId, userFirstName);
    } catch {
      const failedCase = await this.caseRepository.markMessageFailed({ userId, caseId, messageId: userMessageId });
      if (!failedCase) throw new Error("Unable to record the failed agent response");
      return failedCase;
    }
  }

  private async completeAgentTurn(
    userId: string,
    caseId: string,
    userMessageId: string,
    userFirstName?: string,
  ): Promise<CaseConversation> {
    const billingCase = await this.caseRepository.findForUser(userId, caseId);
    if (!billingCase) throw new Error("Case disappeared while processing the message");
    const userMessage = billingCase.messages.find((message) => message.id === userMessageId);
    if (!userMessage) throw new Error("Message disappeared while processing the case");
    const result = await this.caseIntakeAgent.respond({
      messages: billingCase.messages,
      intake: billingCase.intake,
      userFirstName,
    });
    const assistantMessage = createAssistantMessage(result.response, userMessage.createdAt);
    const completedCase = await this.caseRepository.completeTurn({
      userId,
      caseId,
      userMessageId,
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

function createAssistantMessage(content: string, createdAt: Date): CaseMessageRecord {
  return {
    id: randomUUID(),
    role: "assistant",
    content,
    createdAt: new Date(createdAt.getTime() + 1),
    processingStatus: "complete",
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

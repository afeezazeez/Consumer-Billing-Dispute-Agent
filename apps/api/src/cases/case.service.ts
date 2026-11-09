import { randomUUID } from "node:crypto";
import { createEmptyCaseIntake } from "./case-intake";
import type { CaseIntakeAgent } from "./case-intake-agent";
import type { CaseConversation, CaseMessageRecord, CaseRepository, CaseSummary } from "./case.repository";

export interface CreateCaseInput {
  openingMessage: string;
  userFirstName?: string;
}

export interface AppendCaseMessageInput {
  caseId: string;
  content: string;
  userFirstName?: string;
}

export class CaseService {
  constructor(
    private readonly caseRepository: CaseRepository,
    private readonly caseIntakeAgent: CaseIntakeAgent,
  ) {}

  async createCase(userId: string, input: CreateCaseInput): Promise<CaseConversation> {
    const userMessage = createMessage("user", input.openingMessage);
    const context = { messages: [userMessage], intake: createEmptyCaseIntake(), userFirstName: input.userFirstName };
    const result = await this.caseIntakeAgent.respond(context);
    const assistantMessage = createAssistantMessage(result.response, userMessage.createdAt);
    return this.caseRepository.createWithTurn({
      userId,
      title: createTitle(input.openingMessage),
      messages: [userMessage, assistantMessage],
      intake: result.intake,
    });
  }

  async appendMessage(userId: string, input: AppendCaseMessageInput): Promise<CaseConversation | undefined> {
    const billingCase = await this.caseRepository.findForUser(userId, input.caseId);
    if (!billingCase) return undefined;
    const userMessage = createMessage("user", input.content);
    const messages = [...billingCase.messages, userMessage];
    const context = { messages, intake: billingCase.intake, userFirstName: input.userFirstName };
    const result = await this.caseIntakeAgent.respond(context);
    const assistantMessage = createAssistantMessage(result.response, userMessage.createdAt);
    return this.caseRepository.appendTurn({
      userId,
      caseId: input.caseId,
      messages: [userMessage, assistantMessage],
      intake: result.intake,
    });
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

function createMessage(role: CaseMessageRecord["role"], content: string): CaseMessageRecord {
  return { id: randomUUID(), role, content, createdAt: new Date() };
}

function createAssistantMessage(content: string, userMessageCreatedAt: Date): CaseMessageRecord {
  return {
    id: randomUUID(),
    role: "assistant",
    content,
    createdAt: new Date(userMessageCreatedAt.getTime() + 1),
  };
}

function createTitle(message: string): string {
  const normalized = message.trim().replace(/\s+/g, " ");
  return normalized.length <= 60 ? normalized : `${normalized.slice(0, 57).trimEnd()}…`;
}

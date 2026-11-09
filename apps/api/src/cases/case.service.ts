import { randomUUID } from "node:crypto";
import { createEmptyCaseIntake } from "./case-intake";
import type { CaseIntakeAgent } from "./case-intake-agent";
import type { CaseConversation, CaseMessageRecord, CaseRepository, CaseSummary } from "./case.repository";

export class CaseService {
  constructor(
    private readonly caseRepository: CaseRepository,
    private readonly caseIntakeAgent: CaseIntakeAgent,
  ) {}

  async createCase(userId: string, openingMessage: string): Promise<CaseConversation> {
    const userMessage = createMessage("user", openingMessage);
    const result = await this.caseIntakeAgent.respond({ messages: [userMessage], intake: createEmptyCaseIntake() });
    const assistantMessage = createAssistantMessage(result.response, userMessage.createdAt);
    return this.caseRepository.createWithTurn({
      userId,
      title: createTitle(openingMessage),
      messages: [userMessage, assistantMessage],
      intake: result.intake,
    });
  }

  async appendMessage(userId: string, caseId: string, content: string): Promise<CaseConversation | undefined> {
    const billingCase = await this.caseRepository.findForUser(userId, caseId);
    if (!billingCase) return undefined;
    const userMessage = createMessage("user", content);
    const messages = [...billingCase.messages, userMessage];
    const result = await this.caseIntakeAgent.respond({ messages, intake: billingCase.intake });
    const assistantMessage = createAssistantMessage(result.response, userMessage.createdAt);
    return this.caseRepository.appendTurn({
      userId,
      caseId,
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

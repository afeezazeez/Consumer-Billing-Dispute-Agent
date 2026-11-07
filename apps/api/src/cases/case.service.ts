import type { CaseConversation, CaseRepository, CaseSummary } from "./case.repository";

export class CaseService {
  constructor(private readonly cases: CaseRepository) {}

  createCase(userId: string, openingMessage: string): Promise<CaseConversation> {
    return this.cases.create(userId, createTitle(openingMessage), openingMessage);
  }

  appendMessage(userId: string, caseId: string, content: string): Promise<CaseConversation | undefined> {
    return this.cases.appendMessage(userId, caseId, content);
  }

  listCases(userId: string): Promise<CaseSummary[]> {
    return this.cases.listForUser(userId);
  }

  findCase(userId: string, caseId: string): Promise<CaseConversation | undefined> {
    return this.cases.findForUser(userId, caseId);
  }

  deleteCase(userId: string, caseId: string): Promise<boolean> {
    return this.cases.deleteForUser(userId, caseId);
  }
}

function createTitle(message: string): string {
  const normalized = message.trim().replace(/\s+/g, " ");
  return normalized.length <= 60 ? normalized : `${normalized.slice(0, 57).trimEnd()}…`;
}

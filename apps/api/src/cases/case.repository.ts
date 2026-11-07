export interface CaseMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface CaseSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
  lastMessage: string;
}

export interface CaseConversation extends CaseSummary {
  createdAt: Date;
  messages: CaseMessageRecord[];
}

export interface CaseRepository {
  create(userId: string, title: string, openingMessage: string): Promise<CaseConversation>;
  listForUser(userId: string): Promise<CaseSummary[]>;
  findForUser(userId: string, caseId: string): Promise<CaseConversation | undefined>;
}

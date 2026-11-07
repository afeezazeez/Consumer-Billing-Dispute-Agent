import type { CaseIntakeState } from "./case-intake";

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
  intake: CaseIntakeState;
}

export interface CaseRepository {
  create(userId: string, title: string, openingMessage: string): Promise<CaseConversation>;
  appendMessage(userId: string, caseId: string, content: string): Promise<CaseConversation | undefined>;
  listForUser(userId: string): Promise<CaseSummary[]>;
  findForUser(userId: string, caseId: string): Promise<CaseConversation | undefined>;
  deleteForUser(userId: string, caseId: string): Promise<boolean>;
  renameForUser(userId: string, caseId: string, title: string): Promise<boolean>;
}

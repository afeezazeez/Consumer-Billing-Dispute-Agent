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

export type CaseAgentTurnMessages = [userMessage: CaseMessageRecord, assistantMessage: CaseMessageRecord];

export interface CreateCaseTurn {
  userId: string;
  title: string;
  messages: CaseAgentTurnMessages;
  intake: CaseIntakeState;
}

export interface AppendCaseTurn {
  userId: string;
  caseId: string;
  messages: CaseAgentTurnMessages;
  intake: CaseIntakeState;
}

export interface CaseRepository {
  createWithTurn(turn: CreateCaseTurn): Promise<CaseConversation>;
  appendTurn(turn: AppendCaseTurn): Promise<CaseConversation | undefined>;
  listForUser(userId: string): Promise<CaseSummary[]>;
  findForUser(userId: string, caseId: string): Promise<CaseConversation | undefined>;
  deleteForUser(userId: string, caseId: string): Promise<boolean>;
  renameForUser(userId: string, caseId: string, title: string): Promise<boolean>;
}

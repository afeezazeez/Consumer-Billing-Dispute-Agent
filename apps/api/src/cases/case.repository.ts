import type { CaseIntakeState } from "./case-intake";

export interface CaseMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  processingStatus: CaseMessageProcessingStatus;
}

export type CaseMessageProcessingStatus = "pending" | "complete" | "failed";

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

export interface CreatePendingCase {
  userId: string;
  caseId?: string;
  title: string;
  userMessage: CaseMessageRecord;
  intake: CaseIntakeState;
}

export interface AppendPendingMessage {
  userId: string;
  caseId: string;
  userMessage: CaseMessageRecord;
}

export interface CompleteCaseTurn {
  userId: string;
  caseId: string;
  userMessageId: string;
  assistantMessage: CaseMessageRecord;
  intake: CaseIntakeState;
}

export interface UpdateFailedMessage {
  userId: string;
  caseId: string;
  messageId: string;
  content?: string;
}

export interface CaseRepository {
  createPendingCase(input: CreatePendingCase): Promise<CaseConversation>;
  appendPendingMessage(input: AppendPendingMessage): Promise<CaseConversation | undefined>;
  completeTurn(input: CompleteCaseTurn): Promise<CaseConversation | undefined>;
  markMessageFailed(input: UpdateFailedMessage): Promise<CaseConversation | undefined>;
  prepareFailedMessageRetry(input: UpdateFailedMessage): Promise<CaseConversation | undefined>;
  listForUser(userId: string): Promise<CaseSummary[]>;
  findForUser(userId: string, caseId: string): Promise<CaseConversation | undefined>;
  deleteForUser(userId: string, caseId: string): Promise<boolean>;
  renameForUser(userId: string, caseId: string, title: string): Promise<boolean>;
}

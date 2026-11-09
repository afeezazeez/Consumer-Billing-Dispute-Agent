import type { CaseAttachment, StoredCaseAttachment } from "./case-attachment";
import type { CaseAgentSource, CaseAgentToolActivity, CaseEmailDraft } from "./case-intake-agent";
import type { CaseIntakeState } from "./case-intake";
import type { CaseNextAction } from "./case-next-action";

export interface CaseMessageRecord {
  attachments?: CaseAttachment[];
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  processingStatus: CaseMessageProcessingStatus;
  sources?: CaseAgentSource[];
  toolActivities?: CaseAgentToolActivity[];
  emailDraft?: CaseEmailDraft;
  nextAction?: CaseNextAction;
}

export type CaseMessageProcessingStatus = "pending" | "complete" | "failed";

export interface CaseSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
  lastMessage: string;
  isProcessing: boolean;
}

export interface CaseConversation extends CaseSummary {
  nextAction?: CaseNextAction;
  createdAt: Date;
  messages: CaseMessageRecord[];
  intake: CaseIntakeState;
}

export interface CreatePendingCase {
  userId: string;
  caseId?: string;
  title: string;
  userMessage: CaseMessageRecord;
  attachments?: StoredCaseAttachment[];
  attachmentIds?: string[];
  intake: CaseIntakeState;
}

export interface AppendPendingMessage {
  userId: string;
  caseId: string;
  userMessage: CaseMessageRecord;
  attachments?: StoredCaseAttachment[];
  attachmentIds?: string[];
}

export interface CompleteCaseTurn {
  nextAction?: CaseNextAction;
  caseTitle?: string;
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
  stageAttachment(userId: string, attachment: StoredCaseAttachment): Promise<void>;
  discardStagedAttachment(userId: string, attachmentId: string): Promise<void>;
  findAttachment(userId: string, attachmentId: string): Promise<StoredCaseAttachment | undefined>;
  createPendingCase(input: CreatePendingCase): Promise<CaseConversation>;
  appendPendingMessage(input: AppendPendingMessage): Promise<CaseConversation | undefined>;
  completeTurn(input: CompleteCaseTurn): Promise<CaseConversation | undefined>;
  prepareFailedMessageRetry(input: UpdateFailedMessage): Promise<CaseConversation | undefined>;
  updatePendingMessageActivities(userId: string, caseId: string, messageId: string, activities: CaseAgentToolActivity[]): Promise<void>;
  listForUser(userId: string): Promise<CaseSummary[]>;
  findForUser(userId: string, caseId: string): Promise<CaseConversation | undefined>;
  deleteForUser(userId: string, caseId: string): Promise<boolean>;
  renameForUser(userId: string, caseId: string, title: string): Promise<boolean>;
}

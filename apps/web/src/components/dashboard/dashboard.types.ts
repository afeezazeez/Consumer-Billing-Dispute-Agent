export interface DashboardUser {
  id: string;
  email: string;
  displayName: string;
  pictureUrl: string;
}

export interface CaseSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  lastMessage: string;
  isProcessing: boolean;
}

export type DocumentField = "provider" | "amount" | "chargeDate";

export interface DocumentReview {
  extracted: Record<DocumentField, {
    value: string | null;
    excerpt: string | null;
    page: number | null;
    confidence: "clear" | "uncertain" | "unreadable";
  }>;
  confirmed?: Record<DocumentField, string | null>;
  confirmedAt?: string;
}

export interface CaseAttachment {
  review?: DocumentReview;
  id: string;
  name: string;
  mediaType: string;
  size: number;
}

export interface CaseUpload {
  id: string;
  attachmentIds: string[];
}

export interface CaseMessage {
  attachments?: CaseAttachment[];
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  processingStatus: "pending" | "complete" | "failed";
  sources: CaseAgentSource[];
  toolActivities: CaseAgentToolActivity[];
  emailDraft?: CaseEmailDraft;
}

export interface CaseEmailDraft {
  recipients: string;
  subject: string;
  body: string;
}

export interface CaseAgentSource {
  title: string;
  url: string;
}

export interface CaseAgentToolActivity {
  id: string;
  name: string;
  label: string;
  status: "running" | "completed";
  operation?: "search" | "open_page" | "find_in_page";
  detail?: string;
  sources?: CaseAgentSource[];
}

export interface CaseConversation extends CaseSummary {
  nextAction?: { goal: string; action: string };
  createdAt: string;
  messages: CaseMessage[];
  intake: CaseIntakeState;
}

export interface CaseIntakeFact<Value> {
  value: Value;
  source: "user_message";
  messageId: string;
}

export interface CaseIntakeFacts {
  provider?: CaseIntakeFact<string>;
  issueType?: CaseIntakeFact<string>;
  chargeAmount?: CaseIntakeFact<string>;
  chargeDate?: CaseIntakeFact<string>;
  expectedAmount?: CaseIntakeFact<string>;
  desiredOutcome?: CaseIntakeFact<string>;
}

export interface CaseIntakeState {
  status: "collecting" | "ready";
  facts: CaseIntakeFacts;
}

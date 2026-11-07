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
}

export interface CaseMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CaseConversation extends CaseSummary {
  createdAt: string;
  messages: CaseMessage[];
  intake: CaseIntakeState;
}

export type DisputeIssueType =
  | "unrecognized_charge"
  | "incorrect_amount"
  | "duplicate_charge"
  | "charged_after_cancellation"
  | "other";

export interface CaseIntakeFact<Value> {
  value: Value;
  source: "user_message";
  messageId: string;
}

export interface CaseIntakeFacts {
  provider?: CaseIntakeFact<string>;
  issueType?: CaseIntakeFact<DisputeIssueType>;
  chargeAmount?: CaseIntakeFact<string>;
  chargeDate?: CaseIntakeFact<string>;
  expectedAmount?: CaseIntakeFact<string>;
  desiredOutcome?: CaseIntakeFact<string>;
}

export interface CaseIntakeState {
  status: "collecting" | "ready";
  facts: CaseIntakeFacts;
}

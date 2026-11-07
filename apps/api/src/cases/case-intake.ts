export type CaseIntakeStatus = "collecting" | "ready";

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
  status: CaseIntakeStatus;
  facts: CaseIntakeFacts;
}

export function createEmptyCaseIntake(): CaseIntakeState {
  return { status: "collecting", facts: {} };
}

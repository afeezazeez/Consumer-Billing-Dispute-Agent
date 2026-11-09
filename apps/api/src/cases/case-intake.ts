export type CaseIntakeStatus = "collecting" | "ready";

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
  status: CaseIntakeStatus;
  facts: CaseIntakeFacts;
}

export function createEmptyCaseIntake(): CaseIntakeState {
  return { status: "collecting", facts: {} };
}

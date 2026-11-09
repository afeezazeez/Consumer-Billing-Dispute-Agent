import type { CaseIntakeState } from "./case-intake";
import type { CaseMessageRecord } from "./case.repository";

export interface CaseIntakeAgentContext {
  messages: CaseMessageRecord[];
  intake: CaseIntakeState;
  userFirstName?: string;
}

export interface CaseIntakeAgentResult {
  response: string;
  intake: CaseIntakeState;
}

export interface CaseIntakeAgent {
  respond(context: CaseIntakeAgentContext): Promise<CaseIntakeAgentResult>;
}

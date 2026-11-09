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
  sources: CaseAgentSource[];
  toolActivities: CaseAgentToolActivity[];
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
  detail?: string;
}

export type CaseAgentProgressHandler = (activity: CaseAgentToolActivity) => void;

export interface CaseIntakeAgent {
  respond(context: CaseIntakeAgentContext, onProgress?: CaseAgentProgressHandler): Promise<CaseIntakeAgentResult>;
}

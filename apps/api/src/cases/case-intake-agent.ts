import type { CaseIntakeState } from "./case-intake";
import type { CaseMessageRecord } from "./case.repository";

export interface CaseIntakeAgentContext {
  caseId: string;
  nextAction?: CaseNextAction;
  generateCaseTitle?: boolean;
  messageId: string;
  messages: CaseMessageRecord[];
  intake: CaseIntakeState;
  userFirstName?: string;
}

export interface CaseIntakeAgentResult {
  nextAction?: CaseNextAction;
  caseTitle?: string;
  response: string;
  emailDraft?: CaseEmailDraft;
  intake: CaseIntakeState;
  sources: CaseAgentSource[];
  toolActivities: CaseAgentToolActivity[];
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

export type CaseAgentProgressHandler = (activity: CaseAgentToolActivity) => void;

export interface CaseIntakeAgent {
  respond(context: CaseIntakeAgentContext, onProgress?: CaseAgentProgressHandler): Promise<CaseIntakeAgentResult>;
}
import type { CaseNextAction } from "./case-next-action";

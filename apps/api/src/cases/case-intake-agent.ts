import type { CaseIntakeState } from "./case-intake";
import type { CaseMessageRecord } from "./case.repository";
import type { ApprovedCaseEmailDraft } from "./case-email-draft";
import type { EmailApprovalDecision } from "./case-email-draft";

export interface CaseIntakeAgentContext {
  userId: string;
  caseId: string;
  nextAction?: CaseNextAction;
  generateCaseTitle?: boolean;
  gmailConnected: boolean;
  messageId: string;
  messages: CaseMessageRecord[];
  intake: CaseIntakeState;
  userFirstName?: string;
}

export interface CaseIntakeAgentResult {
  nextAction?: CaseNextAction;
  caseTitle?: string;
  response: string;
  emailDraft?: ApprovedCaseEmailDraft;
  approvalPending?: boolean;
  gmailConnected?: boolean;
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
  operation?: "search" | "open_page" | "find_in_page";
  detail?: string;
  sources?: CaseAgentSource[];
}

export type CaseAgentProgressHandler = (activity: CaseAgentToolActivity) => void;

export interface CaseIntakeAgent {
  respond(context: CaseIntakeAgentContext, onProgress?: CaseAgentProgressHandler): Promise<CaseIntakeAgentResult>;
  resumeEmailApproval(userId: string, caseId: string, messageId: string, decision: EmailApprovalDecision): Promise<string | undefined>;
}
import type { CaseNextAction } from "./case-next-action";

export type CaseEmailDraftStatus = "waiting_approval" | "sending" | "sent" | "failed" | "cancelled";

export interface CaseEmailDraftEvent {
  status: CaseEmailDraftStatus;
  occurredAt: string;
  summary: string;
}

export interface CaseEmailDraft {
  recipients: string;
  subject: string;
  body: string;
  supportingEvidence?: string[];
  gmailConnected?: boolean;
  status: CaseEmailDraftStatus;
  events: CaseEmailDraftEvent[];
  approvedAt?: string;
  sentAt?: string;
  sentConfirmation?: string;
  deliveryError?: string;
  deliveryDiagnostic?: { certainty: string; providerCode: string; statusCode?: number };
}

export interface ApprovedCaseEmailDraft {
  recipients: string;
  subject: string;
  body: string;
  supportingEvidence?: string[];
}

export interface EmailApprovalDecision {
  decision: "approve" | "cancel";
  draft?: ApprovedCaseEmailDraft;
}

export function createPendingEmailDraft(draft: ApprovedCaseEmailDraft, occurredAt = new Date(), gmailConnected = false): CaseEmailDraft {
  const timestamp = occurredAt.toISOString();
  return {
    ...draft,
    gmailConnected,
    status: "waiting_approval",
    events: [{ status: "waiting_approval", occurredAt: timestamp, summary: "Draft prepared; waiting for your approval." }],
  };
}

export function appendEmailDraftEvent(
  draft: CaseEmailDraft,
  status: CaseEmailDraftStatus,
  summary: string,
  occurredAt = new Date(),
): CaseEmailDraft {
  return { ...draft, status, events: [...draft.events, { status, occurredAt: occurredAt.toISOString(), summary }] };
}

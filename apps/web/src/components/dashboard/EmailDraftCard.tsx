"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { usePathname } from "next/navigation";
import type { CaseEmailDraft } from "./dashboard.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface EmailDraftCardProps {
  draft: CaseEmailDraft;
  messageId: string;
  onDecision: (messageId: string, decision: "approve" | "cancel", draft?: Pick<CaseEmailDraft, "recipients" | "subject" | "body">) => Promise<{ success: boolean; message?: string }>;
}

export function EmailDraftCard({ draft, messageId, onDecision }: EmailDraftCardProps) {
  const pathname = usePathname();
  const [recipients, setRecipients] = useState(draft.recipients);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const editable = draft.status === "waiting_approval" && !isSubmitting;

  const handleApprove = useCallback(async () => {
    const recipientError = validateRecipients(recipients);
    if (recipientError) {
      setError(recipientError);
      return;
    }
    await submitDecision(onDecision, messageId, "approve", { recipients, subject, body }, setIsSubmitting, setError);
  }, [body, messageId, onDecision, recipients, subject]);
  const handleCancel = useCallback(async () => {
    await submitDecision(onDecision, messageId, "cancel", undefined, setIsSubmitting, setError);
  }, [messageId, onDecision]);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(formatEmail(recipients, subject, body));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [body, recipients, subject]);
  const handleDownload = useCallback(() => downloadEmail(recipients, subject, body), [body, recipients, subject]);
  const handleRecipientsChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setRecipients(event.currentTarget.value);
    setError("");
  }, []);
  const handleSubjectChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSubject(event.currentTarget.value), []);
  const handleBodyChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setBody(event.currentTarget.value), []);
  const handleToggleCollapsed = useCallback(() => setIsCollapsed((collapsed) => !collapsed), []);
  const handleConnectGmail = useCallback(() => {
    const returnTo = pathname.startsWith("/cases/") ? pathname : "/dashboard";
    window.location.assign(`${API_URL}/connectors/gmail/google?returnTo=${encodeURIComponent(returnTo)}`);
  }, [pathname]);

  return (
    <article aria-label="Email draft" className={`email-draft-card${isCollapsed ? " is-collapsed" : ""}`}>
      <DraftToolbar
        collapsed={isCollapsed}
        copied={copied}
        draft={draft}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onToggleCollapsed={handleToggleCollapsed}
        messageId={messageId}
      />
      <div aria-hidden={isCollapsed} className="email-draft-content" hidden={isCollapsed} id={`email-draft-content-${messageId}`}>
        <DraftStatus draft={draft} error={error} />
        <DraftEvidence evidence={draft.supportingEvidence ?? []} />
        <DraftRecipients editable={editable} error={error} onChange={handleRecipientsChange} recipients={recipients} />
        <DraftSubject editable={editable} onChange={handleSubjectChange} subject={subject} />
        <DraftBody body={body} editable={editable} onChange={handleBodyChange} />
        {draft.status === "waiting_approval" && (
          <DraftActions connected={Boolean(draft.gmailConnected) && !error.includes("Connect Gmail")} isSubmitting={isSubmitting} onApprove={handleApprove} onCancel={handleCancel} onConnect={handleConnectGmail} />
        )}
      </div>
    </article>
  );
}

async function submitDecision(
  onDecision: EmailDraftCardProps["onDecision"], messageId: string, decision: "approve" | "cancel",
  draft: Pick<CaseEmailDraft, "recipients" | "subject" | "body"> | undefined,
  setBusy: (busy: boolean) => void, setError: (error: string) => void,
): Promise<void> {
  setBusy(true); setError("");
  try { const result = await onDecision(messageId, decision, draft); if (!result.success) setError(result.message ?? "That action couldn’t be completed. Please try again."); }
  catch { setError("That action couldn’t be completed. Refresh the conversation and check the draft status."); }
  finally { setBusy(false); }
}

function formatEmail(recipients: string, subject: string, body: string): string {
  return `To: ${recipients}\nSubject: ${subject}\n\n${body}`;
}

function validateRecipients(recipients: string): string | undefined {
  const entries = recipients.split(/[;,]/).map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) return "Add a recipient email before sending this draft.";
  const invalid = entries.some((entry) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(entry));
  return invalid ? "Enter a valid email address for each recipient." : undefined;
}

function downloadEmail(recipients: string, subject: string, body: string): void {
  const file = new Blob([formatEmail(recipients, subject, body)], { type: "message/rfc822;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url; link.download = "billing-dispute-draft.eml"; link.click(); URL.revokeObjectURL(url);
}

function DraftToolbar({ collapsed, copied, draft, messageId, onCopy, onDownload, onToggleCollapsed }: {
  collapsed: boolean; copied: boolean; draft: CaseEmailDraft; messageId: string;
  onCopy: () => void; onDownload: () => void; onToggleCollapsed: () => void;
}) {
  return (
    <header className="email-draft-toolbar">
      <span className="email-draft-title">{draft.subject || "Email draft"}</span>
      <button aria-label={copied ? "Copied email draft" : "Copy email draft"} onClick={onCopy} title="Copy draft" type="button">{copied ? <CheckIcon /> : <CopyIcon />}</button>
      <button aria-label="Download email draft" onClick={onDownload} title="Download draft" type="button"><DownloadIcon /></button>
      <button
        aria-controls={`email-draft-content-${messageId}`}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? "Expand" : "Collapse"} email draft`}
        onClick={onToggleCollapsed}
        title={`${collapsed ? "Expand" : "Collapse"} email draft`}
        type="button"
      >
        <svg aria-hidden="true" className={collapsed ? "is-collapsed" : ""} viewBox="0 0 24 24" fill="none">
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </button>
    </header>
  );
}

function DraftActions({ connected, isSubmitting, onApprove, onCancel, onConnect }: {
  connected: boolean; isSubmitting: boolean; onApprove: () => void; onCancel: () => void; onConnect: () => void;
}) {
  return <footer className="email-draft-actions">
    {!connected && <div className="email-draft-connect"><span>Connect Gmail to send this draft.</span><button onClick={onConnect} type="button">Connect Gmail</button></div>}
    <div className="email-draft-action-buttons">
      <button className="email-draft-cancel" disabled={isSubmitting} onClick={onCancel} type="button">Cancel draft</button>
      <button className="email-draft-send" disabled={isSubmitting || !connected} onClick={onApprove} type="button"><SendIcon /><span>{isSubmitting ? "Sending…" : "Approve & send"}</span></button>
    </div>
  </footer>;
}

function DraftStatus({ draft, error }: { draft: CaseEmailDraft; error: string }) {
  const status = getDraftStatusText(draft);
  if (draft.status === "waiting_approval") return error ? <div aria-live="polite" className="email-draft-validation" role="alert">{error}</div> : null;
  return <div aria-live="polite" className={`email-draft-status is-${draft.status}`}>
    <strong>{status.title}</strong><span>{error || draft.deliveryError || status.description}</span>
    {draft.status === "failed" && <a href="https://mail.google.com/mail/u/0/#sent" rel="noreferrer" target="_blank">Check Gmail Sent</a>}
    {draft.deliveryDiagnostic && <small>Diagnostic: {formatDeliveryDiagnostic(draft.deliveryDiagnostic)}</small>}
  </div>;
}

function formatDeliveryDiagnostic(diagnostic: NonNullable<CaseEmailDraft["deliveryDiagnostic"]>): string {
  return [diagnostic.providerCode, diagnostic.statusCode ? `HTTP ${diagnostic.statusCode}` : undefined].filter(Boolean).join(" · ");
}

function getDraftStatusText(draft: CaseEmailDraft): { title: string; description: string } {
  if (draft.status === "waiting_approval") return { title: "", description: "" };
  if (draft.status === "sending") return { title: "Sending email", description: "Do not approve again. If this stays here, check Gmail Sent before taking another action." };
  if (draft.status === "sent") return { title: "Email sent", description: "Gmail accepted this message." };
  if (draft.status === "failed") return { title: "Delivery not confirmed", description: "Check Gmail Sent before taking any further action. This draft cannot be sent again here to prevent duplicates." };
  return { title: "Draft cancelled", description: "No email was sent." };
}

function DraftEvidence({ evidence }: { evidence: string[] }) {
  if (evidence.length === 0) return null;
  return <section aria-label="Case details used to prepare this draft" className="email-draft-evidence"><h3>Case details used</h3><ul>{evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section>;
}

function DraftRecipients({ editable, error, onChange, recipients }: { editable: boolean; error: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; recipients: string }) {
  return <label className="email-draft-recipients"><span>To <small>Required</small></span><input aria-label="Recipient email (required)" aria-invalid={Boolean(error) && !error.includes("Connect Gmail")} disabled={!editable} onChange={onChange} placeholder="Enter recipient email" value={recipients} /></label>;
}

function DraftSubject({ editable, onChange, subject }: { editable: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void; subject: string }) {
  return <label className="email-draft-subject"><span>Subject</span><input aria-label="Subject" disabled={!editable} onChange={onChange} value={subject} /></label>;
}

function DraftBody({ body, editable, onChange }: { body: string; editable: boolean; onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void }) {
  return <label className="email-draft-body"><span className="sr-only">Email body</span><textarea aria-label="Email body" disabled={!editable} onChange={onChange} value={body} /></label>;
}

function CopyIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.7" /></svg>; }
function CheckIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>; }
function DownloadIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>; }
function SendIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m21 3-7.2 18-3.6-7.2L3 10.2 21 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M10.2 13.8 15 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>; }

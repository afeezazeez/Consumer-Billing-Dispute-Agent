"use client";

import { useCallback, useState } from "react";
import type { CaseEmailDraft } from "./dashboard.types";

interface EmailDraftCardProps {
  draft: CaseEmailDraft;
}

export function EmailDraftCard({ draft }: EmailDraftCardProps) {
  const [recipients, setRecipients] = useState(draft.recipients);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [copied, setCopied] = useState(false);
  const message = `To: ${recipients}\nSubject: ${subject}\n\n${body}`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [message]);

  const handleOpenEmail = useCallback(() => {
    const query = new URLSearchParams({ subject, body });
    window.location.href = `mailto:${encodeURIComponent(recipients)}?${query}`;
  }, [body, recipients, subject]);

  return (
    <article aria-label="Email draft" className="email-draft-card">
      <header className="email-draft-toolbar">
        <span className="email-draft-title">{subject || "Email draft"}</span>
        <button aria-label={copied ? "Copied email draft" : "Copy email draft"} onClick={handleCopy} title="Copy draft" type="button">
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <button aria-label="Open draft in email app" onClick={handleOpenEmail} title="Open in email app" type="button">
          <OpenIcon />
        </button>
        <button aria-label="Email sending will be available later" className="email-draft-send" disabled title="Email sending will be available later" type="button">
          <SendIcon />
          <span>Send</span>
        </button>
      </header>
      <label className="email-draft-recipients">
        <span>Recipients</span>
        <input aria-label="Recipients" onChange={(event) => setRecipients(event.target.value)} placeholder="Add recipient" value={recipients} />
      </label>
      <label className="email-draft-subject">
        <span className="sr-only">Subject</span>
        <input aria-label="Subject" onChange={(event) => setSubject(event.target.value)} value={subject} />
      </label>
      <label className="email-draft-body">
        <span className="sr-only">Email body</span>
        <textarea aria-label="Email body" onChange={(event) => setBody(event.target.value)} value={body} />
      </label>
    </article>
  );
}

function CopyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

function CheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function OpenIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M14 4h6v6m-.5-5.5L11 13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>;
}

function SendIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m21 3-7.2 18-3.6-7.2L3 10.2 21 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M10.2 13.8 15 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>;
}

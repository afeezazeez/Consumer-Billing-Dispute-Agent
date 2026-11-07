"use client";

import { useCallback, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";

interface CaseComposerProps {
  isSending: boolean;
  error: string;
  onSendMessage: (message: string) => Promise<boolean>;
}

export function CaseComposer({ isSending, error, onSendMessage }: CaseComposerProps) {
  const [message, setMessage] = useState("");
  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value), []);
  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || isSending) return;
    if (await onSendMessage(message.trim())) setMessage("");
  }, [isSending, message, onSendMessage]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }, []);

  return (
    <div className="composer-region">
      {error && <p className="dashboard-error" role="alert">{error}</p>}
      <form aria-busy={isSending} className="chat-composer" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="case-message">Message about your billing case</label>
        <textarea id="case-message" maxLength={2000} onChange={handleChange} onKeyDown={handleKeyDown} placeholder="Describe the charge or add a detail…" rows={1} value={message} />
        <div className="composer-controls">
          <span>Billing guidance based on the details you share</span>
          <button aria-label={isSending ? "Sending message" : "Send message"} className="composer-send" disabled={!message.trim() || isSending} type="submit">
            {isSending ? "…" : "↑"}
          </button>
        </div>
      </form>
      <p className="composer-disclaimer">The agent will help organize your case. You decide what to do next.</p>
    </div>
  );
}

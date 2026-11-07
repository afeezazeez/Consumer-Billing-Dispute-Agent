"use client";

import { useCallback, useState, type ChangeEvent, type FormEvent } from "react";

interface NewCaseFormProps {
  isSubmitting: boolean;
  error: string;
  onCreateCase: (message: string) => Promise<void>;
}

export function NewCaseForm({ isSubmitting, error, onCreateCase }: NewCaseFormProps) {
  const [message, setMessage] = useState("");
  const handleMessageChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  }, []);
  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (message.trim()) void onCreateCase(message.trim());
  }, [message, onCreateCase]);

  return (
    <form className="new-case-form" onSubmit={handleSubmit}>
      <label htmlFor="case-opening-message">What charge are you questioning?</label>
      <textarea
        id="case-opening-message"
        maxLength={2000}
        onChange={handleMessageChange}
        placeholder="Describe the charge and what seems wrong."
        required
        rows={5}
        value={message}
      />
      {error && <p className="dashboard-error" role="alert">{error}</p>}
      <div className="new-case-form-footer">
        <span>Your opening note is saved to this case.</span>
        <button className="button" disabled={isSubmitting || !message.trim()} type="submit">
          {isSubmitting ? "Opening case…" : "Open case"}
        </button>
      </div>
    </form>
  );
}

"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

interface CaseComposerProps {
  isSending: boolean;
  error: string;
  onSendMessage: (message: string) => Promise<boolean>;
  variant?: "conversation" | "welcome";
  placeholder?: string;
}

export function CaseComposer({
  isSending,
  error,
  onSendMessage,
  variant = "conversation",
  placeholder,
}: CaseComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultPlaceholder =
    placeholder ??
    (variant === "welcome"
      ? "How can I help you today?"
      : "Reply or provide more details about this charge…");

  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!message.trim() || isSending) return;
      const submittedMessage = message.trim();
      setMessage("");
      if (!await onSendMessage(submittedMessage)) setMessage(submittedMessage);
    },
    [isSending, message, onSendMessage],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }, []);

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`claude-composer-container${variant === "welcome" ? " is-welcome" : ""}`}>
      {error && (
        <div className="claude-composer-error" role="alert">
          {error}
        </div>
      )}

      <form
        aria-busy={isSending}
        className="claude-composer-card"
        onSubmit={handleSubmit}
      >
        <label className="visually-hidden" htmlFor="claude-case-message">
          Message about your billing dispute
        </label>
        <textarea
          className="claude-composer-textarea"
          id="claude-case-message"
          maxLength={3000}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={defaultPlaceholder}
          ref={textareaRef}
          rows={variant === "welcome" ? 3 : 2}
          value={message}
        />

        <div className="claude-composer-bottom-bar">
          <div className="claude-composer-left-actions">
            {/* Hidden file input ready for future document intake */}
            <input
              aria-label="Upload billing document"
              className="visually-hidden"
              ref={fileInputRef}
              type="file"
            />
            <button
              aria-label="Add attachment"
              className="claude-attachment-btn"
              onClick={handleAttachmentClick}
              title="Attach document or bill (coming soon)"
              type="button"
            >
              <span aria-hidden="true">＋</span>
            </button>
          </div>

          <div className="claude-composer-right-actions">
            <button
              aria-label={isSending ? "Sending message" : "Send message"}
              className="claude-composer-send-btn"
              disabled={!message.trim() || isSending}
              type="submit"
            >
              {isSending ? (
                <span className="claude-spinner-dot" />
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

"use client";

import type { CaseUpload } from "./dashboard.types";
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ComposerAttachments } from "./ComposerAttachments";

const ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

interface CaseComposerProps {
  isSending: boolean;
  error: string;
  onSendMessage: (message: string, upload?: CaseUpload) => Promise<boolean>;
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
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const pendingUpload = useRef<{ content: string; upload: CaseUpload }>(undefined);
  const [attachmentError, setAttachmentError] = useState("");
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
      const content = message.trim();
      if (!content || isSending || isUploading) return;
      if (files.length === 0) {
        setMessage("");
        if (!await onSendMessage(content)) setMessage(content);
        return;
      }

      const previous = pendingUpload.current;
      const upload = previous?.content === content && previous.upload.files === files
        ? previous.upload
        : { id: crypto.randomUUID(), files };
      pendingUpload.current = { content, upload };
      setIsUploading(true);
      try {
        if (await onSendMessage(content, upload)) {
          pendingUpload.current = undefined;
          setMessage("");
          setFiles([]);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [files, isSending, isUploading, message, onSendMessage],
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

  const addAttachments = useCallback((incoming: FileList) => {
    const valid = Array.from(incoming).filter((file) =>
      ATTACHMENT_TYPES.includes(file.type) && file.size > 0 && file.size <= MAX_ATTACHMENT_BYTES,
    );
    const available = MAX_ATTACHMENTS - files.length;
    setFiles([...files, ...valid.slice(0, available)]);
    setAttachmentError([
      valid.length !== incoming.length ? "Choose a PDF, PNG, JPEG, or WebP file up to 10 MB." : "",
      valid.length > available ? "You can attach up to five files." : "",
    ].filter(Boolean).join(" "));
  }, [files]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) addAttachments(event.currentTarget.files);
    event.currentTarget.value = "";
  }, [addAttachments]);

  const handleDragOver = useCallback((event: DragEvent<HTMLFormElement>) => {
    if (event.dataTransfer.types.includes("Files")) event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLFormElement>) => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    if (isUploading) return;
    addAttachments(event.dataTransfer.files);
  }, [addAttachments, isUploading]);

  const removeAttachment = useCallback((index: number) => {
    setFiles((current) => current.filter((_, position) => position !== index));
    setAttachmentError("");
  }, []);

  return (
    <div className={`claude-composer-container${variant === "welcome" ? " is-welcome" : ""}`}>
      {error && (
        <div className="claude-composer-error" role="alert">
          {error}
        </div>
      )}

      <form
        aria-busy={isSending || isUploading}
        className="claude-composer-card"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onSubmit={handleSubmit}
      >
        <ComposerAttachments files={files} onRemove={removeAttachment} isUploading={isUploading} />
        {attachmentError && <p className="claude-composer-error" role="alert">{attachmentError}</p>}
        <label className="visually-hidden" htmlFor="claude-case-message">
          Message about your billing dispute
        </label>
        <textarea
          className="claude-composer-textarea"
          id="claude-case-message"
          maxLength={2000}
          readOnly={isUploading}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={defaultPlaceholder}
          ref={textareaRef}
          rows={variant === "welcome" ? 3 : 2}
          value={message}
        />

        <div className="claude-composer-bottom-bar">
          <div className="claude-composer-left-actions">
            <input
              accept={ATTACHMENT_TYPES.join(",")}
              aria-label="Upload billing document"
              className="visually-hidden"
              disabled={isUploading}
              multiple
              onChange={handleFileChange}
              ref={fileInputRef}
              tabIndex={-1}
              type="file"
            />
            <button
              aria-label="Add attachment"
              className="claude-attachment-btn"
              onClick={handleAttachmentClick}
              disabled={isUploading}
              title="Attach PDFs or images"
              type="button"
            >
              <span aria-hidden="true">＋</span>
            </button>
          </div>

          <div className="claude-composer-right-actions">
            <button
              aria-label={isUploading ? "Uploading attachments" : isSending ? "Sending message" : "Send message"}
              className="claude-composer-send-btn"
              disabled={!message.trim() || isSending || isUploading}
              type="submit"
            >
              {isSending || isUploading ? (
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

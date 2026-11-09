"use client";

import { useCallback, useState, type ChangeEvent } from "react";

interface CaseMessageFailureProps {
  messageId: string;
  content: string;
  isSending: boolean;
  onRetry: (messageId: string, content?: string) => void;
}

export function CaseMessageFailure({ messageId, content, isSending, onRetry }: CaseMessageFailureProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(content);

  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
  }, []);

  const handleEdit = useCallback(() => setIsEditing(true), []);
  const handleCancelEdit = useCallback(() => {
    setDraftContent(content);
    setIsEditing(false);
  }, [content]);

  const handleRetry = useCallback(() => {
    const updatedContent = draftContent.trim();
    if (!updatedContent || isSending) return;
    onRetry(messageId, updatedContent === content ? undefined : updatedContent);
    setIsEditing(false);
  }, [content, draftContent, isSending, messageId, onRetry]);

  return (
    <div className="case-message-failure" role="status">
      <div className="case-message-failure-copy">
        <span aria-hidden="true" className="case-message-failure-icon"><AlertIcon /></span>
        <p>Bill Agent couldn’t respond. Your message is kept here.</p>
      </div>
      {isEditing && (
        <textarea
          aria-label="Edit your failed message"
          maxLength={2000}
          onChange={handleChange}
          value={draftContent}
        />
      )}
      <div className="case-message-failure-actions">
        {isEditing ? (
          <>
            <button disabled={isSending} onClick={handleCancelEdit} type="button">Cancel</button>
            <button
              aria-label="Retry with edited message"
              disabled={isSending || !draftContent.trim()}
              onClick={handleRetry}
              title="Retry with edited message"
              type="button"
            >
              <RetryIcon />
            </button>
          </>
        ) : (
          <>
            <button aria-label="Retry message" disabled={isSending} onClick={handleRetry} title="Retry message" type="button">
              <RetryIcon />
            </button>
            <button aria-label="Edit message" disabled={isSending} onClick={handleEdit} title="Edit message" type="button">
              <EditIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AlertIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M10 6.25v4.5m0 3h.01M8.27 3.83 2.1 14.5A1.75 1.75 0 0 0 3.62 17h12.76a1.75 1.75 0 0 0 1.52-2.5L11.73 3.83a2 2 0 0 0-3.46 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></svg>;
}

function RetryIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M16.25 6.5V3.75M16.25 6.5H13.5M16 6.25a6.5 6.5 0 1 0 1.15 6.1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></svg>;
}

function EditIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m12.8 4.2 3 3M3.5 16.5l3.7-.8 8.8-8.8a2.12 2.12 0 0 0-3-3l-8.8 8.8-.7 3.8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></svg>;
}

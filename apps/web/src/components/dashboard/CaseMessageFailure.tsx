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
      <p>Bill Agent couldn’t respond. Your message is kept here.</p>
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
            <button disabled={isSending || !draftContent.trim()} onClick={handleRetry} type="button">Retry with changes</button>
          </>
        ) : (
          <>
            <button disabled={isSending} onClick={handleRetry} type="button">Retry</button>
            <button disabled={isSending} onClick={handleEdit} type="button">Edit</button>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { CaseSummary } from "./dashboard.types";

interface CaseListItemProps {
  billingCase: CaseSummary;
  isActive: boolean;
  onOpen: (caseId: string) => void;
  onRename: (caseId: string, title: string) => Promise<boolean>;
}

export function CaseListItem({ billingCase, isActive, onOpen, onRename }: CaseListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(billingCase.title);
  const [hasRenameError, setHasRenameError] = useState(false);
  const handleOpen = useCallback(() => onOpen(billingCase.id), [billingCase.id, onOpen]);
  const handleStartEditing = useCallback(() => {
    setDraftTitle(billingCase.title);
    setHasRenameError(false);
    setIsEditing(true);
  }, [billingCase.title]);
  const handleTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDraftTitle(event.target.value), []);
  const handleSave = useCallback(async () => {
    const title = draftTitle.trim();
    if (!title || title === billingCase.title) {
      setIsEditing(false);
      setDraftTitle(billingCase.title);
      return;
    }
    if (await onRename(billingCase.id, title)) setIsEditing(false);
    else setHasRenameError(true);
  }, [billingCase.id, billingCase.title, draftTitle, onRename]);
  const handleBlur = useCallback(() => void handleSave(), [handleSave]);
  const handleInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setDraftTitle(billingCase.title);
      setIsEditing(false);
    }
  }, [billingCase.title]);

  return (
    <div className={`case-list-item${isActive ? " is-active" : ""}`}>
      <button aria-label={`Open ${billingCase.title}`} className="case-list-open" onClick={handleOpen} type="button">
        <span aria-hidden="true" className="case-list-icon">▱</span>
      </button>
      <div className="case-list-copy">
        {isEditing ? (
          <input aria-label="Rename case" autoFocus className={`case-title-input${hasRenameError ? " has-error" : ""}`} maxLength={140} onBlur={handleBlur} onChange={handleTitleChange} onKeyDown={handleInputKeyDown} value={draftTitle} />
        ) : (
          <button className="case-list-title" onClick={handleStartEditing} title="Click to rename" type="button">{billingCase.title}</button>
        )}
        <span>{billingCase.lastMessage}</span>
        {hasRenameError && <small role="alert">Couldn’t rename. Try again.</small>}
      </div>
    </div>
  );
}

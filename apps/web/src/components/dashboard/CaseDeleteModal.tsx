"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { CaseSummary } from "./dashboard.types";

interface CaseDeleteModalProps {
  billingCase?: CaseSummary;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CaseDeleteModal({
  billingCase,
  isOpen,
  onConfirm,
  onCancel,
}: CaseDeleteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDialogElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    },
    [onCancel],
  );

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) {
        onCancel();
      }
    },
    [onCancel],
  );

  if (!isOpen || !billingCase) return null;

  return (
    <dialog
      aria-describedby="delete-case-description"
      aria-labelledby="delete-case-title"
      className="claude-confirm-dialog"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
    >
      <div className="claude-confirm-content" onClick={(e) => e.stopPropagation()}>
        <div className="claude-confirm-header">
          <h2 id="delete-case-title">Delete this case?</h2>
        </div>
        <p id="delete-case-description">
          This will permanently delete “<strong>{billingCase.title}</strong>” and its conversation.
        </p>
        <div className="claude-confirm-actions">
          <button className="claude-btn-secondary" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="claude-btn-danger" onClick={onConfirm} type="button">
            Delete case
          </button>
        </div>
      </div>
    </dialog>
  );
}


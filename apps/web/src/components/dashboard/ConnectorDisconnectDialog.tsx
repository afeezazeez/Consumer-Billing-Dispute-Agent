"use client";

import { useCallback, useEffect, useId, useRef, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";

interface ConnectorDisconnectDialogProps {
  accountEmail?: string;
  connectorName: string;
  error: string;
  isLoading: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConnectorDisconnectDialog({
  accountEmail,
  connectorName,
  error,
  isLoading,
  isOpen,
  onCancel,
  onConfirm,
}: ConnectorDisconnectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const titleId = `disconnect-connector-title-${dialogId}`;
  const descriptionId = `disconnect-connector-description-${dialogId}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const handleCancelKey = useCallback((event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (!isLoading) onCancel();
  }, [isLoading, onCancel]);

  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    if (!isLoading && event.target === dialogRef.current) onCancel();
  }, [isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="claude-confirm-dialog"
      onClick={handleBackdropClick}
      onKeyDown={handleCancelKey}
      ref={dialogRef}
    >
      <div className="claude-confirm-content" onClick={(event) => event.stopPropagation()}>
        <div className="claude-confirm-header">
          <h2 id={titleId}>Disconnect {connectorName}?</h2>
        </div>
        <p id={descriptionId}>
          Bill Agent will no longer have permission to send email from {accountEmail || `your ${connectorName} account`}. Saved drafts will remain in your case history.
        </p>
        {error && <p className="connector-disconnect-error" role="alert">{error}</p>}
        <div className="claude-confirm-actions">
          <button className="claude-btn-secondary" disabled={isLoading} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="connector-confirm-button" disabled={isLoading} onClick={() => void onConfirm()} type="button">
            {isLoading ? "Disconnecting…" : `Disconnect ${connectorName}`}
          </button>
        </div>
      </div>
    </dialog>
  );
}

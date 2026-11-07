import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { CaseComposer } from "./CaseComposer";
import type { CaseConversation as CaseConversationData } from "./dashboard.types";

interface CaseConversationProps {
  billingCase: CaseConversationData;
  isSending: boolean;
  error: string;
  onSendMessage: (message: string) => Promise<boolean>;
  onDeleteCase: (caseId: string) => Promise<void>;
  onRenameCase: (caseId: string, title: string) => Promise<boolean>;
}

export function CaseConversation({ billingCase, isSending, error, onSendMessage, onDeleteCase, onRenameCase }: CaseConversationProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(billingCase.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const handleToggleMenu = useCallback(() => setIsMenuOpen((current) => !current), []);
  const handleOutsidePointer = useCallback((event: PointerEvent) => {
    if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
  }, []);
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") setIsMenuOpen(false);
  }, []);
  const handleOpenDeleteConfirmation = useCallback(() => {
    setIsMenuOpen(false);
    deleteDialogRef.current?.showModal();
  }, []);
  const handleOpenRename = useCallback(() => {
    setDraftTitle(billingCase.title);
    setIsMenuOpen(false);
    setIsRenaming(true);
  }, [billingCase.title]);
  const handleTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDraftTitle(event.target.value), []);
  const handleSaveRename = useCallback(async () => {
    const title = draftTitle.trim();
    if (title && title !== billingCase.title) await onRenameCase(billingCase.id, title);
    setIsRenaming(false);
  }, [billingCase.id, billingCase.title, draftTitle, onRenameCase]);
  const handleTitleBlur = useCallback(() => void handleSaveRename(), [handleSaveRename]);
  const handleTitleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setDraftTitle(billingCase.title);
      setIsRenaming(false);
    }
  }, [billingCase.title]);
  const handleConfirmDelete = useCallback(() => {
    deleteDialogRef.current?.close();
    void onDeleteCase(billingCase.id);
  }, [billingCase.id, onDeleteCase]);
  const handleCancelDelete = useCallback(() => deleteDialogRef.current?.close(), []);
  useEffect(() => {
    document.addEventListener("pointerdown", handleOutsidePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [handleEscape, handleOutsidePointer]);

  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") setIsMenuOpen(false);
  }, []);
  const handleMenuPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => event.stopPropagation(), []);

  return (
    <section className="chat-workspace" aria-labelledby="active-case-title">
      <header className="chat-header">
        <div className="case-title-menu" onKeyDown={handleMenuKeyDown} onPointerDown={handleMenuPointerDown} ref={menuRef}>
          {isRenaming ? <input aria-label="Rename case" autoFocus className="case-title-trigger case-title-input" id="active-case-title" maxLength={140} onBlur={handleTitleBlur} onChange={handleTitleChange} onKeyDown={handleTitleKeyDown} value={draftTitle} /> : (
            <button aria-expanded={isMenuOpen} aria-haspopup="menu" className="case-title-trigger" id="active-case-title" onClick={handleToggleMenu} type="button">
              <span>{billingCase.title}</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
            </button>
          )}
          {isMenuOpen && <div aria-label="Case actions" className="case-title-dropdown" role="group">
            <button className="case-rename-action" onClick={handleOpenRename} type="button">Rename</button>
            <button className="case-delete-action" onClick={handleOpenDeleteConfirmation} type="button"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 6h12M8 6V4h4v2m-7 0 .8 10h8.4L15 6M8 9v4m4-4v4" /></svg>Delete case</button>
          </div>}
        </div>
      </header>
      <div className="chat-history" aria-live="polite">
        {billingCase.messages.map((message) => (
          <article className={`chat-message ${message.role}`} key={message.id}>
            <p>{message.content}</p>
          </article>
        ))}
      </div>
      <CaseComposer error={error} isSending={isSending} onSendMessage={onSendMessage} />
      <dialog aria-describedby="delete-case-description" aria-labelledby="delete-case-title" className="confirm-dialog" ref={deleteDialogRef}>
        <div className="confirm-dialog-content">
          <span aria-hidden="true" className="confirm-dialog-icon">!</span>
          <h2 id="delete-case-title">Delete this case?</h2>
          <p id="delete-case-description">This will permanently delete “{billingCase.title}” and its conversation.</p>
          <div className="confirm-dialog-actions">
            <button className="confirm-cancel-button" onClick={handleCancelDelete} type="button">Cancel</button>
            <button className="confirm-delete-button" onClick={handleConfirmDelete} type="button">Delete case</button>
          </div>
        </div>
      </dialog>
    </section>
  );
}

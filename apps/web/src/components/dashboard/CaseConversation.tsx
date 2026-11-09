"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { CaseComposer } from "./CaseComposer";
import type { CaseConversation as CaseConversationData } from "./dashboard.types";

interface CaseConversationProps {
  billingCase: CaseConversationData;
  isSending: boolean;
  error: string;
  onSendMessage: (message: string) => Promise<boolean>;
  onDeleteCase: (caseId: string) => void;
  onRenameCase: (caseId: string, title: string) => Promise<boolean>;
}

export function CaseConversation({
  billingCase,
  isSending,
  error,
  onSendMessage,
  onDeleteCase,
  onRenameCase,
}: CaseConversationProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(billingCase.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleToggleMenu = useCallback(() => setIsMenuOpen((curr) => !curr), []);

  const handleOutsidePointer = useCallback((event: PointerEvent) => {
    if (!menuRef.current?.contains(event.target as Node)) {
      setIsMenuOpen(false);
    }
  }, []);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsMenuOpen(false);
    }
  }, []);

  const handleOpenDeleteConfirmation = useCallback(() => {
    setIsMenuOpen(false);
    onDeleteCase(billingCase.id);
  }, [billingCase.id, onDeleteCase]);

  const handleOpenRename = useCallback(() => {
    setDraftTitle(billingCase.title);
    setIsMenuOpen(false);
    setIsRenaming(true);
  }, [billingCase.title]);

  const handleTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDraftTitle(event.target.value);
  }, []);

  const handleSaveRename = useCallback(async () => {
    const title = draftTitle.trim();
    if (title && title !== billingCase.title) {
      await onRenameCase(billingCase.id, title);
    }
    setIsRenaming(false);
  }, [billingCase.id, billingCase.title, draftTitle, onRenameCase]);

  const handleTitleBlur = useCallback(() => void handleSaveRename(), [handleSaveRename]);

  const handleTitleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") event.currentTarget.blur();
      if (event.key === "Escape") {
        setDraftTitle(billingCase.title);
        setIsRenaming(false);
      }
    },
    [billingCase.title],
  );

  useEffect(() => {
    document.addEventListener("pointerdown", handleOutsidePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [handleEscape, handleOutsidePointer]);

  useLayoutEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTo({ top: history.scrollHeight, behavior: "smooth" });
  }, [billingCase.messages.length, isSending]);

  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") setIsMenuOpen(false);
  }, []);

  const handleMenuPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <div className="claude-chat-viewport">
      {/* Top Bar - Full Width, Aligned with Sidebar Header */}
      <header className="claude-chat-top-bar">
        <div
          className="claude-title-menu"
          onKeyDown={handleMenuKeyDown}
          onPointerDown={handleMenuPointerDown}
          ref={menuRef}
        >
          {isRenaming ? (
            <input
              aria-label="Rename case"
              autoFocus
              className="claude-title-input"
              id="active-case-title"
              maxLength={140}
              onBlur={handleTitleBlur}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              value={draftTitle}
            />
          ) : (
            <button
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className="claude-title-button"
              disabled={isSending}
              id="active-case-title"
              onClick={handleToggleMenu}
              type="button"
            >
              <span className="claude-title-text">{billingCase.title}</span>
              <svg aria-hidden="true" className="claude-chevron-down" viewBox="0 0 16 16">
                <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {isMenuOpen && (
            <div aria-label="Case actions" className="claude-title-dropdown" role="menu">
              <button className="claude-dropdown-item" onClick={handleOpenRename} role="menuitem" type="button">
                <span>Rename case</span>
                <kbd className="claude-context-kbd">R</kbd>
              </button>
              <button
                className="claude-dropdown-item is-danger"
                onClick={handleOpenDeleteConfirmation}
                role="menuitem"
                type="button"
              >
                <span>Delete case</span>
                <kbd className="claude-context-kbd">D</kbd>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Chat Workspace */}
      <div className="claude-chat-workspace">
        {/* Messages Feed */}
        <div className="claude-chat-history" aria-live="polite" ref={historyRef}>
          <div className="claude-chat-history-inner">
            {billingCase.messages.map((message) => (
              <article
                className={`claude-message-row ${message.role}`}
                key={message.id}
              >
                <div className="claude-message-bubble">
                  <p>{message.content}</p>
                </div>
              </article>
            ))}
            {isSending && (
              <div aria-live="polite" className="claude-agent-thinking" role="status">
                <span aria-label="Thinking" className="claude-agent-thinking-text">
                  {renderThinkingLetters()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Anchored Composer */}
        <div className="claude-chat-composer-container">
          <CaseComposer
            error={error}
            isSending={isSending}
            onSendMessage={onSendMessage}
            variant="conversation"
          />
        </div>
      </div>
    </div>
  );
}

function renderThinkingLetters() {
  return Array.from("Thinking").map((letter, index) => (
    <span
      aria-hidden="true"
      className="claude-agent-thinking-letter"
      key={index}
      style={{ "--thinking-letter-index": index } as CSSProperties}
    >
      {letter}
    </span>
  ));
}

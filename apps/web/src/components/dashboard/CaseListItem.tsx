"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import type { CaseSummary } from "./dashboard.types";

interface CaseListItemProps {
  billingCase: CaseSummary;
  isActive: boolean;
  isWorking?: boolean;
  onOpen: (caseId: string) => void;
  onRename?: (caseId: string, title: string) => Promise<boolean>;
  onDelete?: (caseId: string) => void;
}

export function CaseListItem({
  billingCase,
  isActive,
  isWorking = false,
  onOpen,
  onRename,
  onDelete,
}: CaseListItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(billingCase.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleOpen = useCallback(() => {
    if (!isRenaming) {
      onOpen(billingCase.id);
    }
  }, [billingCase.id, isRenaming, onOpen]);

  const handleToggleMenu = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((curr) => !curr);
  }, []);

  const handleStartRename = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setIsRenaming(true);
    setDraftTitle(billingCase.title);
  }, [billingCase.title]);

  const handleConfirmDelete = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete?.(billingCase.id);
  }, [billingCase.id, onDelete]);

  const handleTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setDraftTitle(e.target.value);
  }, []);

  const handleSaveRename = useCallback(async () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== billingCase.title && onRename) {
      await onRename(billingCase.id, trimmed);
    }
    setIsRenaming(false);
  }, [billingCase.id, billingCase.title, draftTitle, onRename]);

  const handleInputKeyDown = useCallback((e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSaveRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraftTitle(billingCase.title);
      setIsRenaming(false);
    }
  }, [billingCase.title, handleSaveRename]);

  // Close context menu on outside click or escape
  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <div
      aria-current={isActive ? "page" : undefined}
      className={`claude-case-row${isActive ? " is-active" : ""}`}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isRenaming) handleOpen();
      }}
    >
      <span aria-hidden="true" className="claude-case-bullet">○</span>

      {isRenaming ? (
        <input
          aria-label="Rename case"
          autoFocus
          className="claude-case-rename-input"
          onBlur={() => void handleSaveRename()}
          onChange={handleTitleChange}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleInputKeyDown}
          value={draftTitle}
        />
      ) : (
        <span className="claude-case-title" title={billingCase.title}>
          {billingCase.title}
        </span>
      )}
      {isWorking && (
        <span aria-label="Bill Agent is working" className="claude-case-working" role="status">
          <span aria-hidden="true" className="claude-agent-spinner" />
        </span>
      )}

      {/* 3-dots action button */}
      {!isRenaming && (
        <div className="claude-case-actions" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            aria-expanded={isMenuOpen}
            aria-label="Case options"
            className={`claude-case-menu-btn${isMenuOpen ? " is-open" : ""}`}
            onClick={handleToggleMenu}
            ref={menuButtonRef}
            type="button"
          >
            ···
          </button>

          {isMenuOpen && (
            <div className="claude-context-menu" role="menu">
              <button
                className="claude-context-menu-item"
                onClick={handleStartRename}
                role="menuitem"
                type="button"
              >
                <span>Rename</span>
                <kbd className="claude-context-kbd">R</kbd>
              </button>
              <button
                className="claude-context-menu-item is-danger"
                onClick={handleConfirmDelete}
                role="menuitem"
                type="button"
              >
                <span>Delete</span>
                <kbd className="claude-context-kbd">D</kbd>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

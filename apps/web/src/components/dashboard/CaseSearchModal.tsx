"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { CaseSummary } from "./dashboard.types";

interface CaseSearchModalProps {
  isOpen: boolean;
  cases: CaseSummary[];
  onClose: () => void;
  onSelectCase: (caseId: string) => void;
  onNewCase: () => void;
}

export function CaseSearchModal({ isOpen, cases, onClose, onSelectCase, onNewCase }: CaseSearchModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "recent">("all");

  const filteredCases = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let list = cases;
    if (selectedFilter === "recent") {
      list = cases.slice(0, 5);
    }
    if (!query) return list;
    return list.filter((item) =>
      `${item.title} ${item.lastMessage}`.toLowerCase().includes(query),
    );
  }, [cases, searchTerm, selectedFilter]);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleClose = useCallback(() => {
    setSearchTerm("");
    onClose();
  }, [onClose]);

  const handleSelect = useCallback((caseId: string) => {
    setSearchTerm("");
    onSelectCase(caseId);
    onClose();
  }, [onClose, onSelectCase]);

  const handleStartNew = useCallback(() => {
    setSearchTerm("");
    onNewCase();
    onClose();
  }, [onClose, onNewCase]);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
    }
  }, [handleClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      inputRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      className="claude-search-dialog"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
      ref={dialogRef}
    >
      <div className="claude-search-content" onClick={(e) => e.stopPropagation()}>
        <header className="claude-search-header">
          <div className="claude-search-input-wrap">
            <svg aria-hidden="true" className="claude-search-icon" viewBox="0 0 24 24">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              aria-label="Search cases"
              autoFocus
              className="claude-search-input"
              onChange={handleInputChange}
              placeholder="Search cases..."
              ref={inputRef}
              value={searchTerm}
            />
          </div>
          <button
            aria-label="Close search"
            className="claude-search-close-btn"
            onClick={handleClose}
            type="button"
          >
            ✕
          </button>
        </header>

        <div className="claude-search-filters">
          <button
            className={`claude-filter-pill${selectedFilter === "all" ? " is-active" : ""}`}
            onClick={() => setSelectedFilter("all")}
            type="button"
          >
            All
          </button>
          <button
            className={`claude-filter-pill${selectedFilter === "recent" ? " is-active" : ""}`}
            onClick={() => setSelectedFilter("recent")}
            type="button"
          >
            Recents
          </button>
        </div>

        <div className="claude-search-results">
          {filteredCases.length === 0 ? (
            <p className="claude-search-empty">
              {searchTerm ? "No cases found matching your query." : "No saved cases yet."}
            </p>
          ) : (
            <div className="claude-search-group">
              <span className="claude-search-group-title">
                {searchTerm ? "Results" : "Recent cases"}
              </span>
              <ul className="claude-search-list">
                {filteredCases.map((item) => (
                  <li key={item.id}>
                    <button
                      className="claude-search-item"
                      onClick={() => handleSelect(item.id)}
                      type="button"
                    >
                      <span className="claude-search-item-icon">○</span>
                      <span className="claude-search-item-title">{item.title}</span>
                      <span className="claude-search-item-arrow">↵</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="claude-search-group">
            <span className="claude-search-group-title">Actions</span>
            <ul className="claude-search-list">
              <li>
                <button
                  className="claude-search-item"
                  onClick={handleStartNew}
                  type="button"
                >
                  <span className="claude-search-item-icon">＋</span>
                  <span className="claude-search-item-title">Start new dispute case</span>
                  <span className="claude-search-item-arrow">↵</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <footer className="claude-search-footer">
          <div className="claude-search-shortcuts">
            <span><kbd>Esc</kbd> Close</span>
            <span><kbd>↵</kbd> Select</span>
          </div>
        </footer>
      </div>
    </dialog>
  );
}

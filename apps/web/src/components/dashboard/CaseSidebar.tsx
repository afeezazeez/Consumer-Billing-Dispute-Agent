"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { CaseListItem } from "./CaseListItem";
import { CaseSearchModal } from "./CaseSearchModal";
import type { CaseSummary, DashboardUser } from "./dashboard.types";

interface CaseSidebarProps {
  cases: CaseSummary[];
  activeCaseId: string;
  user: DashboardUser;
  isSigningOut: boolean;
  signOutError: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewCase: () => void;
  onSelectCase: (caseId: string) => void;
  onRenameCase: (caseId: string, title: string) => Promise<boolean>;
  onDeleteCase: (caseId: string) => void;
  onSignOut: () => void;
}

export function CaseSidebar({
  cases,
  activeCaseId,
  user,
  isSigningOut,
  signOutError,
  isCollapsed,
  onToggleCollapse,
  onNewCase,
  onSelectCase,
  onRenameCase,
  onDeleteCase,
  onSignOut,
}: CaseSidebarProps) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const initials = useMemo(() => getInitials(user.displayName), [user.displayName]);

  // Open search via Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchModalOpen((curr) => !curr);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close account menu on outside click
  useEffect(() => {
    if (!isAccountMenuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isAccountMenuOpen]);

  const handleOpenSearch = useCallback(() => {
    setIsSearchModalOpen(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchModalOpen(false);
  }, []);

  const handleToggleAccountMenu = useCallback(() => {
    setIsAccountMenuOpen((curr) => !curr);
  }, []);

  return (
    <>
      <aside className={`claude-sidebar${isCollapsed ? " is-collapsed" : ""}`}>
        {/* Top Header */}
        <div className="claude-sidebar-top">
          <div className="claude-brand-row">
            <Link className="claude-brand" href="/">
              <AgentBrandLogo />
              <span className="claude-brand-text">Billing Agent</span>
            </Link>
            <button
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="claude-collapse-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              <SidebarToggleIcon />
            </button>
          </div>

          {/* + New Button */}
          <button
            aria-label="New case"
            className="claude-new-btn"
            onClick={onNewCase}
            type="button"
          >
            <span className="claude-new-plus">＋</span>
            <span className="claude-new-text">New case</span>
          </button>

          {/* Search Button */}
          <button
            aria-label="Search"
            className="claude-nav-item"
            onClick={handleOpenSearch}
            type="button"
          >
            <SearchIcon />
            <span className="claude-nav-text">Search</span>
            <kbd className="claude-shortcut-hint">⌘K</kbd>
          </button>
        </div>

        {/* Case List (No "Chats and tasks" heading, clean list) */}
        <div className="claude-sidebar-cases">
          {cases.length === 0 ? (
            <div className="claude-empty-cases">
              <span>Your cases will appear here.</span>
            </div>
          ) : (
            <div className="claude-case-list" role="list">
              {cases.map((c) => (
                <CaseListItem
                  billingCase={c}
                  isActive={c.id === activeCaseId}
                  key={c.id}
                  onDelete={onDeleteCase}
                  onOpen={onSelectCase}
                  onRename={onRenameCase}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom User Account Row */}
        <div className="claude-sidebar-bottom" ref={accountMenuRef}>
          {signOutError && (
            <div className="claude-signout-error" role="alert">
              {signOutError}
            </div>
          )}

          {isAccountMenuOpen && (
            <div className="claude-account-popover" role="menu">
              <div className="claude-account-info">
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
              </div>
              <div className="claude-account-divider" />
              <button
                className="claude-account-menu-item"
                disabled={isSigningOut}
                onClick={onSignOut}
                role="menuitem"
                type="button"
              >
                <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}

          <div
            className="claude-user-row"
            onClick={handleToggleAccountMenu}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleAccountMenu();
              }
            }}
          >
            <div className="claude-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="claude-user-details">
              <span className="claude-username">{user.displayName}</span>
            </div>
            <button
              aria-label="Toggle sidebar"
              className="claude-bottom-collapse-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              title="Toggle sidebar"
              type="button"
            >
              <SidebarPanelIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* Global Search Modal */}
      <CaseSearchModal
        cases={cases}
        isOpen={isSearchModalOpen}
        onClose={handleCloseSearch}
        onNewCase={onNewCase}
        onSelectCase={onSelectCase}
      />
    </>
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AgentBrandLogo() {
  return (
    <svg
      aria-hidden="true"
      className="claude-logo-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect fill="#2563eb" height="20" rx="5" width="20" x="2" y="2" />
      <path
        d="M7 8h10M7 12h7M7 16h4"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SidebarToggleIcon() {
  return (
    <svg aria-hidden="true" className="claude-icon" viewBox="0 0 24 24">
      <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.75" width="18" x="3" y="4" fill="none" />
      <path d="M9 4v16" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function SidebarPanelIcon() {
  return (
    <svg aria-hidden="true" className="claude-icon-small" viewBox="0 0 24 24">
      <rect height="14" rx="2" stroke="currentColor" strokeWidth="1.75" width="16" x="4" y="5" fill="none" />
      <path d="M10 5v14" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="claude-icon" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" fill="none" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

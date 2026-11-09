"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
  isMobileOpen: boolean;
  onCloseMobile: () => void;
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
  isMobileOpen,
  onCloseMobile,
  onToggleCollapse,
  onNewCase,
  onSelectCase,
  onRenameCase,
  onDeleteCase,
  onSignOut,
}: CaseSidebarProps) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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

  const handleOpenSearch = useCallback(() => {
    setIsSearchModalOpen(true);
    onCloseMobile();
  }, [onCloseMobile]);

  const handleNewCase = useCallback(() => {
    onNewCase();
    onCloseMobile();
  }, [onCloseMobile, onNewCase]);

  const handleMobileEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") onCloseMobile();
  }, [onCloseMobile]);

  useEffect(() => {
    if (!isMobileOpen) return;
    window.addEventListener("keydown", handleMobileEscape);
    return () => window.removeEventListener("keydown", handleMobileEscape);
  }, [handleMobileEscape, isMobileOpen]);

  const handleCloseSearch = useCallback(() => {
    setIsSearchModalOpen(false);
  }, []);

  return (
    <>
      {isMobileOpen && (
        <button
          aria-label="Close cases sidebar"
          className="dashboard-mobile-backdrop"
          onClick={onCloseMobile}
          type="button"
        />
      )}
      <aside className={`claude-sidebar${isCollapsed ? " is-collapsed" : ""}${isMobileOpen ? " is-mobile-open" : ""}`}>
        {/* Top Header - Aligned horizontally with Main Chat Top Bar */}
        <div className="claude-sidebar-top">
          <div className="claude-brand-row">
            <button
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="claude-collapse-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              <SidebarToggleIcon />
            </button>
            <Link className="claude-brand" href="/">
              <span className="claude-brand-text">Billing Agent</span>
            </Link>
          </div>

          {/* + New Button */}
          <button
            aria-label="New case"
            className="claude-new-btn"
            onClick={handleNewCase}
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
                  isWorking={c.isProcessing}
                  key={c.id}
                  onDelete={onDeleteCase}
                  onOpen={onSelectCase}
                  onRename={onRenameCase}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom User Account Row with Always-Visible Sign out option */}
        <div className="claude-sidebar-bottom">
          {signOutError && (
            <div className="claude-signout-error" role="alert">
              {signOutError}
            </div>
          )}

          <div className="claude-user-row">
            <div className="claude-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="claude-user-details">
              <span className="claude-username">{user.displayName}</span>
              <span className="claude-user-email">{user.email}</span>
            </div>
            <button
              aria-label="Sign out"
              className="claude-sign-out-btn"
              disabled={isSigningOut}
              onClick={onSignOut}
              title="Sign out"
              type="button"
            >
              <SignOutIcon />
              <span className="claude-sign-out-text">
                {isSigningOut ? "Signing out…" : "Sign out"}
              </span>
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

function SidebarToggleIcon() {
  return (
    <svg aria-hidden="true" className="claude-icon" viewBox="0 0 24 24" fill="none">
      <rect height="16" rx="2.5" stroke="currentColor" strokeWidth="1.75" width="18" x="3" y="4" />
      <path d="M9 4v16" stroke="currentColor" strokeWidth="1.75" />
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

function SignOutIcon() {
  return (
    <svg aria-hidden="true" className="claude-sign-out-icon" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

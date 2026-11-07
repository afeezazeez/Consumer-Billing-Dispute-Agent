"use client";

import { useCallback, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import Link from "next/link";
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
  onSignOut: () => void;
}

export function CaseSidebar(props: CaseSidebarProps) {
  const { onSelectCase } = props;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredCases = useMemo(() => filterCases(props.cases, searchTerm), [props.cases, searchTerm]);

  const handleSearchToggle = useCallback(() => setIsSearchOpen((current) => !current), []);
  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value), []);
  const handleCaseSelection = useCallback((event: MouseEvent<HTMLElement>) => {
    const caseId = event.currentTarget.dataset.caseId;
    if (caseId) onSelectCase(caseId);
  }, [onSelectCase]);

  return (
    <aside className={`dashboard-sidebar${props.isCollapsed ? " is-collapsed" : ""}`}>
      <header className="dashboard-sidebar-header">
        <Link className="dashboard-brand" href="/">Bill Agent</Link>
        <button aria-label="Search cases" className="sidebar-icon-button" onClick={handleSearchToggle} type="button"><SearchIcon /></button>
        <button aria-label={props.isCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="sidebar-icon-button" onClick={props.onToggleCollapse} type="button"><SidebarIcon /></button>
      </header>
      <button aria-label="New case" className="new-case-button" onClick={props.onNewCase} type="button">
        <span aria-hidden="true">＋</span><span className="new-case-label">New case</span>
      </button>
      {isSearchOpen && <input aria-label="Search cases" className="case-search-input" onChange={handleSearchChange} placeholder="Search cases" value={searchTerm} />}
      <div className="case-list-heading"><span>Recent</span></div>
      {filteredCases.length === 0 ? (
        <p className="sidebar-empty">{searchTerm ? "No cases match your search." : "Your saved cases will appear here."}</p>
      ) : (
        <nav aria-label="Saved billing cases" className="case-list">
          {filteredCases.map((item) => (
            <button
              aria-current={item.id === props.activeCaseId ? "page" : undefined}
              className={`case-list-item${item.id === props.activeCaseId ? " is-active" : ""}`}
              data-case-id={item.id}
              key={item.id}
              onClick={handleCaseSelection}
              type="button"
            >
              <span aria-hidden="true" className="case-list-icon">▱</span>
              <strong>{item.title}</strong>
              <span>{item.lastMessage}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="dashboard-account">
        {props.signOutError && <p className="sidebar-error" role="alert">{props.signOutError}</p>}
        <div className="account-avatar" aria-hidden="true">{getInitials(props.user.displayName)}</div>
        <div className="account-copy"><strong>{props.user.displayName}</strong><span>{props.user.email}</span></div>
        <button aria-label="Sign out" className="sign-out-button" disabled={props.isSigningOut} onClick={props.onSignOut} type="button">
          <span className="sign-out-label">{props.isSigningOut ? "Signing out…" : "Sign out"}</span><span aria-hidden="true">↗</span>
        </button>
      </div>
    </aside>
  );
}

function filterCases(cases: CaseSummary[], searchTerm: string): CaseSummary[] {
  const query = searchTerm.trim().toLocaleLowerCase();
  if (!query) return cases;
  return cases.filter((item) => `${item.title} ${item.lastMessage}`.toLocaleLowerCase().includes(query));
}

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function SidebarIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9 4v16" /></svg>;
}

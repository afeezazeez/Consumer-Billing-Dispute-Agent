"use client";

import { useCallback, type MouseEvent } from "react";
import Link from "next/link";
import type { CaseSummary, DashboardUser } from "./dashboard.types";

interface CaseSidebarProps {
  cases: CaseSummary[];
  activeCaseId: string;
  user: DashboardUser;
  isSigningOut: boolean;
  signOutError: string;
  onNewCase: () => void;
  onSelectCase: (caseId: string) => void;
  onSignOut: () => void;
}

export function CaseSidebar(props: CaseSidebarProps) {
  const { onSelectCase } = props;
  const handleCaseSelection = useCallback((event: MouseEvent<HTMLElement>) => {
    const caseId = event.currentTarget.dataset.caseId;
    if (caseId) onSelectCase(caseId);
  }, [onSelectCase]);

  return (
    <aside className="dashboard-sidebar">
      <Link className="dashboard-brand" href="/">Billing Case Agent</Link>
      <button className="new-case-button" onClick={props.onNewCase} type="button">
        <span aria-hidden="true">＋</span> New case
      </button>
      <div className="case-list-heading"><span>YOUR CASES</span><span>{props.cases.length}</span></div>
      {props.cases.length === 0 ? (
        <p className="sidebar-empty">Your saved cases will appear here.</p>
      ) : (
        <nav aria-label="Saved billing cases" className="case-list">
          {props.cases.map((item) => (
            <button
              aria-current={item.id === props.activeCaseId ? "page" : undefined}
              className={`case-list-item${item.id === props.activeCaseId ? " is-active" : ""}`}
              data-case-id={item.id}
              key={item.id}
              onClick={handleCaseSelection}
              type="button"
            >
              <strong>{item.title}</strong>
              <span>{item.lastMessage}</span>
              <small>{formatCaseDate(item.updatedAt)}</small>
            </button>
          ))}
        </nav>
      )}
      <div className="dashboard-account">
        {props.signOutError && <p className="sidebar-error" role="alert">{props.signOutError}</p>}
        <div className="account-avatar" aria-hidden="true">{getInitials(props.user.displayName)}</div>
        <div className="account-copy"><strong>{props.user.displayName}</strong><span>{props.user.email}</span></div>
        <button aria-label="Sign out" className="sign-out-button" disabled={props.isSigningOut} onClick={props.onSignOut} type="button">
          {props.isSigningOut ? "…" : "↗"}
        </button>
      </div>
    </aside>
  );
}

function formatCaseDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(date));
}

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

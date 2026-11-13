import { useCallback, useState } from "react";
import type { CaseMessage } from "./dashboard.types";

interface CaseNextActionCardProps {
  nextAction: NonNullable<CaseMessage["nextAction"]>;
  messageId: string;
  draftId?: string;
}

export function CaseNextActionCard({ nextAction, messageId, draftId }: CaseNextActionCardProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const summary = `Goal: ${nextAction.goal}\nNext step: ${nextAction.action}`;
  const viewDraft = useCallback(() => {
    if (!draftId) return;
    const draft = document.getElementById(draftId);
    draft?.focus({ preventScroll: true });
    draft?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [draftId]);
  const copySummary = useCallback(async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [summary]);
  const downloadSummary = useCallback(() => {
    const file = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url; link.download = "billing-case-handoff.txt"; link.click(); URL.revokeObjectURL(url);
  }, [summary]);
  const toggleCollapsed = useCallback(() => setIsCollapsed((collapsed) => !collapsed), []);

  return (
    <section className={`case-next-action-card${isCollapsed ? " is-collapsed" : ""}`} aria-label="What to do next">
      <header className="case-next-action-header">
        <div className="case-next-action-heading">
          <span aria-hidden="true" className="case-next-action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </span>
          <div>
            <span className="case-next-action-eyebrow">CASE PLAN</span>
            <h2>What to do next</h2>
          </div>
        </div>
        <button
          aria-controls={`case-next-action-content-${messageId}`}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} next action`}
          className="case-next-action-toggle"
          onClick={toggleCollapsed}
          title={`${isCollapsed ? "Expand" : "Collapse"} next action`}
          type="button"
        >
          <svg aria-hidden="true" className={`case-next-action-chevron${isCollapsed ? " is-collapsed" : ""}`} viewBox="0 0 24 24" fill="none">
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </button>
      </header>
      {isCollapsed && <p className="case-next-action-preview">{nextAction.action}</p>}
      <div
        aria-hidden={isCollapsed}
        className="case-next-action-content"
        id={`case-next-action-content-${messageId}`}
        inert={isCollapsed}
      >
        <div className="case-next-action-inner">
          <div className="case-next-action-context">
            <span>Your goal</span>
            <p>{nextAction.goal}</p>
          </div>
          <div className="case-next-action-step">
            <div className="case-next-action-step-heading">
              <span className="case-next-action-step-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                  <path d="M5 19h14" />
                </svg>
              </span>
              <span>YOUR NEXT MOVE</span>
            </div>
            <p>{nextAction.action}</p>
          </div>
          <div className="case-handoff-actions" aria-label="Case summary actions">
            <button aria-label={copied ? "Handoff summary copied" : "Copy handoff summary"} onClick={copySummary} title={copied ? "Copied" : "Copy summary"} type="button">
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{copied ? "Copied" : "Copy summary"}</span>
            </button>
            <button aria-label="Download handoff summary" onClick={downloadSummary} title="Download summary" type="button"><DownloadIcon /><span>Download</span></button>
            {draftId && <button aria-label="View email draft" onClick={viewDraft} title="View draft" type="button"><DraftIcon /><span>View draft</span></button>}
          </div>
        </div>
      </div>
    </section>
  );
}

function CopyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

function CheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function DownloadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function DraftIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H17l3 3v12.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M8 10h8M8 14h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>;
}

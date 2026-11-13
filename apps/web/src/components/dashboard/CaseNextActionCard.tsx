import { useCallback, useState } from "react";
import type { CaseMessage } from "./dashboard.types";

interface CaseNextActionCardProps {
  nextAction: NonNullable<CaseMessage["nextAction"]>;
  draftId?: string;
}

export function CaseNextActionCard({ nextAction, draftId }: CaseNextActionCardProps) {
  const [copied, setCopied] = useState(false);
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

  return (
    <section className="case-next-action-card" aria-label="What to do next">
      <h2>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
        What to do next
      </h2>
      <dl>
        <div>
          <dt>Your goal</dt>
          <dd>{nextAction.goal}</dd>
        </div>
        <div className="case-next-action-step">
          <dt>Next step</dt>
          <dd>{nextAction.action}</dd>
        </div>
      </dl>
      <div className="case-handoff-actions">
        <button aria-label={copied ? "Handoff summary copied" : "Copy handoff summary"} onClick={copySummary} type="button">{copied ? "Copied" : "Copy summary"}</button>
        <button onClick={downloadSummary} type="button">Download summary</button>
        {draftId && <button type="button" onClick={viewDraft}>View draft</button>}
      </div>
    </section>
  );
}

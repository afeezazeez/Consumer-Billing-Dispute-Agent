import { useCallback } from "react";
import type { CaseConversation } from "./dashboard.types";

interface CaseNextActionCardProps {
  nextAction: NonNullable<CaseConversation["nextAction"]>;
  draftId?: string;
}

export function CaseNextActionCard({ nextAction, draftId }: CaseNextActionCardProps) {
  const viewDraft = useCallback(() => {
    if (!draftId) return;
    const draft = document.getElementById(draftId);
    draft?.focus({ preventScroll: true });
    draft?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [draftId]);

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
      {draftId && <button type="button" onClick={viewDraft}>View draft</button>}
    </section>
  );
}

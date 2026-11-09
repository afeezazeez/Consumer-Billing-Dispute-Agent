import { useCallback } from "react";
import type { CaseConversation } from "./dashboard.types";
import styles from "./CaseNextActionCard.module.css";

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
    <section className={styles.card} aria-label="What to do next">
      <h2>What to do next</h2>
      <p><strong>Your goal</strong> {nextAction.goal}</p>
      <p><strong>Next step</strong> {nextAction.action}</p>
      {draftId && <button type="button" onClick={viewDraft}>View draft</button>}
    </section>
  );
}

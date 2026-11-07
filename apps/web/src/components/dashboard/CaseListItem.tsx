import { useCallback, type MouseEvent } from "react";
import type { CaseSummary } from "./dashboard.types";

interface CaseListItemProps {
  billingCase: CaseSummary;
  isActive: boolean;
  onOpen: (caseId: string) => void;
}

export function CaseListItem({ billingCase, isActive, onOpen }: CaseListItemProps) {
  const handleOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const caseId = event.currentTarget.dataset.caseId;
    if (caseId) onOpen(caseId);
  }, [onOpen]);

  return (
    <button
      aria-current={isActive ? "page" : undefined}
      className={`case-list-item${isActive ? " is-active" : ""}`}
      data-case-id={billingCase.id}
      onClick={handleOpen}
      type="button"
    >
      <span aria-hidden="true" className="case-list-icon">▱</span>
      <strong>{billingCase.title}</strong>
    </button>
  );
}

"use client";

import { useMemo } from "react";
import type { CaseConversation as CaseConversationData, CaseIntakeFact } from "./dashboard.types";

interface CaseIntakeSummaryProps {
  billingCase: CaseConversationData;
}

interface IntakeFactRow {
  label: string;
  value: string;
  source: string;
}

export function CaseIntakeSummary({ billingCase }: CaseIntakeSummaryProps) {
  const facts = useMemo(() => createFactRows(billingCase), [billingCase]);
  if (facts.length === 0) return null;

  return (
    <section aria-label="Case details gathered so far" className="claude-intake-summary">
      <div className="claude-intake-summary-header">
        <h2>What I’ve noted</h2>
        <span>{billingCase.intake.status === "ready" ? "Core details gathered" : "Still gathering details"}</span>
      </div>
      <dl className="claude-intake-facts">
        {facts.map((fact) => (
          <div className="claude-intake-fact" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
            <details>
              <summary>See what you told me</summary>
              <p>{fact.source}</p>
            </details>
          </div>
        ))}
      </dl>
      <p className="claude-intake-correction-hint">Correct or update any detail by replying in the chat.</p>
    </section>
  );
}

function createFactRows(billingCase: CaseConversationData): IntakeFactRow[] {
  const facts = billingCase.intake.facts;
  return [
    createFactRow("Provider", facts.provider, billingCase),
    createFactRow("Issue", facts.issueType ? { ...facts.issueType, value: formatIssueType(facts.issueType.value) } : undefined, billingCase),
    createFactRow("Disputed amount", facts.chargeAmount, billingCase),
    createFactRow("Charge date", facts.chargeDate, billingCase),
    createFactRow("Expected amount", facts.expectedAmount, billingCase),
    createFactRow("Desired outcome", facts.desiredOutcome, billingCase),
  ].filter((row): row is IntakeFactRow => row !== undefined);
}

function createFactRow(
  label: string,
  fact: CaseIntakeFact<string> | undefined,
  billingCase: CaseConversationData,
): IntakeFactRow | undefined {
  if (!fact) return undefined;
  const sourceMessage = billingCase.messages.find((message) => message.id === fact.messageId);
  return { label, value: String(fact.value), source: sourceMessage?.content ?? "Source message is no longer available." };
}

function formatIssueType(issueType: string): string {
  return issueType.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

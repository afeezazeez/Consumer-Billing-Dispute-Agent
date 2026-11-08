"use client";

import { useCallback, useMemo, type MouseEvent } from "react";
import { CaseComposer } from "./CaseComposer";

interface DashboardEmptyStateProps {
  firstName: string;
  isSending: boolean;
  error: string;
  onSendMessage: (message: string) => Promise<boolean>;
}

export function DashboardEmptyState({
  firstName,
  isSending,
  error,
  onSendMessage,
}: DashboardEmptyStateProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${firstName}`;
    if (hour < 18) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  }, [firstName]);

  const handleStarterPrompt = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const prompt = event.currentTarget.dataset.prompt;
      if (prompt) void onSendMessage(prompt);
    },
    [onSendMessage],
  );

  return (
    <div className="claude-empty-container">
      <div className="claude-greeting-block">
        <span aria-hidden="true" className="modern-dash-spark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="modern-dash-greeting-text">
          <h1 className="claude-greeting-heading">{greeting}</h1>
          <p className="modern-dash-subheading">What seems wrong with your bill or statement?</p>
        </div>
      </div>

      <div className="claude-welcome-composer-wrap">
        <CaseComposer
          error={error}
          isSending={isSending}
          onSendMessage={onSendMessage}
          placeholder="Describe the charge, amount, or provider to begin..."
          variant="welcome"
        />
      </div>

      <div aria-label="Suggested starting points" className="claude-starter-prompts">
        <button
          className="claude-starter-pill"
          data-prompt="I don’t recognize a charge on my bill."
          disabled={isSending}
          onClick={handleStarterPrompt}
          type="button"
        >
          <span className="starter-pill-dot" />
          I don’t recognize a charge
        </button>
        <button
          className="claude-starter-pill"
          data-prompt="The amount charged doesn’t match what I expected."
          disabled={isSending}
          onClick={handleStarterPrompt}
          type="button"
        >
          <span className="starter-pill-dot" />
          The amount looks wrong
        </button>
        <button
          className="claude-starter-pill"
          data-prompt="I was charged after canceling a service."
          disabled={isSending}
          onClick={handleStarterPrompt}
          type="button"
        >
          <span className="starter-pill-dot" />
          I was charged after canceling
        </button>
      </div>
    </div>
  );
}

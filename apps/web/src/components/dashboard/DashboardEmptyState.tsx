import { useCallback, type MouseEvent } from "react";
import { CaseComposer } from "./CaseComposer";

interface DashboardEmptyStateProps {
  isSending: boolean;
  error: string;
  onSendMessage: (message: string) => Promise<boolean>;
}

export function DashboardEmptyState({ isSending, error, onSendMessage }: DashboardEmptyStateProps) {
  const handleStarterPrompt = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const prompt = event.currentTarget.dataset.prompt;
    if (prompt) void onSendMessage(prompt);
  }, [onSendMessage]);

  return (
    <section className="chat-workspace is-empty" aria-labelledby="new-chat-heading">
      <div className="new-chat-intro">
        <h1 id="new-chat-heading">What seems wrong with your bill?</h1>
      </div>
      <CaseComposer error={error} isSending={isSending} onSendMessage={onSendMessage} />
      <div aria-label="Try a starting point" className="starter-prompts">
        <button data-prompt="I don’t recognize a charge on my bill." disabled={isSending} onClick={handleStarterPrompt} type="button">I don’t recognize a charge</button>
        <button data-prompt="The amount charged doesn’t match what I expected." disabled={isSending} onClick={handleStarterPrompt} type="button">The amount looks wrong</button>
        <button data-prompt="I was charged after canceling a service." disabled={isSending} onClick={handleStarterPrompt} type="button">I was charged after canceling</button>
      </div>
    </section>
  );
}

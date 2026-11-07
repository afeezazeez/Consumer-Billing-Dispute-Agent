import { CaseComposer } from "./CaseComposer";

interface DashboardEmptyStateProps {
  isSending: boolean;
  error: string;
  onSendMessage: (message: string) => Promise<boolean>;
}

export function DashboardEmptyState({ isSending, error, onSendMessage }: DashboardEmptyStateProps) {
  return (
    <section className="chat-workspace is-empty" aria-labelledby="new-chat-heading">
      <div className="new-chat-intro">
        <span className="new-chat-symbol" aria-hidden="true">↗</span>
        <h1 id="new-chat-heading">What charge are you looking at?</h1>
        <p>Describe what seems wrong. You can add the bill or other records as you work through the case.</p>
      </div>
      <CaseComposer error={error} isSending={isSending} onSendMessage={onSendMessage} />
    </section>
  );
}

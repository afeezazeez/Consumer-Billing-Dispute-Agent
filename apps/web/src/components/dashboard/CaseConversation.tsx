import { CaseComposer } from "./CaseComposer";
import type { CaseConversation as CaseConversationData } from "./dashboard.types";

interface CaseConversationProps {
  billingCase: CaseConversationData;
  isSending: boolean;
  error: string;
  onSendMessage: (message: string) => Promise<boolean>;
}

export function CaseConversation({ billingCase, isSending, error, onSendMessage }: CaseConversationProps) {
  return (
    <section className="chat-workspace" aria-labelledby="active-case-title">
      <header className="chat-header">
        <div className="chat-title-mark" aria-hidden="true">↗</div>
        <div><h1 id="active-case-title">{billingCase.title}</h1><p>Billing case</p></div>
      </header>
      <div className="chat-history" aria-live="polite">
        <div className="conversation-date">Started {formatLongDate(billingCase.createdAt)}</div>
        {billingCase.messages.map((message) => (
          <article className={`chat-message ${message.role}`} key={message.id}>
            <span>{message.role === "user" ? "You" : "Billing Case Agent"}</span>
            <p>{message.content}</p>
          </article>
        ))}
      </div>
      <CaseComposer error={error} isSending={isSending} onSendMessage={onSendMessage} />
    </section>
  );
}

function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(date));
}

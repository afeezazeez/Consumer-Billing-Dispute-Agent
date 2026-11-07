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
      <header className="chat-header"><h1 id="active-case-title">{billingCase.title}</h1></header>
      <div className="chat-history" aria-live="polite">
        {billingCase.messages.map((message) => (
          <article className={`chat-message ${message.role}`} key={message.id}>
            <p>{message.content}</p>
          </article>
        ))}
      </div>
      <CaseComposer error={error} isSending={isSending} onSendMessage={onSendMessage} />
    </section>
  );
}

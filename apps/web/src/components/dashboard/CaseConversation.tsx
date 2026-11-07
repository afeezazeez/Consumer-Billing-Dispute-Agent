import type { CaseConversation as CaseConversationData } from "./dashboard.types";

interface CaseConversationProps {
  billingCase: CaseConversationData;
}

export function CaseConversation({ billingCase }: CaseConversationProps) {
  return (
    <section className="case-conversation" aria-labelledby="active-case-title">
      <div className="conversation-topbar">
        <div>
          <p className="dashboard-eyebrow">BILLING CASE</p>
          <h1 id="active-case-title">{billingCase.title}</h1>
        </div>
        <span className="case-status"><i /> Open</span>
      </div>
      <div className="conversation-body">
        <div className="conversation-date">CASE OPENED · {formatLongDate(billingCase.createdAt)}</div>
        {billingCase.messages.map((message) => (
          <article className={`conversation-message ${message.role}`} key={message.id}>
            <span className="message-label">{message.role === "user" ? "YOU" : "BILLING CASE AGENT"}</span>
            <p>{message.content}</p>
          </article>
        ))}
        <div className="case-next-step">
          <span className="next-step-mark" aria-hidden="true">↗</span>
          <div>
            <strong>Your case is saved.</strong>
            <p>Evidence upload and agent review will appear in this workspace as we build them.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(date));
}

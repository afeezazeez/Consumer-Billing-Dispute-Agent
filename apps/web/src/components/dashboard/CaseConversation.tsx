import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { CaseComposer } from "./CaseComposer";
import type { CaseConversation as CaseConversationData } from "./dashboard.types";

interface CaseConversationProps {
  billingCase: CaseConversationData;
  isSending: boolean;
  error: string;
  onSendMessage: (message: string) => Promise<boolean>;
  onDeleteCase: (caseId: string) => Promise<void>;
}

export function CaseConversation({ billingCase, isSending, error, onSendMessage, onDeleteCase }: CaseConversationProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const handleToggleMenu = useCallback(() => setIsMenuOpen((current) => !current), []);
  const handleOutsidePointer = useCallback((event: PointerEvent) => {
    if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
  }, []);
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") setIsMenuOpen(false);
  }, []);
  const handleDelete = useCallback(() => {
    setIsMenuOpen(false);
    if (window.confirm("Delete this billing case and its conversation? This cannot be undone.")) {
      void onDeleteCase(billingCase.id);
    }
  }, [billingCase.id, onDeleteCase]);
  useEffect(() => {
    document.addEventListener("pointerdown", handleOutsidePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [handleEscape, handleOutsidePointer]);

  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") setIsMenuOpen(false);
  }, []);
  const handleMenuPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => event.stopPropagation(), []);

  return (
    <section className="chat-workspace" aria-labelledby="active-case-title">
      <header className="chat-header">
        <div className="case-title-menu" onKeyDown={handleMenuKeyDown} onPointerDown={handleMenuPointerDown} ref={menuRef}>
          <button aria-expanded={isMenuOpen} aria-haspopup="menu" className="case-title-trigger" id="active-case-title" onClick={handleToggleMenu} type="button">
            <span>{billingCase.title}</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
          </button>
          {isMenuOpen && <div aria-label="Case actions" className="case-title-dropdown" role="group">
            <button className="case-delete-action" onClick={handleDelete} type="button"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 6h12M8 6V4h4v2m-7 0 .8 10h8.4L15 6M8 9v4m4-4v4" /></svg>Delete case</button>
          </div>}
        </div>
      </header>
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

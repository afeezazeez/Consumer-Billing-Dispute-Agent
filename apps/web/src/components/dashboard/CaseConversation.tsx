"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CaseComposer } from "./CaseComposer";
import { CaseMessageFailure } from "./CaseMessageFailure";
import { AgentActivityDisclosure } from "./AgentActivityDisclosure";
import { CaseMessageSources } from "./CaseMessageSources";
import { CaseMessageActions } from "./CaseMessageActions";
import { EmailDraftCard } from "./EmailDraftCard";
import type { CaseAgentSource, CaseAgentToolActivity } from "./dashboard.types";
import type { CaseConversation as CaseConversationData } from "./dashboard.types";

interface CaseConversationProps {
  billingCase: CaseConversationData;
  isSending: boolean;
  error: string;
  liveToolActivities: CaseAgentToolActivity[];
  onSendMessage: (message: string) => Promise<boolean>;
  onRetryMessage: (messageId: string, content?: string) => void;
  onDeleteCase: (caseId: string) => void;
  onRenameCase: (caseId: string, title: string) => Promise<boolean>;
}

export function CaseConversation({
  billingCase,
  isSending,
  error,
  liveToolActivities,
  onSendMessage,
  onRetryMessage,
  onDeleteCase,
  onRenameCase,
}: CaseConversationProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const historyContentRef = useRef<HTMLDivElement>(null);
  const shouldFollowLatestRef = useRef(true);
  const displayedCaseIdRef = useRef(billingCase.id);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(billingCase.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAgentWorking = useMemo(
    () => isSending || billingCase.messages.at(-1)?.processingStatus === "pending",
    [billingCase.messages, isSending],
  );

  const handleToggleMenu = useCallback(() => setIsMenuOpen((curr) => !curr), []);

  const handleOutsidePointer = useCallback((event: PointerEvent) => {
    if (!menuRef.current?.contains(event.target as Node)) {
      setIsMenuOpen(false);
    }
  }, []);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsMenuOpen(false);
    }
  }, []);

  const handleOpenDeleteConfirmation = useCallback(() => {
    setIsMenuOpen(false);
    onDeleteCase(billingCase.id);
  }, [billingCase.id, onDeleteCase]);

  const handleOpenRename = useCallback(() => {
    setDraftTitle(billingCase.title);
    setIsMenuOpen(false);
    setIsRenaming(true);
  }, [billingCase.title]);

  const handleTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDraftTitle(event.target.value);
  }, []);

  const handleSaveRename = useCallback(async () => {
    const title = draftTitle.trim();
    if (title && title !== billingCase.title) {
      await onRenameCase(billingCase.id, title);
    }
    setIsRenaming(false);
  }, [billingCase.id, billingCase.title, draftTitle, onRenameCase]);

  const handleTitleBlur = useCallback(() => void handleSaveRename(), [handleSaveRename]);

  const handleTitleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") event.currentTarget.blur();
      if (event.key === "Escape") {
        setDraftTitle(billingCase.title);
        setIsRenaming(false);
      }
    },
    [billingCase.title],
  );

  useEffect(() => {
    document.addEventListener("pointerdown", handleOutsidePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [handleEscape, handleOutsidePointer]);

  const handleHistoryScroll = useCallback(() => {
    const history = historyRef.current;
    if (history) shouldFollowLatestRef.current = history.scrollHeight - history.scrollTop - history.clientHeight < 120;
  }, []);

  const handleSend = useCallback((content: string) => {
    shouldFollowLatestRef.current = true;
    return onSendMessage(content);
  }, [onSendMessage]);

  useLayoutEffect(() => {
    if (displayedCaseIdRef.current === billingCase.id) return;
    displayedCaseIdRef.current = billingCase.id;
    shouldFollowLatestRef.current = true;
  }, [billingCase.id]);

  useLayoutEffect(() => {
    if (!shouldFollowLatestRef.current) return;
    const history = historyRef.current;
    if (!history) return;
    const scrollToLatest = () => history.scrollTo({ top: history.scrollHeight, behavior: "smooth" });
    scrollToLatest();
    const frame = window.requestAnimationFrame(scrollToLatest);
    return () => window.cancelAnimationFrame(frame);
  }, [billingCase.messages, isSending, liveToolActivities]);

  useEffect(() => {
    const content = historyContentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (!shouldFollowLatestRef.current || !historyRef.current) return;
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") setIsMenuOpen(false);
  }, []);

  const handleMenuPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <div className="claude-chat-viewport">
      {/* Top Bar - Full Width, Aligned with Sidebar Header */}
      <header className="claude-chat-top-bar">
        <div
          className="claude-title-menu"
          onKeyDown={handleMenuKeyDown}
          onPointerDown={handleMenuPointerDown}
          ref={menuRef}
        >
          {isRenaming ? (
            <input
              aria-label="Rename case"
              autoFocus
              className="claude-title-input"
              id="active-case-title"
              maxLength={140}
              onBlur={handleTitleBlur}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              value={draftTitle}
            />
          ) : (
            <button
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className="claude-title-button"
              disabled={isAgentWorking}
              id="active-case-title"
              onClick={handleToggleMenu}
              type="button"
            >
              <span className="claude-title-text">{billingCase.title}</span>
              <svg aria-hidden="true" className="claude-chevron-down" viewBox="0 0 16 16">
                <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {isMenuOpen && (
            <div aria-label="Case actions" className="claude-title-dropdown" role="menu">
              <button className="claude-dropdown-item" onClick={handleOpenRename} role="menuitem" type="button">
                <span>Rename case</span>
                <kbd className="claude-context-kbd">R</kbd>
              </button>
              <button
                className="claude-dropdown-item is-danger"
                onClick={handleOpenDeleteConfirmation}
                role="menuitem"
                type="button"
              >
                <span>Delete case</span>
                <kbd className="claude-context-kbd">D</kbd>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Chat Workspace */}
      <div className="claude-chat-workspace">
        {/* Messages Feed */}
        <div className="claude-chat-history" aria-live="polite" onScroll={handleHistoryScroll} ref={historyRef}>
          <div className="claude-chat-history-inner" ref={historyContentRef}>
            {billingCase.messages.map((message) => (
              <article
                className={`claude-message-row ${message.role}`}
                key={message.id}
              >
                {message.role === "assistant" && (
                  <AgentActivityDisclosure activities={message.toolActivities} />
                )}
                <div className="claude-message-bubble">
                  {message.role === "assistant"
                    ? message.emailDraft
                      ? <EmailDraftCard draft={message.emailDraft} />
                      : <AssistantMessage content={message.content} />
                    : <p>{message.content}</p>}
                </div>
                {message.role === "assistant" && !message.emailDraft && (
                  <CaseMessageActions content={message.content} />
                )}
                {message.role === "assistant" && (
                  <CaseMessageSources sources={getUnmentionedSources(message.content, message.sources)} />
                )}
                {message.role === "user" && message.processingStatus === "failed" && (
                  <CaseMessageFailure
                    content={message.content}
                    isSending={isAgentWorking}
                    key={`${message.id}-${message.content}-${message.processingStatus}`}
                    messageId={message.id}
                    onRetry={onRetryMessage}
                  />
                )}
              </article>
            ))}
            {isAgentWorking && (
              <div aria-live="polite" className="claude-agent-thinking" role="status">
                {getRunningActivity(liveToolActivities) ? (
                  <AgentActivityDisclosure activities={liveToolActivities} isLive />
                ) : (
                  <span aria-label="Thinking" className="claude-agent-thinking-text">
                    {renderThinkingLetters()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Anchored Composer */}
        <div className="claude-chat-composer-container">
          <CaseComposer
            error={error}
            isSending={isAgentWorking}
            onSendMessage={handleSend}
            variant="conversation"
          />
        </div>
      </div>
    </div>
  );
}

function renderThinkingLetters() {
  return Array.from("Thinking").map((letter, index) => (
    <span
      aria-hidden="true"
      className="claude-agent-thinking-letter"
      key={index}
      style={{ "--thinking-letter-index": index } as CSSProperties}
    >
      {letter}
    </span>
  ));
}

function getRunningActivity(activities: CaseAgentToolActivity[]): boolean {
  return activities.some((activity) => activity.status === "running");
}

interface AssistantMessageProps {
  content: string;
}

function AssistantMessage({ content }: AssistantMessageProps) {
  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => renderSafeMarkdownLink(href, children),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function renderSafeMarkdownLink(href: string | undefined, children: React.ReactNode): React.ReactNode {
  if (!href || !isSafeWebUrl(href)) return children;
  return <a href={href} rel="noopener noreferrer" target="_blank">{children}</a>;
}

function getUnmentionedSources(content: string, sources: CaseAgentSource[]): CaseAgentSource[] {
  return sources.filter((source) => !content.includes(source.url));
}

function isSafeWebUrl(url: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

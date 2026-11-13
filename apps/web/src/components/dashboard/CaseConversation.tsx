"use client";

import type { CaseUpload } from "./dashboard.types";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CaseComposer } from "./CaseComposer";
import { CaseMessageFailure } from "./CaseMessageFailure";
import { AgentActivityDisclosure } from "./AgentActivityDisclosure";
import { AgentActivityText } from "./AgentActivityText";
import { CaseMessageSources } from "./CaseMessageSources";
import { CaseMessageActions } from "./CaseMessageActions";
import { CaseMessageAttachments } from "./CaseMessageAttachments";
import { EmailDraftCard } from "./EmailDraftCard";
import { CaseNextActionCard } from "./CaseNextActionCard";
import type { CaseAgentSource, CaseAgentToolActivity, CaseEmailDraft } from "./dashboard.types";
import type { CaseConversation as CaseConversationData } from "./dashboard.types";

interface CaseConversationProps {
  billingCase: CaseConversationData;
  isSending: boolean;
  error: string;
  liveToolActivities: CaseAgentToolActivity[];
  onSendMessage: (message: string, upload?: CaseUpload) => Promise<boolean>;
  onRetryMessage: (messageId: string, content?: string) => void;
  onDeleteCase: (caseId: string) => void;
  onRenameCase: (caseId: string, title: string) => Promise<boolean>;
  onEmailDraftDecision: (messageId: string, decision: "approve" | "cancel", draft?: Pick<CaseEmailDraft, "recipients" | "subject" | "body">) => Promise<{ success: boolean; message?: string }>;
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
  onEmailDraftDecision,
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

  const scrollToLatest = useCallback(() => {
    const history = historyRef.current;
    history?.scrollTo({ top: history.scrollHeight, behavior: "instant" });
  }, []);

  const handleSend = useCallback((content: string, upload?: CaseUpload) => {
    shouldFollowLatestRef.current = true;
    scrollToLatest();
    return onSendMessage(content, upload);
  }, [onSendMessage, scrollToLatest]);

  useLayoutEffect(() => {
    if (displayedCaseIdRef.current === billingCase.id) return;
    displayedCaseIdRef.current = billingCase.id;
    shouldFollowLatestRef.current = true;
  }, [billingCase.id]);

  useLayoutEffect(() => {
    if (shouldFollowLatestRef.current) scrollToLatest();
  }, [billingCase.id, billingCase.messages, isSending, liveToolActivities, scrollToLatest]);

  useEffect(() => {
    const content = historyContentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (shouldFollowLatestRef.current) scrollToLatest();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToLatest]);

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
            {billingCase.messages.map((message, index) => (
              <div className="claude-message-group" key={message.id}>
                {shouldShowDateDivider(message.createdAt, billingCase.messages[index - 1]?.createdAt) && (
                  <time className="claude-message-date" dateTime={message.createdAt} aria-label={formatMessageDate(message.createdAt)}>
                    {formatMessageDateLabel(message.createdAt)}
                  </time>
                )}
                <article
                  className={`claude-message-row ${message.role}`}
                  id={message.emailDraft ? `case-draft-${message.id}` : undefined}
                  tabIndex={message.emailDraft ? -1 : undefined}
                >
                {message.role === "assistant" && (
                  <AgentActivityDisclosure activities={getActivitiesWithEmailHistory(message)} />
                )}
                {message.attachments && message.attachments.length > 0 && (
                  <CaseMessageAttachments attachments={message.attachments} />
                )}
                <div className="claude-message-bubble">
                  {message.role === "assistant"
                    ? renderAssistantContent(message, onEmailDraftDecision)
                    : <p>{message.content}</p>}
                </div>
                {message.role === "assistant" && (!message.emailDraft || message.emailDraft.status === "sent") && (
                  <CaseMessageActions
                    agentTurnDurationMs={message.agentTurnDurationMs}
                    createdAt={message.createdAt}
                    messageId={message.id}
                  />
                )}
                {message.role === "user" && (
                  <CaseMessageActions createdAt={message.createdAt} messageId={message.id} role="user" />
                )}
                {message.role === "assistant" && !message.emailDraft && (
                  <CaseMessageSources sources={getUnmentionedSources(message.content, message.sources)} />
                )}
                {message.role === "assistant" && message.nextAction && !message.emailDraft && (
                  <CaseNextActionCard
                    nextAction={message.nextAction}
                  />
                )}
                </article>
                {message.role === "user" && message.processingStatus === "failed" && (
                  <article aria-label="Message delivery error" className="claude-message-row assistant is-failed">
                    <CaseMessageFailure
                      content={message.content}
                      isSending={isAgentWorking}
                      key={`${message.id}-${message.content}-${message.processingStatus}`}
                      messageId={message.id}
                      onRetry={onRetryMessage}
                    />
                  </article>
                )}
              </div>
            ))}
            {isAgentWorking && (
              <div aria-live="polite" className="claude-agent-thinking" role="status">
                {getRunningActivity(liveToolActivities) ? (
                  <AgentActivityDisclosure activities={liveToolActivities} isLive />
                ) : (
                  <AgentActivityText label={liveToolActivities.length > 0 ? "Working" : "Thinking"} />
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

function renderAssistantContent(
  message: CaseConversationData["messages"][number],
  onDecision: CaseConversationProps["onEmailDraftDecision"],
): React.ReactNode {
  const draft = message.emailDraft;
  if (draft?.status === "sent") return <AssistantMessage content={draft.sentConfirmation || "Your email was sent successfully."} />;
  if (draft) return <>
    {message.content.trim() && <AssistantMessage content={message.content} />}
    <EmailDraftCard draft={draft} messageId={message.id} onDecision={onDecision} />
  </>;
  return <AssistantMessage content={message.content} />;
}

function getActivitiesWithEmailHistory(message: CaseConversationData["messages"][number]): CaseAgentToolActivity[] {
  const events = message.emailDraft?.events ?? [];
  const emailActivities = events.map((event, index) => ({
    id: `${message.id}-email-${index}`,
    name: event.status === "sending" ? "send_email" : "email_draft",
    label: event.summary,
    status: event.status === "sending" ? "running" as const : "completed" as const,
    actionStatus: event.status,
  }));
  return [...message.toolActivities, ...emailActivities];
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

function shouldShowDateDivider(createdAt: string, previousCreatedAt?: string): boolean {
  return !previousCreatedAt || getLocalDateKey(createdAt) !== getLocalDateKey(previousCreatedAt);
}

function formatMessageDateLabel(createdAt: string): string {
  const date = new Date(createdAt);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (getLocalDateKey(createdAt) === getLocalDateKey(today.toISOString())) return "Today";
  if (getLocalDateKey(createdAt) === getLocalDateKey(yesterday.toISOString())) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMessageDate(createdAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(createdAt));
}

function getLocalDateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

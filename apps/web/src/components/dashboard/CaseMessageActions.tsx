"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

interface CaseMessageActionsProps {
  messageId: string;
  createdAt: string;
  agentTurnDurationMs?: number;
  role?: "assistant" | "user";
}

let activeUtterance: SpeechSynthesisUtterance | undefined;
let activeMessageId: string | undefined;
let activeStatusHandler: ((isSpeaking: boolean) => void) | undefined;

export function CaseMessageActions({ messageId, createdAt, agentTurnDurationMs, role = "assistant" }: CaseMessageActionsProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const resetTimer = useRef<number>(undefined);
  const itemName = role === "user" ? "message" : "response";
  const label = status === "copied" ? `Copied ${itemName}` : status === "failed" ? "Copy failed. Try again" : `Copy ${itemName}`;
  const timeLabel = formatMessageTime(createdAt);

  useEffect(() => () => {
    window.clearTimeout(resetTimer.current);
    stopSpeechForMessage(messageId);
  }, [messageId]);

  const handleCopy = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    const selector = role === "user" ? ".claude-message-bubble" : ".assistant-markdown";
    const response = event.currentTarget.closest("article")?.querySelector<HTMLElement>(selector);
    if (!response) return;

    try {
      await copyResponse(response);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 1600);
  }, [role]);

  const handleToggleSpeech = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const response = event.currentTarget.closest("article")?.querySelector<HTMLElement>(".assistant-markdown");
    if (!response?.innerText.trim()) return;
    toggleSpeech(messageId, response.innerText.trim(), setIsSpeaking);
  }, [messageId]);

  return (
    <div className={`case-message-actions${role === "user" ? " is-user" : ""}`}>
      <button aria-label={label} onClick={handleCopy} title={label} type="button">
        {status === "copied" ? <CheckIcon /> : <CopyIcon />}
      </button>
      {role === "assistant" && <button
        aria-label={isSpeaking ? "Stop reading response" : "Read response aloud"}
        aria-pressed={isSpeaking}
        onClick={handleToggleSpeech}
        title={isSpeaking ? "Stop reading" : "Read response aloud"}
        type="button"
      >
        {isSpeaking ? <StopIcon /> : <SpeakerIcon />}
      </button>}
      <time className="case-message-time" dateTime={createdAt}>{timeLabel}</time>
      {role === "assistant" && agentTurnDurationMs !== undefined && (
        <span aria-label={`Response took ${formatTurnDuration(agentTurnDurationMs)}`} className="case-message-duration">
          {formatTurnDuration(agentTurnDurationMs)}
        </span>
      )}
    </div>
  );
}

function formatMessageTime(createdAt: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(createdAt));
}

function formatTurnDuration(durationMs: number): string {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  return `${seconds}s`;
}

function toggleSpeech(messageId: string, text: string, onStatusChange: (isSpeaking: boolean) => void): void {
  if (activeMessageId === messageId) {
    cancelActiveSpeech();
    return;
  }
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  cancelActiveSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;
  activeMessageId = messageId;
  activeStatusHandler = onStatusChange;
  utterance.onend = () => finishSpeech(utterance);
  utterance.onerror = () => finishSpeech(utterance);
  onStatusChange(true);
  window.speechSynthesis.speak(utterance);
}

function stopSpeechForMessage(messageId: string): void {
  if (activeMessageId === messageId) cancelActiveSpeech();
}

function cancelActiveSpeech(): void {
  if (!activeUtterance) return;
  activeUtterance = undefined;
  activeMessageId = undefined;
  activeStatusHandler?.(false);
  activeStatusHandler = undefined;
  window.speechSynthesis.cancel();
}

function finishSpeech(utterance: SpeechSynthesisUtterance): void {
  if (activeUtterance !== utterance) return;
  activeStatusHandler?.(false);
  activeUtterance = undefined;
  activeMessageId = undefined;
  activeStatusHandler = undefined;
}

async function copyResponse(response: HTMLElement): Promise<void> {
  const plainText = response.innerText;
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      "text/html": new Blob([response.innerHTML], { type: "text/html" }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    });
    try {
      await navigator.clipboard.write([item]);
      return;
    } catch {
      // Some browsers allow plain text writes even when rich clipboard writes fail.
    }
  }
  await navigator.clipboard.writeText(plainText);
}

function CopyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

function CheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function SpeakerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4 10v4h4l5 4V6l-5 4H4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M16 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function StopIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" /></svg>;
}

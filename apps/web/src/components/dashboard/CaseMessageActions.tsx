"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

export function CaseMessageActions() {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<number>(undefined);
  const label = status === "copied" ? "Copied response" : status === "failed" ? "Copy failed. Try again" : "Copy response";

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const handleCopy = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    const response = event.currentTarget.closest("article")?.querySelector<HTMLElement>(".assistant-markdown");
    if (!response) return;

    try {
      await copyResponse(response);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 1600);
  }, []);

  return (
    <div className="case-message-actions">
      <button aria-label={label} onClick={handleCopy} title={label} type="button">
        {status === "copied" ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
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

import type { CaseMessageRecord } from "../../cases/case.repository";

const acknowledgementMessages = new Set([
  "thanks", "thank you", "thanks a lot", "thank you so much", "thanks so much",
  "appreciate it", "much appreciated", "cheers",
]);

export function isStandaloneAcknowledgment(content?: string): boolean {
  const normalized = (content ?? "").toLowerCase().replace(/[.!?,]/g, " ").replace(/\s+/g, " ").trim();
  return acknowledgementMessages.has(normalized);
}

export function mayCreateEmailDraft(messages: CaseMessageRecord[], latestMessageId: string): boolean {
  const latestIndex = messages.findIndex((message) => message.id === latestMessageId && message.role === "user");
  if (latestIndex < 0) return false;
  if (hasExplicitEmailDraftIntent(messages[latestIndex].content)) return true;
  return isImmediateGmailConnectionFollowUp(messages, latestIndex);
}

function isImmediateGmailConnectionFollowUp(messages: CaseMessageRecord[], latestIndex: number): boolean {
  const latestMessage = messages[latestIndex].content;
  if (!/\b(?:gmail|it|that)\b.{0,20}\bconnected\b/i.test(latestMessage)) return false;
  const previousAssistantIndex = findPreviousAssistantIndex(messages, latestIndex);
  if (previousAssistantIndex < 0 || !asksToConnectGmail(messages[previousAssistantIndex].content)) return false;
  const previousUserIndex = findPreviousUserIndex(messages, previousAssistantIndex);
  return previousUserIndex >= 0 && hasExplicitEmailDraftIntent(messages[previousUserIndex].content);
}

function findPreviousAssistantIndex(messages: CaseMessageRecord[], before: number): number {
  for (let index = before - 1; index >= 0; index -= 1) if (messages[index].role === "assistant") return index;
  return -1;
}

function findPreviousUserIndex(messages: CaseMessageRecord[], before: number): number {
  for (let index = before - 1; index >= 0; index -= 1) if (messages[index].role === "user") return index;
  return -1;
}

function asksToConnectGmail(content: string): boolean {
  return /connect gmail/i.test(content) && /return to this case|tell me.{0,30}connected/i.test(content);
}

function hasExplicitEmailDraftIntent(content: string): boolean {
  return /\b(?:draft|write|compose|craft|prepare|send)\b.{0,60}\b(?:e-?mail|message)\b|\b(?:e-?mail|message)\b.{0,60}\b(?:draft|write|compose|craft|prepare|send)\b|\bemail\s+(?:them|support|the provider|the merchant)\b/i.test(content);
}

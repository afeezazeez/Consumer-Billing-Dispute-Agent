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
  if (isStandaloneAcknowledgment(messages[latestIndex].content)) return false;
  if (hasExplicitEmailDraftIntent(messages[latestIndex].content)) return true;
  const requestIndex = findLatestEmailRequestIndex(messages, latestIndex);
  if (requestIndex < 0 || hasExistingEmailDraft(messages, requestIndex, latestIndex)) return false;
  return isActiveEmailWorkflowReply(messages, latestIndex, requestIndex);
}

function isActiveEmailWorkflowReply(messages: CaseMessageRecord[], latestIndex: number, requestIndex: number): boolean {
  const previousAssistantIndex = findPreviousAssistantIndex(messages, latestIndex);
  if (previousAssistantIndex <= requestIndex) return false;
  const prompt = messages[previousAssistantIndex].content;
  return asksEmailWorkflowQuestion(prompt) || isEmailApprovalStep(prompt);
}

function findLatestEmailRequestIndex(messages: CaseMessageRecord[], before: number): number {
  for (let index = before - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user" && hasExplicitEmailDraftIntent(messages[index].content)) return index;
  }
  return -1;
}

function hasExistingEmailDraft(messages: CaseMessageRecord[], after: number, before: number): boolean {
  return messages.slice(after + 1, before).some((message) =>
    message.emailDraft !== undefined && message.emailDraft.status !== "cancelled");
}

function asksEmailWorkflowQuestion(content: string): boolean {
  const refersToEmail = /\b(?:email|gmail|recipient|support address|draft|send|refund request)\b/i.test(content);
  const asksForReply = /\?|\b(?:what|which|would|should|please|confirm|tell me)\b/i.test(content);
  return refersToEmail && asksForReply;
}

function isEmailApprovalStep(content: string): boolean {
  return /\b(?:exact email|email draft|draft email)\b/i.test(content) &&
    /\b(?:approval|approve|review|send)\b/i.test(content);
}

function findPreviousAssistantIndex(messages: CaseMessageRecord[], before: number): number {
  for (let index = before - 1; index >= 0; index -= 1) if (messages[index].role === "assistant") return index;
  return -1;
}

function hasExplicitEmailDraftIntent(content: string): boolean {
  return /\b(?:draft|write|compose|craft|prepare|send)\b.{0,60}\b(?:e-?mail|message)\b|\b(?:e-?mail|message)\b.{0,60}\b(?:draft|write|compose|craft|prepare|send)\b|\bemail\s+(?:them|support|the provider|the merchant)\b|\b(?:resend|recreate|redraft)\b.{0,40}\b(?:it|one|another|email|draft|message)\b|\b(?:draft|email|message)\b.{0,40}\b(?:again|resend|recreate|send again)\b/i.test(content);
}

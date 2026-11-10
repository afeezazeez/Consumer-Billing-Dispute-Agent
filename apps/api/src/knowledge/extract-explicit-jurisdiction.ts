import type { CaseMessageRecord } from "../cases/case.repository";

const ISSUING_COUNTRY_PATTERNS = [
  { code: "NG", pattern: /\b(?:nigerian|nigeria)\s+(?:debit\s+|credit\s+)?(?:card|bank|account)\b/i },
  { code: "NG", pattern: /\b(?:card|bank|account)\s+(?:was\s+)?(?:issued|opened|registered|based)\s+in\s+nigeria\b/i },
  { code: "NG", pattern: /\b(?:card|bank|account)\s+(?:is\s+)?from\s+nigeria\b/i },
  { code: "NG", pattern: /\b(?:my\s+card\s+is\s+from|i\s+(?:used|have)\s+(?:a\s+)?card\s+from)\s+nigeria\b/i },
  { code: "US", pattern: /\b(?:u\.s\.|us|american|united states)\s+(?:debit\s+|credit\s+)?(?:card|bank|account)\b/i },
  { code: "US", pattern: /\b(?:card|bank|account)\s+(?:was\s+)?(?:issued|opened|registered|based)\s+in\s+(?:the\s+)?(?:u\.s\.|us|united states)\b/i },
  { code: "US", pattern: /\b(?:card|bank|account)\s+(?:is\s+)?from\s+(?:the\s+)?(?:u\.s\.|us|united states)\b/i },
  { code: "US", pattern: /\b(?:my\s+card\s+is\s+from|i\s+(?:used|have)\s+(?:a\s+)?card\s+from)\s+(?:the\s+)?(?:u\.s\.|us|united states)\b/i },
];

export function extractExplicitJurisdiction(messages: CaseMessageRecord[]): string | undefined {
  const userMessages = messages.filter(({ role }) => role === "user").reverse();
  for (const message of userMessages) {
    const jurisdiction = findJurisdiction(message.content);
    if (jurisdiction) return jurisdiction;
  }
  return undefined;
}

function findJurisdiction(content: string): string | undefined {
  return ISSUING_COUNTRY_PATTERNS.find(({ pattern }) => pattern.test(content))?.code;
}

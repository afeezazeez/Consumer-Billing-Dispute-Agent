import type { ApprovedCaseEmailDraft } from "../../cases/case-email-draft";
import type { CaseNextAction } from "../../cases/case-next-action";
import { stripInternalCitations } from "./strip-internal-citations";

export function parseAgentReply(response: string, options: { allowEmailDraft?: boolean } = {}) {
  const cleanedResponse = stripInternalCitations(removeInternalMessageIds(response)).trim();
  const titleMatch = cleanedResponse.match(/^\[CASE_TITLE\]([^\r\n]*?)\[\/CASE_TITLE\]\s*/i);
  const { reply, nextAction } = extractNextAction(cleanedResponse.slice(titleMatch?.[0].length ?? 0));
  const { answer, emailDraft } = extractEmailDraft(reply, options.allowEmailDraft ?? true);
  if (!answer && !emailDraft) throw new Error("OpenAI returned an empty response");
  return { response: answer, nextAction: emailDraft ? undefined : nextAction, caseTitle: titleMatch?.[1].trim(), emailDraft };
}

function extractNextAction(reply: string): { reply: string; nextAction?: CaseNextAction } {
  const match = reply.match(/^\[NEXT_ACTION\]([\s\S]*?)\[\/NEXT_ACTION\]\s*/);
  if (!match) return { reply };
  return { reply: reply.slice(match[0].length), nextAction: parseNextAction(match[1]) };
}

function parseNextAction(raw: string): CaseNextAction | undefined {
  try {
    const value = JSON.parse(raw) as Partial<CaseNextAction> | null;
    if (typeof value?.goal !== "string" || typeof value.action !== "string") return;
    const goal = value.goal.trim();
    const action = value.action.trim();
    if (goal && goal.length <= 180 && action && action.length <= 600) return { goal, action };
  } catch {
    return undefined;
  }
}

function extractEmailDraft(response: string, allowEmailDraft: boolean): { answer: string; emailDraft?: ApprovedCaseEmailDraft } {
  const match = response.match(/\[EMAIL_DRAFT\]([\s\S]*?)\[\/EMAIL_DRAFT\]/i);
  if (!match) return { answer: response };
  if (!allowEmailDraft) return { answer: response.replace(match[0], "").trim() || "I can help with your billing issue. What would you like to know?" };
  const emailDraft = parseEmailDraftBlock(match[1]);
  return { answer: "", emailDraft };
}

function parseEmailDraftBlock(block: string): ApprovedCaseEmailDraft {
  const lines = block.trim().split(/\r?\n/);
  const subjectIndex = lines.findIndex((line) => /^Subject:\s*/i.test(line.trim()));
  const bodyLines = lines.slice(subjectIndex >= 0 ? subjectIndex + 1 : 2);
  const { body, supportingEvidence } = separateSupportingEvidence(bodyLines);
  return {
    recipients: lines.find((line) => /^To:\s*/i.test(line.trim()))?.replace(/^\s*To:\s*/i, "").trim() ?? "",
    subject: lines[subjectIndex]?.replace(/^\s*Subject:\s*/i, "").trim() ?? "",
    supportingEvidence,
    body,
  };
}

function separateSupportingEvidence(lines: string[]): { body: string; supportingEvidence: string[] } {
  const headingIndex = lines.findIndex(isSupportingEvidenceHeading);
  if (headingIndex < 0) return { body: lines.join("\n").trim(), supportingEvidence: [] };
  const evidenceEnd = findEvidenceEnd(lines, headingIndex + 1);
  const supportingEvidence = lines.slice(headingIndex + 1, evidenceEnd)
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
  const body = [...lines.slice(0, headingIndex), ...lines.slice(evidenceEnd)].join("\n").trim();
  return { body, supportingEvidence };
}

function isSupportingEvidenceHeading(line: string): boolean {
  const normalized = line.trim().replace(/^\*+|\*+$/g, "").replace(/:$/, "").trim();
  return /^(?:supporting evidence(?:\s+for you to attach(?:\s+if available)?)?|evidence to attach|case details used)$/i.test(normalized);
}

function findEvidenceEnd(lines: string[], start: number): number {
  let index = start;
  while (index < lines.length && /^\s*[-•*]\s+/.test(lines[index])) index += 1;
  return index;
}

function removeInternalMessageIds(response: string): string {
  return response.replace(/\bCase message ID:\s*[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/gi, "");
}

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
  const bodyStart = lines.findIndex((line, index) => index > 1 && line.trim() === "");
  const headers = lines.slice(0, bodyStart < 0 ? 2 : bodyStart);
  const evidenceStart = headers.findIndex((line) => /^Supporting evidence:/i.test(line.trim()));
  const supportingEvidence = evidenceStart < 0 ? [] : headers.slice(evidenceStart + 1).map((line) => line.replace(/^\s*[-•]\s*/, "").trim()).filter(Boolean);
  return {
    recipients: headers[0]?.replace(/^To:\s*/i, "").trim() ?? "",
    subject: headers[1]?.replace(/^Subject:\s*/i, "").trim() ?? "",
    supportingEvidence,
    body: lines.slice(bodyStart < 0 ? 2 : bodyStart + 1).join("\n").trim(),
  };
}

function removeInternalMessageIds(response: string): string {
  return response.replace(/\bCase message ID:\s*[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/gi, "");
}

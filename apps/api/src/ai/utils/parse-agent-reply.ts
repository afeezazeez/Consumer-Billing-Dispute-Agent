import type { CaseEmailDraft } from "../../cases/case-intake-agent";
import type { CaseNextAction } from "../../cases/case-next-action";
import { stripInternalCitations } from "./strip-internal-citations";

export function parseAgentReply(response: string) {
  const cleanedResponse = stripInternalCitations(removeInternalMessageIds(response)).trim();
  const titleMatch = cleanedResponse.match(/^\[CASE_TITLE\]([^\r\n]*?)\[\/CASE_TITLE\]\s*/i);
  const { reply, nextAction } = extractNextAction(cleanedResponse.slice(titleMatch?.[0].length ?? 0));
  const { answer, emailDraft } = extractEmailDraft(reply);
  if (!answer && !emailDraft) throw new Error("OpenAI returned an empty response");
  return { response: answer, nextAction, caseTitle: titleMatch?.[1].trim(), emailDraft };
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

function extractEmailDraft(response: string): { answer: string; emailDraft?: CaseEmailDraft } {
  const match = response.match(/\[EMAIL_DRAFT\]\s*To:\s*(.*?)\s*\nSubject:\s*(.*?)\s*\n\s*([\s\S]*?)\s*\[\/EMAIL_DRAFT\]/i);
  if (!match) return { answer: response };
  const emailDraft = { recipients: match[1].trim(), subject: match[2].trim(), body: match[3].trim() };
  return { answer: "", emailDraft };
}

function removeInternalMessageIds(response: string): string {
  return response.replace(/\bCase message ID:\s*[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/gi, "");
}

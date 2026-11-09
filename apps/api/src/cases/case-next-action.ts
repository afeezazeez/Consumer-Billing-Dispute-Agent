export interface CaseNextAction {
  goal: string;
  action: string;
}

export function extractNextAction(reply: string): { reply: string; nextAction?: CaseNextAction } {
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

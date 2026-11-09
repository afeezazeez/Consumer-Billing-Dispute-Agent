import type { AgentTool } from "./agent-tool";
import { RecordCaseIntakeFactsTool } from "./record-case-intake-facts.tool";

export function createCaseAgentTools(): AgentTool[] {
  return [new RecordCaseIntakeFactsTool()];
}

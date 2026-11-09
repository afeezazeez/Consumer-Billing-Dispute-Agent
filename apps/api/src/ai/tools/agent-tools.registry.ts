import type { AgentTool } from "./agent-tool";
import { RecordCaseIntakeFactsTool } from "./record-case-intake-facts.tool";
import { webSearchTool } from "./web-search.tool";

export function createAgentTools(): AgentTool[] {
  return [new RecordCaseIntakeFactsTool(), webSearchTool];
}

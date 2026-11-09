import type { FunctionTool } from "openai/resources/responses/responses";
import type { CaseIntakeState } from "../../../cases/case-intake";
import type { CaseMessageRecord } from "../../../cases/case.repository";

export interface AgentToolContext {
  messages: CaseMessageRecord[];
  intake: CaseIntakeState;
}

export interface AgentToolResult {
  intake: CaseIntakeState;
  output: Record<string, unknown>;
}

export interface AgentTool {
  definition: FunctionTool;
  execute(input: unknown, context: AgentToolContext): Promise<AgentToolResult>;
}

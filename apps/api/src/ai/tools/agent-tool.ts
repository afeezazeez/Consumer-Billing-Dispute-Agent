import type { FunctionTool, WebSearchTool } from "openai/resources/responses/responses";
import type { CaseIntakeState } from "../../cases/case-intake";
import type { CaseMessageRecord } from "../../cases/case.repository";

export interface AgentToolBase {
  label: string;
}

export interface AgentToolContext {
  messages: CaseMessageRecord[];
  intake: CaseIntakeState;
}

export interface AgentToolResult {
  intake: CaseIntakeState;
  output: Record<string, unknown>;
  activity?: { detail?: string; sources?: { title: string; url: string }[] };
}

export interface FunctionAgentTool extends AgentToolBase {
  kind: "function";
  definition: FunctionTool;
  execute(input: unknown, context: AgentToolContext): Promise<AgentToolResult>;
}

export interface HostedAgentTool extends AgentToolBase {
  kind: "hosted";
  definition: WebSearchTool;
}

export type AgentTool = FunctionAgentTool | HostedAgentTool;

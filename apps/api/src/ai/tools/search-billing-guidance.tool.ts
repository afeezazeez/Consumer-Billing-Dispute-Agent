import type { KnowledgeRetrievalService } from "../../knowledge/knowledge-retrieval.service";
import type { FunctionTool } from "openai/resources/responses/responses";
import type { AgentToolContext, AgentToolResult, FunctionAgentTool } from "./agent-tool";
import { extractExplicitJurisdiction } from "../../knowledge/extract-explicit-jurisdiction";

export class SearchBillingGuidanceTool implements FunctionAgentTool {
  readonly kind = "function" as const;
  readonly label = "Searching billing guidance";
  readonly definition: FunctionTool = {
    type: "function", name: "search_billing_guidance",
    description: "Find relevant policy or consumer guidance from the application's curated, refreshed official-source library. Use before giving concrete provider-specific cancellation, refund, or dispute steps.",
    strict: true,
    parameters: { type: "object", properties: { query: { type: "string", minLength: 3, maxLength: 500 } }, required: ["query"], additionalProperties: false },
  };

  constructor(private readonly knowledgeRetrievalService: KnowledgeRetrievalService) {}
  async execute(input: unknown, context: AgentToolContext): Promise<AgentToolResult> {
    const query = (input as { query?: unknown })?.query;
    if (typeof query !== "string" || query.trim().length < 3 || query.length > 500) {
      return { intake: context.intake, output: { success: false, message: "Search query was invalid." } };
    }
    const jurisdictionCode = extractExplicitJurisdiction(context.messages);
    const matches = await this.knowledgeRetrievalService.search(query.trim(), jurisdictionCode);
    const sources = uniqueSources(matches.map(({ title, url }) => ({ title, url })));
    return {
      intake: context.intake,
      output: { success: true, results: matches.map(({ title, url, jurisdictionScope, jurisdictionCode, content }) => ({ title, url, jurisdiction: jurisdictionScope, jurisdictionCode, excerpt: content })) },
      activity: { detail: describeSources(sources.length), sources },
    };
  }
}

function describeSources(count: number): string {
  if (count === 0) return "No sufficiently relevant guidance sources matched";
  return `Found guidance from ${count} official source${count === 1 ? "" : "s"}`;
}

function uniqueSources(sources: { title: string; url: string }[]) {
  return sources.filter((source, index) => sources.findIndex(({ url }) => url === source.url) === index);
}

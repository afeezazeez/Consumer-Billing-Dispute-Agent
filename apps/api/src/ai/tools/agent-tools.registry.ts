import type { AgentTool } from "./agent-tool";
import { RecordCaseIntakeFactsTool } from "./record-case-intake-facts.tool";
import { webSearchTool } from "./web-search.tool";
import { SearchBillingGuidanceTool } from "./search-billing-guidance.tool";
import type { KnowledgeRetrievalService } from "../../knowledge/knowledge-retrieval.service";

export function createAgentTools(knowledgeRetrievalService: KnowledgeRetrievalService): AgentTool[] {
  return [new RecordCaseIntakeFactsTool(), new SearchBillingGuidanceTool(knowledgeRetrievalService), webSearchTool];
}

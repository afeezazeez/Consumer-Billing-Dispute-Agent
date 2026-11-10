export type BackgroundJob = AgentTurnQueueJob | RefreshDueSourcesQueueJob | RefreshKnowledgeSourceQueueJob;

export interface AgentTurnQueueJob {
  type: "agent-turn";
  userId: string;
  caseId: string;
  messageId: string;
}

export interface RefreshDueSourcesQueueJob {
  type: "refresh-due-knowledge-sources";
}

export interface RefreshKnowledgeSourceQueueJob {
  type: "refresh-knowledge-source";
  sourceKey: string;
}

export const BACKGROUND_QUEUE_NAME = "billing-agent-jobs";

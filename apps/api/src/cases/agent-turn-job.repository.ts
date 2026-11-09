export interface AgentTurnJob {
  id: string;
  userId: string;
  caseId: string;
  messageId: string;
}

export interface AgentTurnJobRepository {
  claimNext(): Promise<AgentTurnJob | undefined>;
  extendLease(jobId: string): Promise<void>;
  complete(jobId: string): Promise<void>;
  fail(jobId: string): Promise<void>;
}

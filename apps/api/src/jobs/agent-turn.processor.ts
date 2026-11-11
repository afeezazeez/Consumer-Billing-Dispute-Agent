import type { UserRepository } from "../auth/user.repository";
import type { CaseService } from "../cases/case.service";
import type { CaseMessageRecord } from "../cases/case.repository";
import type { AgentTurnQueueJob } from "./job.types";

export class AgentTurnProcessor {
  constructor(
    private readonly caseService: CaseService,
    private readonly userRepository: UserRepository,
    private readonly clearWorkflowCheckpoint: (caseId: string, messageId: string) => Promise<void>,
  ) {}
  async process(job: AgentTurnQueueJob): Promise<void> {
    const billingCase = await this.caseService.findCase(job.userId, job.caseId);
    const message = billingCase?.messages.find((item) => item.id === job.messageId);
    if (!message || message.role !== "user") return;
    if (message.processingStatus !== "pending") return this.clearCompletedTurn(message.processingStatus, job);
    const user = await this.userRepository.findById(job.userId);
    await this.caseService.processAgentTurn(job, user?.displayName.split(/\s+/)[0]);
    await this.clearWorkflowCheckpoint(job.caseId, job.messageId);
  }
  async fail(job: AgentTurnQueueJob): Promise<void> {
    await this.caseService.failAgentTurn(job.userId, job.caseId, job.messageId);
  }

  private async clearCompletedTurn(status: CaseMessageRecord["processingStatus"], job: AgentTurnQueueJob): Promise<void> {
    if (status === "complete") await this.clearWorkflowCheckpoint(job.caseId, job.messageId);
  }
}

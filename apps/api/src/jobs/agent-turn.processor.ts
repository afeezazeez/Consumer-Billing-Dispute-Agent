import type { UserRepository } from "../auth/user.repository";
import type { CaseService } from "../cases/case.service";
import type { AgentTurnQueueJob } from "./job.types";

export class AgentTurnProcessor {
  constructor(private readonly caseService: CaseService, private readonly userRepository: UserRepository) {}
  async process(job: AgentTurnQueueJob): Promise<void> {
    const billingCase = await this.caseService.findCase(job.userId, job.caseId);
    const message = billingCase?.messages.find((item) => item.id === job.messageId);
    if (!message || message.role !== "user" || message.processingStatus !== "pending") return;
    const user = await this.userRepository.findById(job.userId);
    await this.caseService.processAgentTurn(job, user?.displayName.split(/\s+/)[0]);
  }
  async fail(job: AgentTurnQueueJob): Promise<void> {
    await this.caseService.failAgentTurn(job.userId, job.caseId, job.messageId);
  }
}

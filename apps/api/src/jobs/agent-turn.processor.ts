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
  async process(job: AgentTurnQueueJob, signal?: AbortSignal): Promise<void> {
    const billingCase = await this.caseService.findCase(job.userId, job.caseId);
    const message = billingCase?.messages.find((item) => item.id === job.messageId);
    if (!message || message.role !== "user") return;
    if (message.processingStatus !== "pending") return this.clearCompletedTurn(message.processingStatus, job);
    try {
      const user = await this.userRepository.findById(job.userId);
      const completedCase = await this.caseService.processAgentTurn(job, user?.displayName.split(/\s+/)[0], signal);
      if (!hasPendingEmailApproval(completedCase, job.messageId)) await this.clearWorkflowCheckpoint(job.caseId, job.messageId);
    } catch (error) {
      if (!signal?.aborted && !isAbortError(error)) throw error;
      await this.clearWorkflowCheckpoint(job.caseId, job.messageId);
    }
  }
  async fail(job: AgentTurnQueueJob): Promise<void> {
    await this.caseService.failAgentTurn(job.userId, job.caseId, job.messageId);
  }

  private async clearCompletedTurn(status: CaseMessageRecord["processingStatus"], job: AgentTurnQueueJob): Promise<void> {
    if (status === "complete" || status === "cancelled") await this.clearWorkflowCheckpoint(job.caseId, job.messageId);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function hasPendingEmailApproval(billingCase: Awaited<ReturnType<CaseService["processAgentTurn"]>>, messageId: string): boolean {
  return billingCase?.messages.some((message) =>
    message.role === "assistant" && message.emailDraft?.status === "waiting_approval" &&
    new Date(message.createdAt).getTime() > (billingCase.messages.find((item) => item.id === messageId)?.createdAt.getTime() ?? 0),
  ) ?? false;
}

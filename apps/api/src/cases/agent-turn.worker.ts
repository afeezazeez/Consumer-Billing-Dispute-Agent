import type { UserRepository } from "../auth/user.repository";
import type { AgentTurnJob, AgentTurnJobRepository } from "./agent-turn-job.repository";
import type { CaseService } from "./case.service";

const POLL_INTERVAL_MS = 500;
const LEASE_REFRESH_INTERVAL_MS = 30_000;
const MAX_CONCURRENT_TURNS = 3;

export class AgentTurnWorker {
  private isRunning = false;
  private activeTurnCount = 0;

  constructor(
    private readonly agentTurnJobRepository: AgentTurnJobRepository,
    private readonly caseService: CaseService,
    private readonly userRepository: UserRepository,
  ) {}

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    void this.run();
  }

  private async run(): Promise<void> {
    while (this.isRunning) {
      if (this.activeTurnCount >= MAX_CONCURRENT_TURNS) {
        await delay(POLL_INTERVAL_MS);
        continue;
      }
      const job = await this.agentTurnJobRepository.claimNext().catch(() => undefined);
      if (!job) {
        await delay(POLL_INTERVAL_MS);
        continue;
      }
      this.activeTurnCount += 1;
      void this.process(job).finally(() => { this.activeTurnCount -= 1; });
    }
  }

  private async process(job: AgentTurnJob): Promise<void> {
    const heartbeat = setInterval(() => void this.agentTurnJobRepository.extendLease(job.id).catch(() => undefined), LEASE_REFRESH_INTERVAL_MS);
    try {
      const user = await this.userRepository.findById(job.userId);
      await this.caseService.processAgentTurn(job, user?.displayName.split(/\s+/)[0]);
      await this.agentTurnJobRepository.complete(job.id);
    } catch {
      await this.agentTurnJobRepository.fail(job.id).catch(() => undefined);
    } finally {
      clearInterval(heartbeat);
    }
  }
}

function delay(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

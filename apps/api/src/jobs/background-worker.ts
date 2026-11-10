import { randomUUID } from "node:crypto";
import { DelayedError, Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import type { DataSource } from "typeorm";
import type { AppConfig } from "../config";
import { createCaseServices } from "../cases/case-services";
import { CaseTurnLockRepository } from "../database/case-turn-lock.repository";
import { BACKGROUND_QUEUE_NAME, type BackgroundJob } from "./job.types";
import { AgentTurnProcessor } from "./agent-turn.processor";
import { BackgroundJobQueue } from "./background-job-queue";
import { OutboxDispatcher } from "./outbox-dispatcher";
import { OutboxRepository } from "./outbox.repository";

export class BackgroundWorker {
  private readonly worker: Worker<BackgroundJob>;
  private readonly dispatcher: OutboxDispatcher;
  private readonly backgroundJobQueue: BackgroundJobQueue;
  private readonly caseTurnLockRepository: CaseTurnLockRepository;
  private readonly caseServices: ReturnType<typeof createCaseServices>;
  private readonly agentTurnProcessor: AgentTurnProcessor;

  constructor(redis: Redis, dataSource: DataSource, config: AppConfig) {
    this.caseServices = createCaseServices(config, dataSource);
    this.agentTurnProcessor = new AgentTurnProcessor(this.caseServices.caseService, this.caseServices.userRepository);
    this.backgroundJobQueue = new BackgroundJobQueue(redis);
    this.dispatcher = new OutboxDispatcher(new OutboxRepository(dataSource), this.backgroundJobQueue);
    this.caseTurnLockRepository = new CaseTurnLockRepository(dataSource);
    this.worker = new Worker<BackgroundJob>(BACKGROUND_QUEUE_NAME, (job) => this.process(job), {
      connection: redis, concurrency: 3, limiter: { max: 10, duration: 1_000 },
    });
    this.worker.on("failed", (job) => void this.handleFinalFailure(job));
  }

  async start(): Promise<void> {
    await this.backgroundJobQueue.scheduleKnowledgeRefresh();
    await this.backgroundJobQueue.enqueueInitialKnowledgeRefresh();
    this.dispatcher.start();
  }
  async close(): Promise<void> {
    await this.dispatcher.stop();
    await this.worker.close();
    await this.backgroundJobQueue.close();
  }
  private async process(job: Job<BackgroundJob>): Promise<void> {
    if (job.data.type === "agent-turn") return this.processAgentTurn(job as Job<Extract<BackgroundJob, { type: "agent-turn" }>>);
    if (job.data.type === "refresh-due-knowledge-sources") return this.enqueueDueSources();
    await this.caseServices.knowledgeSourceRefreshService.refresh(job.data.sourceKey);
  }

  private async enqueueDueSources(): Promise<void> {
    const sources = await this.caseServices.knowledgeSourceRepository.findDueForRefresh(new Date());
    const slot = new Date().toISOString().slice(0, 16);
    for (const source of sources) await this.backgroundJobQueue.enqueueRefreshSource(source.key, slot);
  }

  private async processAgentTurn(job: Job<Extract<BackgroundJob, { type: "agent-turn" }>>): Promise<void> {
    const owner = randomUUID();
    if (!(await this.caseTurnLockRepository.acquire(job.data.caseId, job.data.messageId, owner))) {
      await job.moveToDelayed(Date.now() + 1_000, job.token);
      throw new DelayedError();
    }
    const heartbeat = setInterval(() => void this.caseTurnLockRepository.heartbeat(job.data.caseId, owner).catch(() => undefined), 20_000);
    try { await this.agentTurnProcessor.process(job.data); }
    finally { clearInterval(heartbeat); await this.caseTurnLockRepository.release(job.data.caseId, owner); }
  }
  private async handleFinalFailure(job: Job<BackgroundJob> | undefined): Promise<void> {
    if (!job || job.data.type !== "agent-turn" || job.attemptsMade < Number(job.opts.attempts ?? 1)) return;
    await this.agentTurnProcessor.fail(job.data).catch(() => undefined);
  }
}

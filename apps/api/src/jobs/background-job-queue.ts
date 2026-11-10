import { Queue } from "bullmq";
import { BACKGROUND_QUEUE_NAME, type BackgroundJob } from "./job.types";

export class BackgroundJobQueue {
  private readonly queue: Queue<BackgroundJob>;

  constructor(connection: import("ioredis").default) {
    this.queue = new Queue<BackgroundJob>(BACKGROUND_QUEUE_NAME, { connection });
  }

  async enqueue(id: string, job: BackgroundJob): Promise<void> {
    await this.queue.add(job.type, job, { jobId: id, attempts: 4, backoff: { type: "exponential", delay: 2_000 }, removeOnComplete: 500, removeOnFail: 2_000 });
  }

  async enqueueInitialKnowledgeRefresh(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await this.queue.add("refresh-due-knowledge-sources", { type: "refresh-due-knowledge-sources" }, { jobId: `knowledge-refresh-bootstrap-${today}`, attempts: 4, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 100 });
  }

  async scheduleKnowledgeRefresh(): Promise<void> {
    await this.queue.upsertJobScheduler(
      "retry-due-knowledge-sources",
      { every: 5 * 60_000 },
      { name: "refresh-due-knowledge-sources", data: { type: "refresh-due-knowledge-sources" }, opts: { attempts: 4, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 100 } },
    );
    await this.queue.upsertJobScheduler(
      "daily-knowledge-source-refresh",
      { pattern: "0 2 * * *", tz: "UTC" },
      { name: "refresh-due-knowledge-sources", data: { type: "refresh-due-knowledge-sources" }, opts: { attempts: 4, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 100 } },
    );
  }

  async enqueueRefreshSource(sourceKey: string, refreshSlot: string): Promise<void> {
    const id = `refresh-${sourceKey}-${sanitizeJobId(refreshSlot)}`;
    await this.queue.add("refresh-knowledge-source", { type: "refresh-knowledge-source", sourceKey }, { jobId: id, attempts: 4, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 500, removeOnFail: 2_000 });
  }

  close(): Promise<void> { return this.queue.close(); }
}

function sanitizeJobId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

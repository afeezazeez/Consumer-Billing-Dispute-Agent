import type { BackgroundJobQueue } from "./background-job-queue";
import type { OutboxRepository } from "./outbox.repository";

export class OutboxDispatcher {
  private timer?: NodeJS.Timeout;
  private running = false;
  private dispatching = false;
  private readonly lastLoggedByStage = new Map<string, number>();
  constructor(private readonly outboxRepository: OutboxRepository, private readonly backgroundJobQueue: BackgroundJobQueue) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.dispatch();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    while (this.dispatching) await new Promise((resolve) => setTimeout(resolve, 20));
  }

  private async dispatch(): Promise<void> {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      const events = await this.outboxRepository.claimBatch(20);
      for (const event of events) await this.publish(event.id, event.job);
    } catch (error) {
      this.logFailure("claim_batch", error);
    } finally {
      this.dispatching = false;
      if (this.running) this.timer = setTimeout(() => void this.dispatch(), 500);
    }
  }

  private async publish(id: string, job: import("./job.types").BackgroundJob): Promise<void> {
    try {
      await this.backgroundJobQueue.enqueue(id, job);
    } catch (error) {
      this.logFailure("queue_publish", error);
      await this.outboxRepository.release(id).catch((releaseError: unknown) =>
        this.logFailure("release_outbox", releaseError));
      return;
    }
    try {
      await this.outboxRepository.markPublished(id);
    } catch (error) {
      this.logFailure("mark_published", error);
      await this.outboxRepository.release(id).catch((releaseError: unknown) =>
        this.logFailure("release_outbox", releaseError));
    }
  }

  private logFailure(stage: string, error: unknown): void {
    if (!shouldLogFailure(this.lastLoggedByStage, stage)) return;
    const errorType = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? sanitizeErrorMessage(error.message) : "Unknown failure";
    console.error(JSON.stringify({ event: "outbox_dispatch_failed", stage, errorType, errorMessage }));
  }
}

function shouldLogFailure(loggedAt: Map<string, number>, stage: string): boolean {
  const now = Date.now();
  if (now - (loggedAt.get(stage) ?? 0) < 30_000) return false;
  loggedAt.set(stage, now);
  return true;
}

function sanitizeErrorMessage(message: string): string {
  return message.replace(/[0-9a-f-]{36}/gi, "[id]").slice(0, 160);
}

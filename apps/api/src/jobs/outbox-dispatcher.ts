import type { BackgroundJobQueue } from "./background-job-queue";
import type { OutboxRepository } from "./outbox.repository";

export class OutboxDispatcher {
  private timer?: NodeJS.Timeout;
  private running = false;
  private dispatching = false;
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
    } catch {
      // The durable outbox remains pending; try it again on the next pass.
    } finally {
      this.dispatching = false;
      if (this.running) this.timer = setTimeout(() => void this.dispatch(), 500);
    }
  }

  private async publish(id: string, job: import("./job.types").BackgroundJob): Promise<void> {
    try {
      await this.backgroundJobQueue.enqueue(id, job);
      await this.outboxRepository.markPublished(id);
    } catch {
      await this.outboxRepository.release(id).catch(() => undefined);
    }
  }
}

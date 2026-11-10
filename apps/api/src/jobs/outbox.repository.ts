import type { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import type { BackgroundJob } from "./job.types";

export interface OutboxEvent { id: string; job: BackgroundJob; }

export class OutboxRepository {
  constructor(private readonly dataSource: DataSource) {}

  async enqueue(manager: { query(query: string, parameters?: unknown[]): Promise<unknown> }, job: BackgroundJob): Promise<void> {
    await manager.query(
      "INSERT INTO background_job_outbox (id, job_type, payload) VALUES ($1, $2, $3::jsonb)",
      [randomUUID(), job.type, JSON.stringify(job)],
    );
  }

  async claimBatch(limit: number): Promise<OutboxEvent[]> {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `WITH candidates AS (
           SELECT id FROM background_job_outbox WHERE status IN ('pending', 'publishing') AND available_at <= NOW()
             AND (locked_until IS NULL OR locked_until < NOW()) ORDER BY created_at
             FOR UPDATE SKIP LOCKED LIMIT $1
         ) UPDATE background_job_outbox AS event SET status = 'publishing', locked_until = NOW() + INTERVAL '60 seconds', attempts = attempts + 1
           FROM candidates WHERE event.id = candidates.id RETURNING event.id, event.payload AS job`, [limit],
      ) as { id: string; job: BackgroundJob }[];
      return rows.map((row) => ({ id: row.id, job: row.job }));
    });
  }

  async markPublished(id: string): Promise<void> {
    await this.dataSource.query("UPDATE background_job_outbox SET status = 'published', published_at = NOW(), locked_until = NULL WHERE id = $1", [id]);
  }

  async release(id: string): Promise<void> {
    await this.dataSource.query(
      "UPDATE background_job_outbox SET status = 'pending', last_error_code = 'REDIS_PUBLISH_FAILED', locked_until = NULL, available_at = NOW() + LEAST(INTERVAL '5 minutes', INTERVAL '2 seconds' * power(2, LEAST(attempts, 7))) WHERE id = $1",
      [id],
    );
  }
}

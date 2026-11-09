import type { DataSource } from "typeorm";
import type { AgentTurnJob, AgentTurnJobRepository } from "../cases/agent-turn-job.repository";
import { AgentTurnJobEntity, CaseMessageEntity } from "./entities/case.entity";

export class TypeOrmAgentTurnJobRepository implements AgentTurnJobRepository {
  constructor(private readonly dataSource: DataSource) {}

  async claimNext(): Promise<AgentTurnJob | undefined> {
    const rows = await this.dataSource.query(`
      WITH next_job AS (
        SELECT id FROM agent_turn_jobs
        WHERE (status = 'queued' OR (status = 'running' AND locked_until < NOW()))
        AND NOT EXISTS (
          SELECT 1 FROM agent_turn_jobs AS active
          WHERE active.case_id = agent_turn_jobs.case_id
          AND active.status = 'running'
          AND active.locked_until > NOW()
          AND active.id <> agent_turn_jobs.id
        )
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE agent_turn_jobs AS jobs
      SET status = 'running', locked_until = NOW() + INTERVAL '2 minutes', updated_at = NOW()
      FROM next_job
      WHERE jobs.id = next_job.id
      RETURNING jobs.id, jobs.user_id AS "userId", jobs.case_id AS "caseId", jobs.message_id AS "messageId"
    `) as AgentTurnJob[];
    return rows[0];
  }

  async extendLease(jobId: string): Promise<void> {
    await this.dataSource.query(
      "UPDATE agent_turn_jobs SET locked_until = NOW() + INTERVAL '2 minutes', updated_at = NOW() WHERE id = $1 AND status = 'running'",
      [jobId],
    );
  }

  async complete(jobId: string): Promise<void> {
    await this.finish(jobId, "completed");
  }

  async fail(jobId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const job = await manager.getRepository(AgentTurnJobEntity).findOneBy({ id: jobId });
      if (!job) return;
      await manager.getRepository(CaseMessageEntity).update(
        { id: job.messageId, caseId: job.caseId, role: "user", processingStatus: "pending" },
        { processingStatus: "failed" },
      );
      await manager.getRepository(AgentTurnJobEntity).update(
        { id: jobId },
        { status: "failed", lockedUntil: null, updatedAt: new Date() },
      );
    });
  }

  private async finish(jobId: string, status: "completed" | "failed"): Promise<void> {
    await this.dataSource.query(
      "UPDATE agent_turn_jobs SET status = $2, locked_until = NULL, updated_at = NOW() WHERE id = $1",
      [jobId, status],
    );
  }
}

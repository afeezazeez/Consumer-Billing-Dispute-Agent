import type { DataSource } from "typeorm";

export class CaseTurnLockRepository {
  constructor(private readonly dataSource: DataSource) {}

  async acquire(caseId: string, messageId: string, owner: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `INSERT INTO case_turn_locks (case_id, owner, locked_until)
       SELECT $1, $3, NOW() + INTERVAL '60 seconds' WHERE NOT EXISTS (
         SELECT 1 FROM case_messages current_message
         JOIN case_messages earlier_message ON earlier_message.case_id = current_message.case_id
           AND earlier_message.role = 'user' AND earlier_message.processing_status = 'pending'
           AND (earlier_message.created_at, earlier_message.id) < (current_message.created_at, current_message.id)
         WHERE current_message.id = $2 AND current_message.case_id = $1
       )
       ON CONFLICT (case_id) DO UPDATE SET owner = EXCLUDED.owner, locked_until = EXCLUDED.locked_until
       WHERE case_turn_locks.locked_until < NOW() OR case_turn_locks.owner = EXCLUDED.owner RETURNING case_id`,
      [caseId, messageId, owner],
    ) as { case_id: string }[];
    return rows.length > 0;
  }

  async heartbeat(caseId: string, owner: string): Promise<void> {
    await this.dataSource.query(
      "UPDATE case_turn_locks SET locked_until = NOW() + INTERVAL '60 seconds' WHERE case_id = $1 AND owner = $2",
      [caseId, owner],
    );
  }

  async release(caseId: string, owner: string): Promise<void> {
    await this.dataSource.query(
      "DELETE FROM case_turn_locks WHERE case_id = $1 AND owner = $2",
      [caseId, owner],
    );
  }
}

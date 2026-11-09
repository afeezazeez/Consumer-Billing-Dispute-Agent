import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAgentTurnJobs1710000000005 implements MigrationInterface {
  name = "CreateAgentTurnJobs1710000000005";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE case_messages ADD COLUMN email_draft jsonb NULL;
      CREATE TABLE agent_turn_jobs (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        case_id uuid NOT NULL REFERENCES billing_cases(id) ON DELETE CASCADE,
        message_id uuid NOT NULL UNIQUE REFERENCES case_messages(id) ON DELETE CASCADE,
        status varchar(16) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
        locked_until timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );
      CREATE INDEX agent_turn_jobs_claim_idx ON agent_turn_jobs(status, created_at);
      INSERT INTO agent_turn_jobs (id, user_id, case_id, message_id, status)
      SELECT gen_random_uuid(), cases.user_id, messages.case_id, messages.id, 'queued'
      FROM case_messages AS messages
      JOIN billing_cases AS cases ON cases.id = messages.case_id
      WHERE messages.role = 'user' AND messages.processing_status = 'pending'
      ON CONFLICT (message_id) DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE agent_turn_jobs; ALTER TABLE case_messages DROP COLUMN email_draft");
  }
}

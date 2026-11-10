import type { MigrationInterface, QueryRunner } from "typeorm";

export class ReplaceAgentQueueWithOutbox1710000000015 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE background_job_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        job_type varchar(80) NOT NULL,
        payload jsonb NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published')),
        attempts integer NOT NULL DEFAULT 0,
        available_at timestamptz NOT NULL DEFAULT NOW(),
        locked_until timestamptz,
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );
      CREATE INDEX background_job_outbox_pending_idx ON background_job_outbox(status, available_at, created_at);
      INSERT INTO background_job_outbox (job_type, payload)
      SELECT 'agent-turn', jsonb_build_object('type', 'agent-turn', 'userId', jobs.user_id, 'caseId', jobs.case_id, 'messageId', jobs.message_id)
      FROM agent_turn_jobs jobs
      JOIN case_messages messages ON messages.id = jobs.message_id
      WHERE messages.role = 'user' AND messages.processing_status = 'pending'
      ON CONFLICT DO NOTHING;
      DROP TABLE agent_turn_jobs;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE agent_turn_jobs (
        id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        case_id uuid NOT NULL REFERENCES billing_cases(id) ON DELETE CASCADE,
        message_id uuid NOT NULL UNIQUE REFERENCES case_messages(id) ON DELETE CASCADE,
        status varchar(16) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
        locked_until timestamptz, created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
      );
      INSERT INTO agent_turn_jobs (id, user_id, case_id, message_id, status)
      SELECT gen_random_uuid(), cases.user_id, messages.case_id, messages.id, 'queued'
      FROM case_messages messages JOIN billing_cases cases ON cases.id = messages.case_id
      WHERE messages.role = 'user' AND messages.processing_status = 'pending'
      ON CONFLICT (message_id) DO NOTHING;
      DROP TABLE background_job_outbox;
    `);
  }
}

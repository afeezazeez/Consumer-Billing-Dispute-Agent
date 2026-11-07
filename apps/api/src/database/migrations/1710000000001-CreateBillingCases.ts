import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBillingCases1710000000001 implements MigrationInterface {
  name = "CreateBillingCases1710000000001";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE billing_cases (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title varchar(140) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_billing_cases_user_updated
      ON billing_cases (user_id, updated_at DESC)
    `);
    await queryRunner.query(`
      CREATE TABLE case_messages (
        id uuid PRIMARY KEY,
        case_id uuid NOT NULL REFERENCES billing_cases(id) ON DELETE CASCADE,
        role varchar(12) NOT NULL CHECK (role IN ('user', 'assistant')),
        content text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_case_messages_case_created
      ON case_messages (case_id, created_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE case_messages");
    await queryRunner.query("DROP TABLE billing_cases");
  }
}

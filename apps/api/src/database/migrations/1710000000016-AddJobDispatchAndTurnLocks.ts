import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobDispatchAndTurnLocks1710000000016 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE background_job_outbox ADD COLUMN last_error_code varchar(80);
      CREATE TABLE case_turn_locks (
        case_id uuid PRIMARY KEY REFERENCES billing_cases(id) ON DELETE CASCADE,
        owner uuid NOT NULL,
        locked_until timestamptz NOT NULL
      );
      CREATE INDEX case_turn_locks_expiry_idx ON case_turn_locks(locked_until);
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE case_turn_locks; ALTER TABLE background_job_outbox DROP COLUMN last_error_code;");
  }
}

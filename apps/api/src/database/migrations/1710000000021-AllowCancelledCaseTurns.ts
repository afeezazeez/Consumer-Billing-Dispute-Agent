import type { MigrationInterface, QueryRunner } from "typeorm";

export class AllowCancelledCaseTurns1710000000021 implements MigrationInterface {
  name = "AllowCancelledCaseTurns1710000000021";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE case_messages DROP CONSTRAINT IF EXISTS case_messages_processing_status_check");
    await queryRunner.query(`ALTER TABLE case_messages ADD CONSTRAINT case_messages_processing_status_check
      CHECK (processing_status IN ('pending', 'complete', 'failed', 'cancelled'))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("UPDATE case_messages SET processing_status = 'failed' WHERE processing_status = 'cancelled'");
    await queryRunner.query("ALTER TABLE case_messages DROP CONSTRAINT IF EXISTS case_messages_processing_status_check");
    await queryRunner.query(`ALTER TABLE case_messages ADD CONSTRAINT case_messages_processing_status_check
      CHECK (processing_status IN ('pending', 'complete', 'failed'))`);
  }
}

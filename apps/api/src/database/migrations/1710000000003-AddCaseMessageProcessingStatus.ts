import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCaseMessageProcessingStatus1710000000003 implements MigrationInterface {
  name = "AddCaseMessageProcessingStatus1710000000003";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE case_messages
      ADD COLUMN processing_status varchar(16) NOT NULL DEFAULT 'complete'
      CHECK (processing_status IN ('pending', 'complete', 'failed'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE case_messages DROP COLUMN processing_status");
  }
}

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMessageNextAction1710000000012 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE case_messages ADD COLUMN next_action jsonb");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE case_messages DROP COLUMN next_action");
  }
}

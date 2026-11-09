import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCaseNextAction1710000000007 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE billing_cases ADD COLUMN next_action jsonb");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE billing_cases DROP COLUMN next_action");
  }
}

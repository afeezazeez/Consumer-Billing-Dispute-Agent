import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCaseIntakeState1710000000002 implements MigrationInterface {
  name = "AddCaseIntakeState1710000000002";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE billing_cases
      ADD COLUMN intake_state jsonb NOT NULL
      DEFAULT '{"status":"collecting","facts":{}}'::jsonb
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE billing_cases DROP COLUMN intake_state");
  }
}

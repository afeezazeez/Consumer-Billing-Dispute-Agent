import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentMessageSourcesAndActivities1710000000004 implements MigrationInterface {
  name = "AddAgentMessageSourcesAndActivities1710000000004";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE case_messages
      ADD COLUMN sources jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN tool_activities jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE case_messages
      DROP COLUMN tool_activities,
      DROP COLUMN sources
    `);
  }
}

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentTurnDurationToCaseMessages1710000000020 implements MigrationInterface {
  name = "AddAgentTurnDurationToCaseMessages1710000000020";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE case_messages
      ADD COLUMN agent_turn_duration_ms integer
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE case_messages DROP COLUMN agent_turn_duration_ms");
  }
}

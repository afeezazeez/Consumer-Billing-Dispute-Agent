import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddProvisionalCaseTitle1710000000006 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE billing_cases ADD COLUMN title_is_provisional boolean NOT NULL DEFAULT false");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE billing_cases DROP COLUMN title_is_provisional");
  }
}

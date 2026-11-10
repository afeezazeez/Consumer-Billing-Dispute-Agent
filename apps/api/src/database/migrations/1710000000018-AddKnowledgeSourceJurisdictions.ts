import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddKnowledgeSourceJurisdictions1710000000018 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE knowledge_sources ADD COLUMN jurisdiction_code varchar(2);
      UPDATE knowledge_sources SET jurisdiction_code = 'US' WHERE key = 'us-cfpb-card-charge-dispute';
      UPDATE knowledge_sources SET jurisdiction_code = 'NG' WHERE key = 'ng-cbn-financial-complaints';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE knowledge_sources DROP COLUMN jurisdiction_code");
  }
}

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddNigeriaConsumerGuidance1710000000017 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO knowledge_sources (key, provider, title, url, jurisdiction_scope)
      VALUES (
        'ng-cbn-financial-complaints',
        'Central Bank of Nigeria',
        'How to complain about a regulated financial institution',
        'https://www.cbn.gov.ng/FinInc/FinLit/LodgeComplaint.html',
        'Nigeria; CBN-regulated financial institutions only'
      )
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM knowledge_sources WHERE key = 'ng-cbn-financial-complaints'");
  }
}

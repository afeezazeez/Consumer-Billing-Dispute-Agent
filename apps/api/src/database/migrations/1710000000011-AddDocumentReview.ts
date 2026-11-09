import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentReview1710000000011 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE case_attachments ADD COLUMN document_review jsonb,
        ADD COLUMN review_claim uuid, ADD COLUMN review_started_at timestamptz;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE case_attachments DROP COLUMN document_review, DROP COLUMN review_claim, DROP COLUMN review_started_at");
  }
}

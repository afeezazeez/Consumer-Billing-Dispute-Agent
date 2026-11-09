import type { MigrationInterface, QueryRunner } from "typeorm";

export class StageCaseAttachments1710000000010 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE case_attachments
        ALTER COLUMN message_id DROP NOT NULL,
        ADD COLUMN staged_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        ADD COLUMN staged_until timestamptz,
        ADD CONSTRAINT case_attachment_stage_check CHECK (
          (message_id IS NOT NULL AND staged_user_id IS NULL AND staged_until IS NULL)
          OR (message_id IS NULL AND staged_user_id IS NOT NULL AND staged_until IS NOT NULL)
        );
      CREATE INDEX case_attachment_expiry_idx ON case_attachments(staged_until) WHERE message_id IS NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM case_attachments WHERE message_id IS NULL;
      DROP INDEX case_attachment_expiry_idx;
      ALTER TABLE case_attachments DROP CONSTRAINT case_attachment_stage_check,
        DROP COLUMN staged_user_id, DROP COLUMN staged_until, ALTER COLUMN message_id SET NOT NULL;
    `);
  }
}

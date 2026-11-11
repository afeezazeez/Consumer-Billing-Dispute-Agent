import type { MigrationInterface, QueryRunner } from "typeorm";

export class StoreCaseAttachmentsInCloudinary1710000000009 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE case_attachments ALTER COLUMN data DROP NOT NULL,
        ADD COLUMN cloudinary_public_id text,
        ADD CONSTRAINT case_attachments_storage_check
          CHECK ((data IS NULL) <> (cloudinary_public_id IS NULL));
      CREATE TABLE case_attachment_cleanup (public_id text PRIMARY KEY);
      CREATE OR REPLACE FUNCTION queue_case_attachment_cleanup() RETURNS trigger AS $$
      BEGIN
        IF OLD.cloudinary_public_id IS NOT NULL THEN
          INSERT INTO case_attachment_cleanup(public_id) VALUES (OLD.cloudinary_public_id)
          ON CONFLICT DO NOTHING;
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER case_attachment_cleanup_on_delete
      AFTER DELETE ON case_attachments FOR EACH ROW EXECUTE FUNCTION queue_case_attachment_cleanup();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE case_attachments ALTER COLUMN data SET NOT NULL;
      DROP TRIGGER case_attachment_cleanup_on_delete ON case_attachments;
      DROP FUNCTION queue_case_attachment_cleanup();
      DROP TABLE case_attachment_cleanup;
      ALTER TABLE case_attachments DROP CONSTRAINT case_attachments_storage_check,
        DROP COLUMN cloudinary_public_id;
    `);
  }
}

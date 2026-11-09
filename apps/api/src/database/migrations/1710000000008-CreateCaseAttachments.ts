import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCaseAttachments1710000000008 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE case_attachments (
        id uuid PRIMARY KEY,
        message_id uuid NOT NULL REFERENCES case_messages(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        media_type varchar(32) NOT NULL,
        size integer NOT NULL CHECK (size > 0 AND size <= 10485760),
        data bytea NOT NULL
      );
      CREATE INDEX case_attachments_message_idx ON case_attachments(message_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE case_attachments");
  }
}

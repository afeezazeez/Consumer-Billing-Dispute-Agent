import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGmailConnectors1710000000019 implements MigrationInterface {
  name = "CreateGmailConnectors1710000000019";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE gmail_connectors (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        google_subject varchar(255) NOT NULL,
        google_email varchar(320) NOT NULL,
        encrypted_refresh_token text NOT NULL,
        encryption_iv varchar(32) NOT NULL,
        encryption_auth_tag varchar(32) NOT NULL,
        connected_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE gmail_connectors");
  }
}

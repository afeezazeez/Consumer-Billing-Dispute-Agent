import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsers1710000000000 implements MigrationInterface {
  name = "CreateUsers1710000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        google_subject varchar(255) NOT NULL UNIQUE,
        email varchar(320) NOT NULL UNIQUE,
        display_name varchar(200) NOT NULL,
        picture_url text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE users");
  }
}

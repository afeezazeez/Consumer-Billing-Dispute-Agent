import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateKnowledgeSourceCatalog1710000000013 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE knowledge_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key varchar(100) NOT NULL UNIQUE,
        provider varchar(100) NOT NULL,
        title varchar(300) NOT NULL,
        url text NOT NULL,
        jurisdiction_scope varchar(200) NOT NULL,
        language varchar(16) NOT NULL DEFAULT 'en',
        refresh_interval_hours integer NOT NULL DEFAULT 24 CHECK (refresh_interval_hours >= 24),
        enabled boolean NOT NULL DEFAULT true,
        etag text,
        last_modified text,
        content_hash varchar(64),
        checked_at timestamptz,
        succeeded_at timestamptz,
        next_refresh_at timestamptz NOT NULL DEFAULT NOW(),
        failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
        last_error_code varchar(80),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );
      CREATE INDEX knowledge_sources_due_idx ON knowledge_sources(enabled, next_refresh_at);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE knowledge_sources");
  }
}

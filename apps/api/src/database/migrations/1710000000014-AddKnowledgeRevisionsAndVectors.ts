import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddKnowledgeRevisionsAndVectors1710000000014 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE TABLE knowledge_source_revisions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
        revision_number integer NOT NULL,
        content_hash varchar(64) NOT NULL,
        etag text,
        last_modified text,
        status varchar(16) NOT NULL CHECK (status IN ('building', 'active', 'superseded')),
        activated_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE (source_id, revision_number)
      );
      ALTER TABLE knowledge_sources ADD COLUMN active_revision_id uuid REFERENCES knowledge_source_revisions(id) ON DELETE SET NULL;
      CREATE TABLE knowledge_chunks (
        id bigserial PRIMARY KEY,
        revision_id uuid NOT NULL REFERENCES knowledge_source_revisions(id) ON DELETE CASCADE,
        ordinal integer NOT NULL,
        content text NOT NULL,
        embedding vector(1536) NOT NULL,
        UNIQUE (revision_id, ordinal)
      );
      CREATE INDEX knowledge_chunks_embedding_hnsw_idx ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
      CREATE INDEX knowledge_chunks_revision_idx ON knowledge_chunks(revision_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE knowledge_chunks; ALTER TABLE knowledge_sources DROP COLUMN active_revision_id; DROP TABLE knowledge_source_revisions;`);
  }
}

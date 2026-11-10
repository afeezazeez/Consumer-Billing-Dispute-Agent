import type { DataSource } from "typeorm";
import type { KnowledgeChunkInput, KnowledgeChunkMatch, KnowledgeContentRepository } from "../knowledge/knowledge-content.repository";

export class TypeOrmKnowledgeContentRepository implements KnowledgeContentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async saveRevision(sourceKey: string, contentHash: string, etag: string | undefined, lastModified: string | undefined, chunks: KnowledgeChunkInput[]): Promise<void> {
    if (!chunks.length || chunks.some((chunk) => chunk.embedding.length !== 1536)) throw new Error("KNOWLEDGE_EMBEDDING_DIMENSION_INVALID");
    await this.dataSource.transaction(async (manager) => {
      const [source] = await manager.query("SELECT id FROM knowledge_sources WHERE key = $1 AND enabled = true FOR UPDATE", [sourceKey]) as { id: string }[];
      if (!source) throw new Error("SOURCE_NOT_FOUND");
      const [revision] = await manager.query(
        `INSERT INTO knowledge_source_revisions (source_id, revision_number, content_hash, etag, last_modified, status)
         SELECT $1, COALESCE(MAX(revision_number), 0) + 1, $2, $3, $4, 'building' FROM knowledge_source_revisions WHERE source_id = $1 RETURNING id`,
        [source.id, contentHash, etag ?? null, lastModified ?? null],
      ) as { id: string }[];
      for (let offset = 0; offset < chunks.length; offset += 32) {
        await insertChunks(manager, revision.id, chunks.slice(offset, offset + 32), offset);
      }
      await manager.query("UPDATE knowledge_source_revisions SET status = 'superseded' WHERE source_id = $1 AND status = 'active'", [source.id]);
      await manager.query("UPDATE knowledge_source_revisions SET status = 'active', activated_at = NOW() WHERE id = $1", [revision.id]);
      await manager.query(
        `UPDATE knowledge_sources SET active_revision_id = $2, content_hash = $3, etag = $4, last_modified = $5,
          checked_at = NOW(), succeeded_at = NOW(), failed_attempts = 0, last_error_code = NULL,
          next_refresh_at = NOW() + refresh_interval_hours * INTERVAL '1 hour', updated_at = NOW() WHERE id = $1`,
        [source.id, revision.id, contentHash, etag ?? null, lastModified ?? null],
      );
    });
  }

  async markChecked(sourceKey: string, etag?: string, lastModified?: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE knowledge_sources SET checked_at = NOW(), succeeded_at = NOW(), failed_attempts = 0, last_error_code = NULL,
       etag = COALESCE($2, etag), last_modified = COALESCE($3, last_modified),
       next_refresh_at = NOW() + refresh_interval_hours * INTERVAL '1 hour', updated_at = NOW() WHERE key = $1`,
      [sourceKey, etag ?? null, lastModified ?? null],
    );
  }

  async markFailure(sourceKey: string, errorCode: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE knowledge_sources SET checked_at = NOW(), failed_attempts = failed_attempts + 1,
       last_error_code = $2, next_refresh_at = NOW() + LEAST(INTERVAL '24 hours', INTERVAL '5 minutes' * power(2, LEAST(failed_attempts, 8))), updated_at = NOW() WHERE key = $1`,
      [sourceKey, errorCode],
    );
  }

  async search(embedding: number[], limit: number, jurisdictionCode?: string): Promise<KnowledgeChunkMatch[]> {
    const vector = `[${embedding.join(",")}]`;
    return await this.dataSource.query(
      `SELECT chunks.content, source.title, source.url, source.jurisdiction_code AS "jurisdictionCode",
        source.jurisdiction_scope AS "jurisdictionScope",
        1 - (chunks.embedding <=> $1::vector) AS similarity
       FROM knowledge_chunks chunks
       JOIN knowledge_source_revisions revision ON revision.id = chunks.revision_id AND revision.status = 'active'
       JOIN knowledge_sources source ON source.active_revision_id = revision.id AND source.enabled = true
       WHERE source.jurisdiction_code IS NULL OR source.jurisdiction_code = $3
       ORDER BY chunks.embedding <=> $1::vector LIMIT $2`,
      [vector, limit, jurisdictionCode ?? ""],
    ) as KnowledgeChunkMatch[];
  }
}

async function insertChunks(manager: import("typeorm").EntityManager, revisionId: string, chunks: KnowledgeChunkInput[], startOrdinal: number): Promise<void> {
  const params: unknown[] = [];
  const values = chunks.map((chunk, index) => {
    const base = index * 4;
    params.push(revisionId, startOrdinal + index, chunk.content, `[${chunk.embedding.join(",")}]`);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::vector)`;
  });
  await manager.query(
    `INSERT INTO knowledge_chunks (revision_id, ordinal, content, embedding) VALUES ${values.join(",")}`,
    params,
  );
}

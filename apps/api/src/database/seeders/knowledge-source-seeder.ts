import type { EntityManager } from "typeorm";

export interface KnowledgeSourceSeed {
  key: string;
  provider: string;
  title: string;
  url: string;
  jurisdictionCode: string | null;
  jurisdictionScope: string;
}

export async function seedKnowledgeSources(manager: EntityManager, sources: KnowledgeSourceSeed[]): Promise<void> {
  const values = sources.map((source, index) => sourceValues(source, index)).join(", ");
  const parameters = sources.flatMap(source => [
    source.key, source.provider, source.title, source.url, source.jurisdictionCode, source.jurisdictionScope,
  ]);
  await manager.query(sourceUpsertQuery(values), parameters);
}

function sourceValues(source: KnowledgeSourceSeed, index: number): string {
  const firstParameter = index * 6 + 1;
  return `($${firstParameter}, $${firstParameter + 1}, $${firstParameter + 2}, $${firstParameter + 3}, $${firstParameter + 4}, $${firstParameter + 5})`;
}

function sourceUpsertQuery(values: string): string {
  return `INSERT INTO knowledge_sources (key, provider, title, url, jurisdiction_code, jurisdiction_scope)
    VALUES ${values}
    ON CONFLICT (key) DO UPDATE SET provider = EXCLUDED.provider, title = EXCLUDED.title,
      url = EXCLUDED.url, jurisdiction_code = EXCLUDED.jurisdiction_code,
      jurisdiction_scope = EXCLUDED.jurisdiction_scope, updated_at = NOW()`;
}

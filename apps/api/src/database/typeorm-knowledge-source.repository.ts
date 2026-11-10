import type { DataSource } from "typeorm";
import type { KnowledgeSource } from "../knowledge/knowledge-source";
import type { KnowledgeSourceRepository } from "../knowledge/knowledge-source.repository";
import { KnowledgeSourceEntity } from "./entities/knowledge-source.entity";

export class TypeOrmKnowledgeSourceRepository implements KnowledgeSourceRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findDueForRefresh(now: Date): Promise<KnowledgeSource[]> {
    const entities = await this.dataSource.getRepository(KnowledgeSourceEntity)
      .createQueryBuilder("source")
      .where("source.enabled = :enabled", { enabled: true })
      .andWhere("source.nextRefreshAt <= :now", { now })
      .orderBy("source.nextRefreshAt", "ASC")
      .getMany();
    return entities.map(toKnowledgeSource);
  }

  async findByKey(key: string): Promise<KnowledgeSource | undefined> {
    const entity = await this.dataSource.getRepository(KnowledgeSourceEntity).findOneBy({ key });
    return entity ? toKnowledgeSource(entity) : undefined;
  }
}

function toKnowledgeSource(entity: KnowledgeSourceEntity): KnowledgeSource {
  return {
    id: entity.id,
    key: entity.key,
    provider: entity.provider,
    title: entity.title,
    url: entity.url,
    jurisdictionCode: entity.jurisdictionCode ?? undefined,
    jurisdictionScope: entity.jurisdictionScope,
    language: entity.language,
    refreshIntervalHours: entity.refreshIntervalHours,
    enabled: entity.enabled,
    etag: entity.etag ?? undefined,
    lastModified: entity.lastModified ?? undefined,
    contentHash: entity.contentHash ?? undefined,
    checkedAt: entity.checkedAt ?? undefined,
    succeededAt: entity.succeededAt ?? undefined,
    nextRefreshAt: entity.nextRefreshAt,
    failedAttempts: entity.failedAttempts,
    lastErrorCode: entity.lastErrorCode ?? undefined,
  };
}

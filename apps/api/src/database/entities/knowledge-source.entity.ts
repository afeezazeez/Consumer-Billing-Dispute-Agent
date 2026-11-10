import { EntitySchema } from "typeorm";

export class KnowledgeSourceEntity {
  id!: string;
  activeRevisionId!: string | null;
  key!: string;
  provider!: string;
  title!: string;
  url!: string;
  jurisdictionCode!: string | null;
  jurisdictionScope!: string;
  language!: string;
  refreshIntervalHours!: number;
  enabled!: boolean;
  etag!: string | null;
  lastModified!: string | null;
  contentHash!: string | null;
  checkedAt!: Date | null;
  succeededAt!: Date | null;
  nextRefreshAt!: Date;
  failedAttempts!: number;
  lastErrorCode!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export const knowledgeSourceSchema = new EntitySchema<KnowledgeSourceEntity>({
  name: "KnowledgeSource",
  target: KnowledgeSourceEntity,
  tableName: "knowledge_sources",
  columns: {
    id: { type: "uuid", primary: true },
    activeRevisionId: { name: "active_revision_id", type: "uuid", nullable: true },
    key: { type: "varchar", length: 100, unique: true },
    provider: { type: "varchar", length: 100 },
    title: { type: "varchar", length: 300 },
    url: { type: "text" },
    jurisdictionCode: { name: "jurisdiction_code", type: "varchar", length: 2, nullable: true },
    jurisdictionScope: { name: "jurisdiction_scope", type: "varchar", length: 200 },
    language: { type: "varchar", length: 16, default: "en" },
    refreshIntervalHours: { name: "refresh_interval_hours", type: "integer", default: 24 },
    enabled: { type: "boolean", default: true },
    etag: { type: "text", nullable: true },
    lastModified: { name: "last_modified", type: "text", nullable: true },
    contentHash: { name: "content_hash", type: "varchar", length: 64, nullable: true },
    checkedAt: { name: "checked_at", type: "timestamptz", nullable: true },
    succeededAt: { name: "succeeded_at", type: "timestamptz", nullable: true },
    nextRefreshAt: { name: "next_refresh_at", type: "timestamptz" },
    failedAttempts: { name: "failed_attempts", type: "integer", default: 0 },
    lastErrorCode: { name: "last_error_code", type: "varchar", length: 80, nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
  indices: [{ columns: ["enabled", "nextRefreshAt"] }],
});

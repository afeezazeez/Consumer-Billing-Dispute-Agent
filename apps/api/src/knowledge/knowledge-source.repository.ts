import type { KnowledgeSource } from "./knowledge-source";

export interface KnowledgeSourceRepository {
  findDueForRefresh(now: Date): Promise<KnowledgeSource[]>;
  findByKey(key: string): Promise<KnowledgeSource | undefined>;
}

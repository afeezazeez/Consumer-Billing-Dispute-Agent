export interface KnowledgeChunkInput { content: string; embedding: number[]; }
export interface KnowledgeChunkMatch {
  content: string;
  title: string;
  url: string;
  jurisdictionCode?: string;
  jurisdictionScope: string;
  similarity: number;
}

export interface KnowledgeContentRepository {
  saveRevision(sourceKey: string, contentHash: string, etag: string | undefined, lastModified: string | undefined, chunks: KnowledgeChunkInput[]): Promise<void>;
  markChecked(sourceKey: string, etag?: string, lastModified?: string): Promise<void>;
  markFailure(sourceKey: string, errorCode: string): Promise<void>;
  search(embedding: number[], limit: number, jurisdictionCode?: string): Promise<KnowledgeChunkMatch[]>;
}

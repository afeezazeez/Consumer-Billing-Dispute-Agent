export interface KnowledgeSource {
  id: string;
  key: string;
  provider: string;
  title: string;
  url: string;
  jurisdictionCode?: string;
  jurisdictionScope: string;
  language: string;
  refreshIntervalHours: number;
  enabled: boolean;
  etag?: string;
  lastModified?: string;
  contentHash?: string;
  checkedAt?: Date;
  succeededAt?: Date;
  nextRefreshAt: Date;
  failedAttempts: number;
  lastErrorCode?: string;
}

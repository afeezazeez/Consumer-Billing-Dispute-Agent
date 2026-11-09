import type { AttachmentStorage, PendingAttachment, StoredAttachment } from "./attachment.types";

export class AttachmentService {
  constructor(
    private readonly storage: AttachmentStorage,
    private readonly scheduleCleanup: (key: string) => Promise<void>,
  ) {}

  async save<T>(
    files: PendingAttachment[] | undefined,
    persist: (files: StoredAttachment[]) => Promise<{ result: T; retainedIds: ReadonlySet<string> }>,
  ): Promise<T> {
    const stored: StoredAttachment[] = [];
    let retainedIds: ReadonlySet<string> = new Set();
    try {
      for (const file of files ?? []) {
        const storageKey = this.storage.keyFor(file);
        stored.push({ ...file, data: null, storageKey });
        await this.storage.upload(file, storageKey);
      }
      const saved = await persist(stored);
      retainedIds = saved.retainedIds;
      return saved.result;
    } finally {
      await Promise.allSettled(stored.flatMap(({ id, storageKey }) =>
        storageKey && !retainedIds.has(id) ? [this.discard(storageKey)] : [],
      ));
    }
  }

  async read(attachment: StoredAttachment): Promise<PendingAttachment> {
    const { storageKey, data, ...metadata } = attachment;
    const bytes = storageKey ? await this.storage.download(storageKey) : data;
    if (!bytes) throw new Error("Attachment has no stored data");
    return { ...metadata, data: bytes };
  }

  private async discard(key: string): Promise<void> {
    try {
      await this.scheduleCleanup(key);
    } catch {
      await this.storage.remove(key);
    }
  }
}

export interface AttachmentMetadata {
  id: string;
  name: string;
  mediaType: string;
  size: number;
}

export interface PendingAttachment extends AttachmentMetadata {
  data: Buffer;
}

export interface StoredAttachment extends AttachmentMetadata {
  data: Buffer | null;
  storageKey: string | null;
}

export interface AttachmentStorage {
  keyFor(file: PendingAttachment): string;
  upload(file: PendingAttachment, key: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

import type { CloudinaryAttachmentStorage } from "../storage/cloudinary-attachment-storage";
import type { CaseConversation } from "./case.repository";
import type { PendingCaseAttachment, StoredCaseAttachment } from "./case-attachment";

export class CaseAttachmentService {
  constructor(
    private readonly storage: CloudinaryAttachmentStorage,
    private readonly scheduleCleanup: (publicId: string) => Promise<void>,
  ) {}

  async save(
    files: PendingCaseAttachment[] | undefined,
    persist: (files: StoredCaseAttachment[]) => Promise<CaseConversation | undefined>,
  ): Promise<CaseConversation | undefined> {
    const stored: StoredCaseAttachment[] = [];
    let saved: CaseConversation | undefined;
    try {
      for (const file of files ?? []) {
        const publicId = this.storage.publicIdFor(file);
        stored.push({ ...file, data: null, cloudinaryPublicId: publicId });
        await this.storage.upload(file, publicId);
      }
      saved = await persist(stored);
      return saved;
    } finally {
      const savedIds = new Set(saved?.messages.flatMap((message) => message.attachments?.map(({ id }) => id) ?? []));
      await Promise.allSettled(stored.filter(({ id }) => !savedIds.has(id)).map(({ cloudinaryPublicId }) =>
        this.discard(cloudinaryPublicId!),
      ));
    }
  }

  async read(attachment: StoredCaseAttachment): Promise<PendingCaseAttachment> {
    const { cloudinaryPublicId, data, ...metadata } = attachment;
    return { ...metadata, data: cloudinaryPublicId ? await this.storage.download(cloudinaryPublicId) : data! };
  }

  private async discard(publicId: string): Promise<void> {
    try {
      await this.scheduleCleanup(publicId);
    } catch {
      await this.storage.remove(publicId);
    }
  }
}

import { v2 as cloudinary } from "cloudinary";
import type { AttachmentStorage, PendingAttachment } from "./attachment.types";
import { ServiceUnavailableException } from "../exceptions/service-unavailable.exception";

export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

const privateRaw = { resource_type: "raw", type: "authenticated" } as const;
const extensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class CloudinaryAttachmentStorage implements AttachmentStorage {
  constructor(
    private readonly config: CloudinaryConfig | undefined,
    private readonly prefix: string,
  ) {}

  get configured(): boolean {
    return Boolean(this.config);
  }

  keyFor(file: PendingAttachment): string {
    this.requireConfig();
    return `${this.prefix}/${file.id}.${extensions[file.mediaType]}`;
  }

  async upload(file: PendingAttachment, publicId: string): Promise<void> {
    const config = this.requireConfig();
    await new Promise<void>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        ...config,
        ...privateRaw,
        public_id: publicId,
        overwrite: false,
        timeout: 30_000,
      }, (error, result) => {
        if (error || !result) reject(new ServiceUnavailableException("Couldn’t store the attachment. Try again."));
        else resolve();
      });
      stream.on("error", () => reject(new ServiceUnavailableException("Couldn’t store the attachment. Try again.")));
      stream.end(file.data);
    });
  }

  async download(publicId: string): Promise<Buffer> {
    const url = cloudinary.utils.private_download_url(publicId, "", {
      ...this.requireConfig(),
      ...privateRaw,
      expires_at: Math.floor(Date.now() / 1000) + 60,
    });
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error("Attachment unavailable");
      return Buffer.from(await response.arrayBuffer());
    } catch {
      throw new ServiceUnavailableException("Couldn’t open the attachment. Try again.");
    }
  }

  async remove(publicId: string): Promise<void> {
    const options = { ...this.requireConfig(), ...privateRaw, timeout: 30_000 };
    const result = await cloudinary.uploader.destroy(publicId, options);
    if (!["ok", "not found"].includes(result.result)) throw new Error("Attachment deletion failed");
  }

  private requireConfig(): CloudinaryConfig {
    if (!this.config) throw new ServiceUnavailableException("Attachment storage is not configured.");
    return this.config;
  }
}

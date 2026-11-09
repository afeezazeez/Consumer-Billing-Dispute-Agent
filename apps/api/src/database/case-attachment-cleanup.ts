import type { DataSource } from "typeorm";
import type { CloudinaryAttachmentStorage } from "../storage/cloudinary-attachment-storage";

export class CaseAttachmentCleanup {
  constructor(private readonly dataSource: DataSource, private readonly storage: CloudinaryAttachmentStorage) {}

  async enqueue(publicId: string): Promise<void> {
    await this.dataSource.query(
      "INSERT INTO case_attachment_cleanup(public_id) VALUES ($1) ON CONFLICT DO NOTHING",
      [publicId],
    );
  }

  start(): void {
    if (!this.storage.configured) return;
    void this.run();
  }

  private async run(): Promise<void> {
    try {
      const rows = await this.dataSource.query(
        "SELECT public_id FROM case_attachment_cleanup ORDER BY public_id LIMIT 10",
      ) as { public_id: string }[];
      await Promise.allSettled(rows.map(async ({ public_id }) => {
        await this.storage.remove(public_id);
        await this.dataSource.query("DELETE FROM case_attachment_cleanup WHERE public_id = $1", [public_id]);
      }));
    } catch {
      // Leave queued deletions in PostgreSQL for the next pass.
    } finally {
      setTimeout(() => void this.run(), 30_000).unref();
    }
  }
}

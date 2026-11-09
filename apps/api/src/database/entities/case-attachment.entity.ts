import type { DocumentReview } from "../../documents/document-review";
import { EntitySchema } from "typeorm";
import type { StoredCaseAttachment } from "../../cases/case-attachment";

export class CaseAttachmentEntity implements StoredCaseAttachment {
  id!: string;
  messageId!: string;
  name!: string;
  mediaType!: string;
  size!: number;
  data!: Buffer | null;
  storageKey!: string | null;
  review!: DocumentReview | null;
}

export const caseAttachmentSchema = new EntitySchema<CaseAttachmentEntity>({
  name: "CaseAttachment",
  target: CaseAttachmentEntity,
  tableName: "case_attachments",
  columns: {
    id: { type: "uuid", primary: true },
    messageId: { name: "message_id", type: "uuid" },
    name: { type: "varchar", length: 255 },
    mediaType: { name: "media_type", type: "varchar", length: 32 },
    size: { type: "integer" },
    review: { name: "document_review", type: "jsonb", nullable: true },
    data: { type: "bytea", nullable: true, select: false },
    storageKey: { name: "cloudinary_public_id", type: "text", nullable: true, select: false },
  },
});

import type { AttachmentMetadata } from "../storage/attachment.types";
import type { DocumentReview } from "../documents/document-review";

export interface CaseAttachment extends AttachmentMetadata {
  review?: DocumentReview;
}

export type {
  PendingAttachment as PendingCaseAttachment,
  StoredAttachment as StoredCaseAttachment,
} from "../storage/attachment.types";

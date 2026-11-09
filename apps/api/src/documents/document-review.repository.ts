import type { ConfirmedDocumentFields, DocumentReview, ExtractedDocumentFields } from "./document-review";

export interface DocumentReviewRepository {
  find(userId: string, attachmentId: string): Promise<{ review: DocumentReview | null } | undefined>;
  claim(userId: string, attachmentId: string, claim: string): Promise<boolean>;
  complete(attachmentId: string, claim: string, extracted: ExtractedDocumentFields): Promise<DocumentReview | undefined>;
  release(attachmentId: string, claim: string): Promise<void>;
  confirm(userId: string, attachmentId: string, fields: ConfirmedDocumentFields): Promise<DocumentReview | undefined>;
}

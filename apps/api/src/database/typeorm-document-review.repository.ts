import type { DataSource } from "typeorm";
import type { ConfirmedDocumentFields, DocumentReview, DocumentExtraction } from "../documents/document-review";
import type { DocumentReviewRepository } from "../documents/document-review.repository";

const ownedAttachment = `EXISTS (
  SELECT 1 FROM case_messages m JOIN billing_cases c ON c.id = m.case_id
  WHERE m.id = a.message_id AND c.user_id = $2
)`;

export class TypeOrmDocumentReviewRepository implements DocumentReviewRepository {
  constructor(private readonly dataSource: DataSource) {}

  async find(userId: string, attachmentId: string) {
    const rows = await this.dataSource.query(
      `SELECT document_review AS review FROM case_attachments a WHERE id = $1 AND ${ownedAttachment}`,
      [attachmentId, userId],
    ) as { review: DocumentReview | null }[];
    return rows[0];
  }

  async claim(userId: string, attachmentId: string, claim: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `WITH claimed AS (
        UPDATE case_attachments a SET review_claim = $3, review_started_at = NOW()
        WHERE id = $1 AND ${ownedAttachment} AND (
          document_review IS NULL OR (
            NOT (document_review ? 'statement') AND NOT (document_review ? 'confirmed')
            AND document_review #>> '{extracted,provider,value}' IS NULL
            AND document_review #>> '{extracted,amount,value}' IS NULL
            AND document_review #>> '{extracted,chargeDate,value}' IS NULL
          )
        )
        AND (review_claim IS NULL OR review_started_at < NOW() - INTERVAL '2 minutes')
        RETURNING id
      ) SELECT id FROM claimed`,
      [attachmentId, userId, claim],
    ) as unknown[];
    return rows.length > 0;
  }

  async complete(attachmentId: string, claim: string, extraction: DocumentExtraction) {
    return this.writeReview(
      `UPDATE case_attachments SET document_review = COALESCE(document_review, '{}'::jsonb) || $3::jsonb, review_claim = NULL, review_started_at = NULL
       WHERE id = $1 AND review_claim = $2 RETURNING document_review AS review`,
      [attachmentId, claim, JSON.stringify(extraction)],
    );
  }

  async release(attachmentId: string, claim: string): Promise<void> {
    await this.dataSource.query(
      "UPDATE case_attachments SET review_claim = NULL, review_started_at = NULL WHERE id = $1 AND review_claim = $2",
      [attachmentId, claim],
    );
  }

  async confirm(userId: string, attachmentId: string, fields: ConfirmedDocumentFields) {
    return this.writeReview(
      `UPDATE case_attachments a SET document_review = document_review || $3::jsonb
       WHERE id = $1 AND ${ownedAttachment} AND document_review IS NOT NULL RETURNING document_review AS review`,
      [attachmentId, userId, JSON.stringify({ confirmed: fields, confirmedAt: new Date().toISOString() })],
    );
  }

  private async writeReview(sql: string, params: string[]): Promise<DocumentReview | undefined> {
    const rows = await this.dataSource.query(
      `WITH updated AS (${sql}) SELECT review FROM updated`, params,
    ) as { review: DocumentReview }[];
    return rows[0]?.review;
  }
}

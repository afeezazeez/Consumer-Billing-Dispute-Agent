export const DOCUMENT_FIELDS = ["provider", "amount", "chargeDate"] as const;
export type DocumentField = typeof DOCUMENT_FIELDS[number];

export interface ExtractedDocumentField {
  value: string | null;
  excerpt: string | null;
  page: number | null;
  confidence: "clear" | "uncertain" | "unreadable";
}

export type ExtractedDocumentFields = Record<DocumentField, ExtractedDocumentField>;
export type ConfirmedDocumentFields = Record<DocumentField, string | null>;

export interface DocumentExtraction {
  extracted: ExtractedDocumentFields;
  statement?: {
    issuer: ExtractedDocumentField;
    transactions: ExtractedDocumentFields[];
  };
}

export interface DocumentReview extends DocumentExtraction {
  confirmed?: ConfirmedDocumentFields;
  confirmedAt?: string;
}

export function needsStatementRecheck(review: DocumentReview): boolean {
  return !review.statement && !review.confirmed
    && DOCUMENT_FIELDS.every((key) => review.extracted[key].value === null);
}

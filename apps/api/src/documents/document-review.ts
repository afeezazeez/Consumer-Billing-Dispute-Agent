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
  statement: {
    issuer: ExtractedDocumentField;
    transactions: ExtractedDocumentFields[];
  };
  notices: ExtractedDocumentField[];
}

export interface DocumentReview {
  extracted: ExtractedDocumentFields;
  statement?: DocumentExtraction["statement"];
  notices?: ExtractedDocumentField[];
  confirmed?: ConfirmedDocumentFields;
  confirmedAt?: string;
}

export function needsStatementRecheck(review: DocumentReview): boolean {
  if (review.confirmed) return false;
  if (review.statement && !review.notices) return true;
  return !review.statement && DOCUMENT_FIELDS.every((key) => review.extracted[key].value === null);
}

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

export interface DocumentReview {
  extracted: ExtractedDocumentFields;
  confirmed?: ConfirmedDocumentFields;
  confirmedAt?: string;
}

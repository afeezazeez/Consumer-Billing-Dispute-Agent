import { randomUUID } from "node:crypto";
import type { PendingAttachment } from "../storage/attachment.types";
import { ClientErrorException } from "../exceptions/client.error.exception";
import { ResponseStatus } from "../enums/response-status";
import type { ConfirmedDocumentFields, DocumentReview, ExtractedDocumentFields } from "./document-review";
import type { DocumentReviewRepository } from "./document-review.repository";

interface DocumentExtractor {
  extract(file: PendingAttachment): Promise<ExtractedDocumentFields>;
}

export class DocumentReviewService {
  constructor(
    private readonly repository: DocumentReviewRepository,
    private readonly extractor: DocumentExtractor,
    private readonly loadAttachment: (userId: string, id: string) => Promise<PendingAttachment | undefined>,
  ) {}

  async extract(userId: string, id: string): Promise<DocumentReview> {
    const attachment = await this.repository.find(userId, id);
    if (!attachment) throw notFound();
    if (attachment.review) return attachment.review;
    const claim = randomUUID();
    if (!await this.repository.claim(userId, id, claim)) {
      const latest = await this.repository.find(userId, id);
      if (!latest) throw notFound();
      if (latest.review) return latest.review;
      throw new ClientErrorException("This document is already being read. Try again shortly.", ResponseStatus.CONFLICT);
    }
    return this.extractClaimed(userId, id, claim);
  }

  private async extractClaimed(userId: string, id: string, claim: string): Promise<DocumentReview> {
    try {
      const file = await this.loadAttachment(userId, id);
      if (!file) throw notFound();
      const extracted = await this.extractor.extract(file);
      const review = await this.repository.complete(id, claim, extracted);
      if (!review) throw notFound();
      return review;
    } catch (error) {
      await this.repository.release(id, claim).catch(() => undefined);
      throw error;
    }
  }

  async confirm(userId: string, id: string, fields: ConfirmedDocumentFields): Promise<DocumentReview> {
    const attachment = await this.repository.find(userId, id);
    if (!attachment) throw notFound();
    if (!attachment.review) throw new ClientErrorException("Extract the document details first.", ResponseStatus.CONFLICT);
    const review = await this.repository.confirm(userId, id, fields);
    if (!review) throw notFound();
    return review;
  }
}

function notFound(): ClientErrorException {
  return new ClientErrorException("Attachment not found", ResponseStatus.NOT_FOUND);
}

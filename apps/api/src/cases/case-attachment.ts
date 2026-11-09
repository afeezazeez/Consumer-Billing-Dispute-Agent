export interface CaseAttachment {
  id: string;
  name: string;
  mediaType: string;
  size: number;
}

export interface PendingCaseAttachment extends CaseAttachment {
  data: Buffer;
}

export interface StoredCaseAttachment extends CaseAttachment {
  data: Buffer | null;
  cloudinaryPublicId: string | null;
}

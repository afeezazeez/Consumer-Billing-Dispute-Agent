export interface CaseAttachment {
  id: string;
  name: string;
  mediaType: string;
  size: number;
}

export interface PendingCaseAttachment extends CaseAttachment {
  data: Buffer;
}

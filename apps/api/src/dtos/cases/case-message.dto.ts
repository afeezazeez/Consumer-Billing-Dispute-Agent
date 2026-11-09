import type { CaseMessageRecord } from "../../cases/case.repository";
import type { CaseNextAction } from "../../cases/case-next-action";
import type { CaseAgentSource, CaseAgentToolActivity, CaseEmailDraft } from "../../cases/case-intake-agent";
import { stripInternalCitations } from "../../ai/utils/strip-internal-citations";

export class CaseMessageDto {
  attachments: NonNullable<CaseMessageRecord["attachments"]>;
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  processingStatus: CaseMessageRecord["processingStatus"];
  sources: CaseAgentSource[];
  toolActivities: CaseAgentToolActivity[];
  emailDraft?: CaseEmailDraft;
  nextAction?: CaseNextAction;

  constructor(message: CaseMessageRecord) {
    this.id = message.id;
    this.attachments = message.attachments ?? [];
    this.role = message.role;
    this.content = message.role === "assistant" ? stripInternalCitations(message.content) : message.content;
    this.createdAt = message.createdAt;
    this.processingStatus = message.processingStatus;
    this.sources = message.sources ?? [];
    this.toolActivities = message.toolActivities ?? [];
    this.emailDraft = message.emailDraft;
    this.nextAction = message.nextAction;
  }

  static make(message: CaseMessageRecord): CaseMessageDto {
    return new CaseMessageDto(message);
  }

  static collection(messages: CaseMessageRecord[]): CaseMessageDto[] {
    return messages.map(CaseMessageDto.make);
  }
}

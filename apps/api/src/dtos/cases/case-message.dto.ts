import type { CaseMessageRecord } from "../../cases/case.repository";
import type { CaseAgentSource, CaseAgentToolActivity } from "../../cases/case-intake-agent";

export class CaseMessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  processingStatus: CaseMessageRecord["processingStatus"];
  sources: CaseAgentSource[];
  toolActivities: CaseAgentToolActivity[];

  constructor(message: CaseMessageRecord) {
    this.id = message.id;
    this.role = message.role;
    this.content = message.content;
    this.createdAt = message.createdAt;
    this.processingStatus = message.processingStatus;
    this.sources = message.sources ?? [];
    this.toolActivities = message.toolActivities ?? [];
  }

  static make(message: CaseMessageRecord): CaseMessageDto {
    return new CaseMessageDto(message);
  }

  static collection(messages: CaseMessageRecord[]): CaseMessageDto[] {
    return messages.map(CaseMessageDto.make);
  }
}

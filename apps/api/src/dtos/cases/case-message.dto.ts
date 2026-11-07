import type { CaseMessageRecord } from "../../cases/case.repository";

export class CaseMessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;

  constructor(message: CaseMessageRecord) {
    this.id = message.id;
    this.role = message.role;
    this.content = message.content;
    this.createdAt = message.createdAt;
  }

  static make(message: CaseMessageRecord): CaseMessageDto {
    return new CaseMessageDto(message);
  }

  static collection(messages: CaseMessageRecord[]): CaseMessageDto[] {
    return messages.map(CaseMessageDto.make);
  }
}

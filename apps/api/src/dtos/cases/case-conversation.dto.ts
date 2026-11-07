import type { CaseConversation } from "../../cases/case.repository";
import { CaseMessageDto } from "./case-message.dto";
import { CaseSummaryDto } from "./case-summary.dto";

export class CaseConversationDto extends CaseSummaryDto {
  createdAt: Date;
  messages: CaseMessageDto[];

  constructor(billingCase: CaseConversation) {
    super(billingCase);
    this.createdAt = billingCase.createdAt;
    this.messages = CaseMessageDto.collection(billingCase.messages);
  }

  static make(billingCase: CaseConversation): CaseConversationDto {
    return new CaseConversationDto(billingCase);
  }
}

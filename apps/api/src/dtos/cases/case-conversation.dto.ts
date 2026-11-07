import type { CaseConversation } from "../../cases/case.repository";
import { CaseIntakeDto } from "./case-intake.dto";
import { CaseMessageDto } from "./case-message.dto";
import { CaseSummaryDto } from "./case-summary.dto";

export class CaseConversationDto extends CaseSummaryDto {
  createdAt: Date;
  messages: CaseMessageDto[];
  intake: CaseIntakeDto;

  constructor(billingCase: CaseConversation) {
    super(billingCase);
    this.createdAt = billingCase.createdAt;
    this.messages = CaseMessageDto.collection(billingCase.messages);
    this.intake = CaseIntakeDto.make(billingCase.intake);
  }

  static make(billingCase: CaseConversation): CaseConversationDto {
    return new CaseConversationDto(billingCase);
  }
}

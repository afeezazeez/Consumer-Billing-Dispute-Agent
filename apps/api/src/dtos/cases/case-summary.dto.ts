import type { CaseSummary } from "../../cases/case.repository";

export class CaseSummaryDto {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
  lastMessage: string;

  constructor(billingCase: CaseSummary) {
    this.id = billingCase.id;
    this.title = billingCase.title;
    this.status = billingCase.status;
    this.updatedAt = billingCase.updatedAt;
    this.lastMessage = billingCase.lastMessage;
  }

  static make(billingCase: CaseSummary): CaseSummaryDto {
    return new CaseSummaryDto(billingCase);
  }

  static collection(cases: CaseSummary[]): CaseSummaryDto[] {
    return cases.map(CaseSummaryDto.make);
  }
}

import type { CaseIntakeState } from "../../cases/case-intake";

export class CaseIntakeDto {
  status: CaseIntakeState["status"];
  facts: CaseIntakeState["facts"];

  constructor(intake: CaseIntakeState) {
    this.status = intake.status;
    this.facts = intake.facts;
  }

  static make(intake: CaseIntakeState): CaseIntakeDto {
    return new CaseIntakeDto(intake);
  }
}

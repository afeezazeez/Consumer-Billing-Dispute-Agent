import { Type } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import type { DisputeIssueType } from "../../cases/case-intake";

const ISSUE_TYPES: DisputeIssueType[] = [
  "unrecognized_charge",
  "incorrect_amount",
  "duplicate_charge",
  "charged_after_cancellation",
  "other",
];

export class CaseIntakeTextFactToolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  value!: string;

  @IsUUID()
  sourceMessageId!: string;
}

export class CaseIntakeIssueFactToolDto {
  @IsString()
  @IsIn(ISSUE_TYPES)
  value!: DisputeIssueType;

  @IsUUID()
  sourceMessageId!: string;
}

export class RecordCaseIntakeFactsToolDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CaseIntakeTextFactToolDto)
  provider?: CaseIntakeTextFactToolDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CaseIntakeIssueFactToolDto)
  issueType?: CaseIntakeIssueFactToolDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CaseIntakeTextFactToolDto)
  chargeAmount?: CaseIntakeTextFactToolDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CaseIntakeTextFactToolDto)
  chargeDate?: CaseIntakeTextFactToolDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CaseIntakeTextFactToolDto)
  expectedAmount?: CaseIntakeTextFactToolDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CaseIntakeTextFactToolDto)
  desiredOutcome?: CaseIntakeTextFactToolDto | null;
}

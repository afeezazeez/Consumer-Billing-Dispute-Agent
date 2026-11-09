import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
export class CaseIntakeTextFactToolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  value!: string;

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
  @Type(() => CaseIntakeTextFactToolDto)
  issueType?: CaseIntakeTextFactToolDto | null;

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

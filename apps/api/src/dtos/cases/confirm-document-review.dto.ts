import { IsString, MaxLength } from "class-validator";

export class ConfirmDocumentReviewDto {
  @IsString()
  @MaxLength(160)
  provider!: string;

  @IsString()
  @MaxLength(160)
  amount!: string;

  @IsString()
  @MaxLength(160)
  chargeDate!: string;
}

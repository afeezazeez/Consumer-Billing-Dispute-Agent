import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class DecideCaseEmailDraftRequestDto {
  @IsIn(["approve", "cancel"])
  decision!: "approve" | "cancel";

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  recipients?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string;
}

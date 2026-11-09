import { ArrayMaxSize, ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";

export class CreateCaseRequestDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  attachmentIds?: string[];

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(2000)
  openingMessage!: string;
}

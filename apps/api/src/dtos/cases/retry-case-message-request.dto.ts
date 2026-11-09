import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class RetryCaseMessageRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(2000)
  content?: string;
}

import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";

export class CreateMessageRequestDto {
  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(2000)
  content!: string;
}

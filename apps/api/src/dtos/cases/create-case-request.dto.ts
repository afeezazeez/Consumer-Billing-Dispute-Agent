import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class CreateCaseRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(2000)
  openingMessage!: string;
}

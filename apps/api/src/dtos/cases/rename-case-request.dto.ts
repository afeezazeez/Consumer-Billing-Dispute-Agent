import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class RenameCaseRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(140)
  title!: string;
}

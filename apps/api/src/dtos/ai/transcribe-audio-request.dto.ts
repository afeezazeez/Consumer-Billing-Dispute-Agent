import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class TranscribeAudioRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(["audio/webm", "audio/mp4"])
  mimeType!: string;
}

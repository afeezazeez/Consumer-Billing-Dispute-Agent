export class AudioTranscriptionResponseDto {
  transcription: string;

  constructor(transcription: string) {
    this.transcription = transcription;
  }

  static make(transcription: string): AudioTranscriptionResponseDto {
    return new AudioTranscriptionResponseDto(transcription);
  }
}

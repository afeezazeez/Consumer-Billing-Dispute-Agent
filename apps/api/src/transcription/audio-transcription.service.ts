import { ClientErrorException } from "../exceptions/client.error.exception";
import { ResponseStatus } from "../enums/response-status";
import type { AudioRecording, AudioTranscriber } from "./audio-transcription.port";

export class AudioTranscriptionService {
  constructor(private readonly audioTranscriber: AudioTranscriber) {}

  async transcribe(recording: AudioRecording): Promise<string> {
    const transcription = await this.audioTranscriber.transcribe(recording);
    const normalized = transcription.trim();
    if (!normalized) throw noSpeechDetected();
    return normalized;
  }
}

function noSpeechDetected(): ClientErrorException {
  return new ClientErrorException(
    "No speech was detected. Try recording again or type your message.",
    ResponseStatus.UNPROCESSABLE_ENTITY,
  );
}

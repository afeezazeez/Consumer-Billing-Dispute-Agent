import OpenAI, { toFile } from "openai";
import type { AudioRecording, AudioTranscriber } from "../transcription/audio-transcription.port";
import { ServiceUnavailableException } from "../exceptions/service-unavailable.exception";

const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

export class OpenAiAudioTranscriber implements AudioTranscriber {
  constructor(private readonly apiKey: string | undefined) {}

  async transcribe(recording: AudioRecording): Promise<string> {
    if (!this.apiKey) throw transcriptionUnavailable();
    try {
      return await requestTranscription(this.apiKey, recording);
    } catch {
      throw transcriptionFailed();
    }
  }
}

async function requestTranscription(apiKey: string, recording: AudioRecording): Promise<string> {
  const client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 0 });
  const file = await toFile(recording.data, recording.fileName, { type: recording.mediaType });
  const response = await client.audio.transcriptions.create({ file, model: TRANSCRIPTION_MODEL });
  return response.text;
}

function transcriptionUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException("Voice transcription is not configured yet.");
}

function transcriptionFailed(): ServiceUnavailableException {
  return new ServiceUnavailableException("Couldn’t transcribe the recording. Please try again or type your message.");
}

import type { Request, Response } from "express";
import { sendSuccessResponse } from "../utils/http/response-handlers";
import { AudioTranscriptionResponseDto } from "../dtos/ai/audio-transcription-response.dto";
import type { AudioTranscriptionService } from "./audio-transcription.service";
import type { AudioRecording } from "./audio-transcription.service";

export class AudioTranscriptionController {
  constructor(private readonly audioTranscriptionService: AudioTranscriptionService) {}

  async transcribe(_request: Request, response: Response): Promise<void> {
    const recording = response.locals.audioRecording as AudioRecording;
    const transcription = await this.audioTranscriptionService.transcribe(recording);
    sendSuccessResponse(response, AudioTranscriptionResponseDto.make(transcription), "Audio transcribed successfully");
  }
}

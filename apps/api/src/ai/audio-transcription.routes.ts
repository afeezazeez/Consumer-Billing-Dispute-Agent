import { Router } from "express";
import type { AuthMiddleware } from "../auth/auth.middleware";
import { TranscribeAudioRequestDto } from "../dtos/ai/transcribe-audio-request.dto";
import { validateBody } from "../middlewares/request-validator";
import { parseAudioRecording } from "../middlewares/audio-recording";
import type { AudioTranscriptionController } from "./audio-transcription.controller";

export function createAudioTranscriptionRouter(
  controller: AudioTranscriptionController,
  authMiddleware: AuthMiddleware,
): Router {
  const router = Router();
  router.use(authMiddleware.authenticate);
  router.post("/transcriptions", parseAudioRecording, validateBody(TranscribeAudioRequestDto), (request, response) =>
    controller.transcribe(request, response));
  return router;
}

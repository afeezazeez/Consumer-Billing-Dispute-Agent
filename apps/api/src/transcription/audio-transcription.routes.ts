import { Router } from "express";
import type { AuthMiddleware } from "../auth/auth.middleware";
import { TranscribeAudioRequestDto } from "../dtos/transcription/transcribe-audio-request.dto";
import { validateBody } from "../middlewares/request-validator";
import { parseAudioRecording } from "./audio-recording.middleware";
import type { AudioTranscriptionController } from "./audio-transcription.controller";

export function createAudioTranscriptionRouter(
  controller: AudioTranscriptionController,
  authMiddleware: AuthMiddleware,
): Router {
  const router = Router();
  router.use(authMiddleware.authenticate);
  router.post("/", parseAudioRecording, validateBody(TranscribeAudioRequestDto), (request, response) =>
    controller.transcribe(request, response));
  return router;
}

import { Router } from "express";
import type { DataSource } from "typeorm";
import type { AppConfig } from "../config";
import { AuthController } from "../auth/auth.controller";
import { AuthMiddleware } from "../auth/auth.middleware";
import { createAuthRouter } from "../auth/auth.routes";
import { AuthService } from "../auth/auth.service";
import { TypeOrmUserRepository } from "../database/typeorm-user.repository";
import { GoogleOAuthProvider } from "../auth/google-oauth.provider";
import { CaseController } from "../cases/case.controller";
import { createCaseRouter } from "../cases/case.routes";
import { healthRouter } from "../health/health.routes";
import { AudioTranscriptionController } from "../transcription/audio-transcription.controller";
import { AudioTranscriptionService } from "../transcription/audio-transcription.service";
import { createAudioTranscriptionRouter } from "../transcription/audio-transcription.routes";
import { OpenAiAudioTranscriber } from "../ai/openai-audio-transcriber";
import { createCaseServices } from "../cases/case-services";

export function createRoutes(config: AppConfig, dataSource: DataSource): Router {
  const routes = Router();
  const authMiddleware = new AuthMiddleware();

  routes.use("/health", healthRouter);
  routes.use("/auth", createAuthRouter(createAuthController(config, dataSource), authMiddleware));
  routes.use("/transcriptions", createAudioTranscriptionRouter(
    new AudioTranscriptionController(new AudioTranscriptionService(new OpenAiAudioTranscriber(config.openAiApiKey))),
    authMiddleware,
  ));
  const cases = createCaseServices(config, dataSource);
  cases.startCleanup();
  routes.use("/cases", createCaseRouter(new CaseController(cases.caseService), authMiddleware, cases.documentReviewService));

  return routes;
}

function createAuthController(config: AppConfig, dataSource: DataSource): AuthController {
  const provider = new GoogleOAuthProvider(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri,
  );
  const authService = new AuthService(provider, new TypeOrmUserRepository(dataSource));
  return new AuthController(authService, config);
}

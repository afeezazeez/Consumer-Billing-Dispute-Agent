import { OpenAiDocumentExtractor } from "../ai/openai-document-extractor";
import { TypeOrmDocumentReviewRepository } from "../database/typeorm-document-review.repository";
import { DocumentReviewService } from "../documents/document-review.service";
import { AttachmentService } from "../storage/attachment.service";
import { CaseAttachmentCleanup } from "../database/case-attachment-cleanup";
import { CloudinaryAttachmentStorage } from "../storage/cloudinary-attachment-storage";
import { Router } from "express";
import type { DataSource } from "typeorm";
import type { AppConfig } from "../config";
import { AuthController } from "../auth/auth.controller";
import { AuthMiddleware } from "../auth/auth.middleware";
import { createAuthRouter } from "../auth/auth.routes";
import { AuthService } from "../auth/auth.service";
import { GoogleOAuthProvider } from "../auth/google-oauth.provider";
import { CaseController } from "../cases/case.controller";
import { createCaseRouter } from "../cases/case.routes";
import { CaseService } from "../cases/case.service";
import { TypeOrmCaseRepository } from "../database/typeorm-case.repository";
import { TypeOrmUserRepository } from "../database/typeorm-user.repository";
import { healthRouter } from "../health/health.routes";
import { OpenAiAgent } from "../ai/openai-agent";
import { createAgentTools } from "../ai/tools/agent-tools.registry";
import { AgentTurnWorker } from "../cases/agent-turn.worker";
import { TypeOrmAgentTurnJobRepository } from "../database/typeorm-agent-turn-job.repository";
import { AudioTranscriptionController } from "../transcription/audio-transcription.controller";
import { AudioTranscriptionService } from "../transcription/audio-transcription.service";
import { createAudioTranscriptionRouter } from "../transcription/audio-transcription.routes";
import { OpenAiAudioTranscriber } from "../ai/openai-audio-transcriber";

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
  routes.use("/cases", createCaseRouter(cases.controller, authMiddleware, cases.documentReviewService));

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

function createCaseServices(config: AppConfig, dataSource: DataSource) {
  const caseRepository = new TypeOrmCaseRepository(dataSource);
  const caseIntakeAgent = new OpenAiAgent(config.openAiApiKey, config.openAiModel, createAgentTools());
  const storage = new CloudinaryAttachmentStorage(config.cloudinary, "bill-agent/case-attachments");
  const cleanup = new CaseAttachmentCleanup(dataSource, storage);
  const attachmentService = new AttachmentService(storage, (publicId) => cleanup.enqueue(publicId));
  const documentReviewService = new DocumentReviewService(
    new TypeOrmDocumentReviewRepository(dataSource),
    new OpenAiDocumentExtractor(config.openAiApiKey, config.openAiModel),
    async (userId, attachmentId) => {
      const attachment = await caseRepository.findAttachment(userId, attachmentId);
      return attachment ? attachmentService.read(attachment) : undefined;
    },
  );
  const caseService = new CaseService(caseRepository, caseIntakeAgent, attachmentService, documentReviewService);
  cleanup.start();
  const agentTurnWorker = new AgentTurnWorker(
    new TypeOrmAgentTurnJobRepository(dataSource),
    caseService,
    new TypeOrmUserRepository(dataSource),
  );
  agentTurnWorker.start();
  return { controller: new CaseController(caseService), documentReviewService };
}

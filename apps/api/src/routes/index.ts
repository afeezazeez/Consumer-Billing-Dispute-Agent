import { CaseAttachmentService } from "../cases/case-attachment.service";
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

export function createRoutes(config: AppConfig, dataSource: DataSource): Router {
  const routes = Router();
  const authMiddleware = new AuthMiddleware();

  routes.use("/health", healthRouter);
  routes.use("/auth", createAuthRouter(createAuthController(config, dataSource), authMiddleware));
  routes.use("/cases", createCaseRouter(createCaseController(config, dataSource), authMiddleware));

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

function createCaseController(config: AppConfig, dataSource: DataSource): CaseController {
  const caseRepository = new TypeOrmCaseRepository(dataSource);
  const caseIntakeAgent = new OpenAiAgent(config.openAiApiKey, config.openAiModel, createAgentTools());
  const storage = new CloudinaryAttachmentStorage(config.cloudinary);
  const cleanup = new CaseAttachmentCleanup(dataSource, storage);
  const caseAttachmentService = new CaseAttachmentService(storage, (publicId) => cleanup.enqueue(publicId));
  const caseService = new CaseService(caseRepository, caseIntakeAgent, caseAttachmentService);
  cleanup.start();
  const agentTurnWorker = new AgentTurnWorker(
    new TypeOrmAgentTurnJobRepository(dataSource),
    caseService,
    new TypeOrmUserRepository(dataSource),
  );
  agentTurnWorker.start();
  return new CaseController(caseService);
}

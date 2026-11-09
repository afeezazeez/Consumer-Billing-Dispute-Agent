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
import { CaseIntakeToolService } from "../cases/case-intake-tool.service";
import { OpenAiCaseIntakeAgent } from "../services/ai/openai-case-intake-agent";

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
  const caseIntakeToolService = new CaseIntakeToolService();
  const caseIntakeAgent = new OpenAiCaseIntakeAgent(config.openAiApiKey, config.openAiModel, caseIntakeToolService);
  const caseService = new CaseService(caseRepository, caseIntakeAgent);
  return new CaseController(caseService);
}

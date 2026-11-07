import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import type { Store } from "express-session";
import type { DataSource } from "typeorm";
import type { AppConfig } from "./config";
import { AuthController } from "./auth/auth.controller";
import { AuthMiddleware } from "./auth/auth.middleware";
import { createAuthRouter } from "./auth/auth.routes";
import { AuthService } from "./auth/auth.service";
import { GoogleOAuthProvider } from "./auth/google-oauth.provider";
import { CaseController } from "./cases/case.controller";
import { createCaseRouter } from "./cases/case.routes";
import { CaseService } from "./cases/case.service";
import { TypeOrmCaseRepository } from "./database/typeorm-case.repository";
import { TypeOrmUserRepository } from "./database/typeorm-user.repository";
import { healthRouter } from "./health/health.routes";
import { errorHandler } from "./middlewares/error.handler";
import { ClientErrorException } from "./exceptions/client.error.exception";
import { ResponseStatus } from "./enums/response-status";

export function createApp(config: AppConfig, dataSource: DataSource, sessionStore: Store): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", config.isProduction ? 1 : false);
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(express.json({ limit: "20kb" }));
  configureSession(app, config, sessionStore);
  mountRoutes(app, config, dataSource);
  app.use((_request, _response, next) => next(new ClientErrorException("Route not found", ResponseStatus.NOT_FOUND)));
  app.use(errorHandler);
  return app;
}

function configureSession(app: Express, config: AppConfig, sessionStore: Store): void {
  app.use(session({
    name: "billing.sid",
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));
}

function mountRoutes(app: Express, config: AppConfig, dataSource: DataSource): void {
  const authService = createAuthService(config, dataSource);
  const authController = new AuthController(authService, config);
  const authMiddleware = new AuthMiddleware();
  const caseService = new CaseService(new TypeOrmCaseRepository(dataSource));
  app.use("/health", healthRouter);
  app.use("/auth", createAuthRouter(authController, authMiddleware));
  app.use("/cases", createCaseRouter(new CaseController(caseService), authMiddleware));
}

function createAuthService(config: AppConfig, dataSource: DataSource): AuthService {
  const provider = new GoogleOAuthProvider(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri,
  );
  return new AuthService(provider, new TypeOrmUserRepository(dataSource));
}

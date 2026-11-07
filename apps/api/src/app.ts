import express, { type Express } from "express";
import session from "express-session";
import type { Store } from "express-session";
import type { DataSource } from "typeorm";
import type { AppConfig } from "./config";
import { AuthController } from "./auth/auth.controller";
import { createAuthRouter } from "./auth/auth.routes";
import { AuthService } from "./auth/auth.service";
import { GoogleOAuthProvider } from "./auth/google-oauth.provider";
import { TypeOrmUserRepository } from "./database/typeorm-user.repository";
import { healthRouter } from "./health/health.routes";

export function createApp(config: AppConfig, dataSource: DataSource, sessionStore: Store): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", config.isProduction ? 1 : false);
  configureSession(app, config, sessionStore);
  mountRoutes(app, config, dataSource);
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
  app.use("/health", healthRouter);
  app.use("/auth", createAuthRouter(authController));
}

function createAuthService(config: AppConfig, dataSource: DataSource): AuthService {
  const provider = new GoogleOAuthProvider(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri,
  );
  return new AuthService(provider, new TypeOrmUserRepository(dataSource));
}

import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import type { Store } from "express-session";
import type { DataSource } from "typeorm";
import type { AppConfig } from "./config";
import { ClientErrorException } from "./exceptions/client.error.exception";
import { ResponseStatus } from "./enums/response-status";
import { errorHandler } from "./middlewares/error.handler";
import { createRoutes } from "./routes";

export function createApp(config: AppConfig, dataSource: DataSource, sessionStore: Store): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", config.isProduction ? 1 : false);
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(express.json({ limit: "20kb" }));
  configureSession(app, config, sessionStore);
  app.use(createRoutes(config, dataSource));
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

import express, { type Express } from "express";
import { healthRouter } from "./health/health.routes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use("/health", healthRouter);

  return app;
}

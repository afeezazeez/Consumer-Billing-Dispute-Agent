import { Router } from "express";
import type { AuthMiddleware } from "../../auth/auth.middleware";
import type { GmailConnectorController } from "./gmail-connector.controller";

export function createGmailConnectorRouter(
  gmailConnectorController: GmailConnectorController,
  authMiddleware: AuthMiddleware,
): Router {
  const router = Router();
  router.get("/google", authMiddleware.authenticate, (request, response, next) =>
    void gmailConnectorController.startConnection(request, response, next));
  router.get("/google/callback", (request, response) =>
    void gmailConnectorController.finishConnection(request, response));
  router.get("/status", authMiddleware.authenticate, (request, response, next) =>
    void gmailConnectorController.status(request, response, next));
  router.delete("/", authMiddleware.authenticate, (request, response, next) =>
    void gmailConnectorController.disconnect(request, response, next));
  return router;
}

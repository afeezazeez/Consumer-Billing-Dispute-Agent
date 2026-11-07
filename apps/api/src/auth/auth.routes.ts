import { Router } from "express";
import type { AuthMiddleware } from "./auth.middleware";
import type { AuthController } from "./auth.controller";

export function createAuthRouter(controller: AuthController, authMiddleware: AuthMiddleware): Router {
  const router = Router();

  router.get("/google", (request, response, next) => controller.startGoogleSignIn(request, response, next));
  router.get("/google/callback", (request, response) => controller.finishGoogleSignIn(request, response));
  router.get("/me", authMiddleware.authenticate, (request, response, next) => controller.currentUser(request, response, next));
  router.post("/logout", (request, response, next) => controller.signOut(request, response, next));

  return router;
}

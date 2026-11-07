import { Router } from "express";
import type { AuthController } from "./auth.controller";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.get("/google", (request, response) => controller.startGoogleSignIn(request, response));
  router.get("/google/callback", (request, response) => controller.finishGoogleSignIn(request, response));
  router.get("/me", (request, response) => controller.currentUser(request, response));
  router.post("/logout", (request, response) => controller.signOut(request, response));

  return router;
}

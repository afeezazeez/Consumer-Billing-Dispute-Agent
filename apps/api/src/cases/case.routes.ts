import { Router } from "express";
import type { AuthMiddleware } from "../auth/auth.middleware";
import { CreateCaseRequestDto } from "../dtos/cases/create-case-request.dto";
import { CreateMessageRequestDto } from "../dtos/cases/create-message-request.dto";
import { validateBody } from "../middlewares/request-validator";
import type { CaseController } from "./case.controller";

export function createCaseRouter(controller: CaseController, authMiddleware: AuthMiddleware): Router {
  const router = Router();
  router.use(authMiddleware.authenticate);
  router.get("/", (request, response, next) => controller.list(request, response, next));
  router.post("/", validateBody(CreateCaseRequestDto), (request, response, next) => controller.create(request, response, next));
  router.get("/:caseId", (request, response, next) => controller.read(request, response, next));
  router.post("/:caseId/messages", validateBody(CreateMessageRequestDto), (request, response, next) => controller.addMessage(request, response, next));
  return router;
}

import { parseCaseAttachments, parseStagedAttachment } from "../middlewares/case-attachments";
import { Router } from "express";
import type { AuthMiddleware } from "../auth/auth.middleware";
import { CreateCaseRequestDto } from "../dtos/cases/create-case-request.dto";
import { CreateMessageRequestDto } from "../dtos/cases/create-message-request.dto";
import { RenameCaseRequestDto } from "../dtos/cases/rename-case-request.dto";
import { RetryCaseMessageRequestDto } from "../dtos/cases/retry-case-message-request.dto";
import { validateBody } from "../middlewares/request-validator";
import type { CaseController } from "./case.controller";

export function createCaseRouter(controller: CaseController, authMiddleware: AuthMiddleware): Router {
  const router = Router();
  router.use(authMiddleware.authenticate);
  router.get("/", (request, response, next) => controller.list(request, response, next));
  router.post("/stream", parseCaseAttachments, validateBody(CreateCaseRequestDto), (request, response) => controller.createStream(request, response));
  router.post("/", validateBody(CreateCaseRequestDto), (request, response, next) => controller.create(request, response, next));
  router.post("/attachments/staged", parseStagedAttachment, (request, response) => controller.stageAttachment(request, response));
  router.delete("/attachments/staged/:attachmentId", (request, response) => controller.discardStagedAttachment(request, response));
  router.get("/attachments/:attachmentId", (request, response) => controller.readAttachment(request, response));
  router.get("/:caseId", (request, response, next) => controller.read(request, response, next));
  router.post("/:caseId/messages/stream", parseCaseAttachments, validateBody(CreateMessageRequestDto), (request, response) => controller.addMessageStream(request, response));
  router.post("/:caseId/messages", validateBody(CreateMessageRequestDto), (request, response, next) => controller.addMessage(request, response, next));
  router.post("/:caseId/messages/:messageId/retry/stream", validateBody(RetryCaseMessageRequestDto), (request, response) => controller.retryMessageStream(request, response));
  router.post("/:caseId/messages/:messageId/retry", validateBody(RetryCaseMessageRequestDto), (request, response, next) => controller.retryMessage(request, response, next));
  router.delete("/:caseId", (request, response, next) => controller.delete(request, response, next));
  router.patch("/:caseId", validateBody(RenameCaseRequestDto), (request, response, next) => controller.rename(request, response, next));
  return router;
}

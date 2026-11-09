import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticatedUserId } from "../auth/auth.middleware";
import { ConfirmDocumentReviewDto } from "../dtos/cases/confirm-document-review.dto";
import { ResponseStatus } from "../enums/response-status";
import { ClientErrorException } from "../exceptions/client.error.exception";
import { validateBody } from "../middlewares/request-validator";
import { sendSuccessResponse } from "../utils/http/response-handlers";
import type { DocumentReviewService } from "./document-review.service";

export function createDocumentReviewRouter(service: DocumentReviewService): Router {
  const router = Router({ mergeParams: true });
  router.post("/extract", async (request, response) => {
    if (!request.is("application/json")) {
      throw new ClientErrorException("Expected a JSON request.", ResponseStatus.BAD_REQUEST);
    }
    const review = await service.extract(authenticatedUserId(request), attachmentId(request.params));
    sendSuccessResponse(response, { review }, "Document details extracted");
  });
  router.put("/", validateBody(ConfirmDocumentReviewDto), async (request, response) => {
    const { provider, amount, chargeDate } = request.body as ConfirmDocumentReviewDto;
    const review = await service.confirm(authenticatedUserId(request), attachmentId(request.params), {
      provider: provider.trim() || null,
      amount: amount.trim() || null,
      chargeDate: chargeDate.trim() || null,
    });
    sendSuccessResponse(response, { review }, "Document review saved");
  });
  return router;
}

function attachmentId(params: Record<string, unknown>): string {
  const id = params.attachmentId;
  if (typeof id === "string" && isUUID(id)) return id;
  throw new ClientErrorException("Attachment not found", ResponseStatus.NOT_FOUND);
}

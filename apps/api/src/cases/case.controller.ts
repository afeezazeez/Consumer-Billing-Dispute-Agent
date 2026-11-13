import { isUUID } from "class-validator";
import type { PendingCaseAttachment } from "./case-attachment";
import type { NextFunction, Request, Response } from "express";
import { CaseConversationDto } from "../dtos/cases/case-conversation.dto";
import { CaseSummaryDto } from "../dtos/cases/case-summary.dto";
import { CreateCaseRequestDto } from "../dtos/cases/create-case-request.dto";
import { CreateMessageRequestDto } from "../dtos/cases/create-message-request.dto";
import { RenameCaseRequestDto } from "../dtos/cases/rename-case-request.dto";
import { RetryCaseMessageRequestDto } from "../dtos/cases/retry-case-message-request.dto";
import { DecideCaseEmailDraftRequestDto } from "../dtos/cases/decide-case-email-draft-request.dto";
import { ClientErrorException } from "../exceptions/client.error.exception";
import { ResponseStatus } from "../enums/response-status";
import { sendSuccessResponse } from "../utils/http/response-handlers";
import { authenticatedUserId } from "../auth/auth.middleware";
import type { CaseConversation } from "./case.repository";
import type { CaseService } from "./case.service";

export class CaseController {
  constructor(private readonly caseService: CaseService) {}

  async list(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const records = await this.caseService.listCases(authenticatedUserId(request));
      sendSuccessResponse(response, { cases: CaseSummaryDto.collection(records) }, "Cases retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async create(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const payload = request.body as CreateCaseRequestDto;
      const input = {
        openingMessage: payload.openingMessage.trim(),
        caseId: payload.caseId,
        messageId: payload.messageId,
        attachmentIds: payload.attachmentIds,
      };
      const record = await this.caseService.createCase(authenticatedUserId(request), input);
      sendSuccessResponse(response, { case: CaseConversationDto.make(record) }, "Case created successfully", ResponseStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async createStream(request: Request, response: Response): Promise<void> {
    const payload = request.body as CreateCaseRequestDto;
    await streamCaseTurn(response, () => this.caseService.createCase(authenticatedUserId(request), {
      openingMessage: payload.openingMessage.trim(),
      caseId: payload.caseId,
      messageId: payload.messageId,
      attachments: response.locals.caseAttachments as PendingCaseAttachment[] | undefined,
      attachmentIds: payload.attachmentIds,
    }));
  }

  async read(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const record = await this.caseService.findCase(authenticatedUserId(request), readCaseId(request));
      if (!record) throw new ClientErrorException("Case not found", ResponseStatus.NOT_FOUND);
      sendSuccessResponse(response, { case: CaseConversationDto.make(record) }, "Case retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async addMessage(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const payload = request.body as CreateMessageRequestDto;
      const input = {
        caseId: readCaseId(request),
        content: payload.content.trim(),
        messageId: payload.messageId,
        attachmentIds: payload.attachmentIds,
      };
      const record = await this.caseService.appendMessage(authenticatedUserId(request), input);
      if (!record) throw new ClientErrorException("Case not found", ResponseStatus.NOT_FOUND);
      sendSuccessResponse(response, { case: CaseConversationDto.make(record) }, "Message added successfully", ResponseStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async addMessageStream(request: Request, response: Response): Promise<void> {
    const payload = request.body as CreateMessageRequestDto;
    await streamCaseTurn(response, () => this.caseService.appendMessage(authenticatedUserId(request), {
      caseId: readCaseId(request),
      content: payload.content.trim(),
      messageId: payload.messageId,
      attachments: response.locals.caseAttachments as PendingCaseAttachment[] | undefined,
      attachmentIds: payload.attachmentIds,
    }));
  }

  async stageAttachment(request: Request, response: Response): Promise<void> {
    const files = response.locals.caseAttachments as PendingCaseAttachment[] | undefined;
    if (files?.length !== 1) throw new ClientErrorException("Select one attachment.", ResponseStatus.BAD_REQUEST);
    const id = await this.caseService.stageAttachment(authenticatedUserId(request), files[0]);
    sendSuccessResponse(response, { id }, "Attachment uploaded", ResponseStatus.CREATED);
  }

  async discardStagedAttachment(request: Request, response: Response): Promise<void> {
    const { attachmentId } = request.params;
    if (typeof attachmentId !== "string" || !isUUID(attachmentId)) {
      throw new ClientErrorException("Attachment not found", ResponseStatus.NOT_FOUND);
    }
    await this.caseService.discardStagedAttachment(authenticatedUserId(request), attachmentId);
    response.sendStatus(204);
  }

  async readAttachment(request: Request, response: Response): Promise<void> {
    const { attachmentId } = request.params;
    if (typeof attachmentId !== "string" || !isUUID(attachmentId)) {
      throw new ClientErrorException("Attachment not found", ResponseStatus.NOT_FOUND);
    }
    const attachment = await this.caseService.findAttachment(authenticatedUserId(request), attachmentId);
    if (!attachment) throw new ClientErrorException("Attachment not found", ResponseStatus.NOT_FOUND);
    if (!attachment.mediaType.startsWith("image/")) response.attachment(attachment.name);
    response.set({
      "Content-Type": attachment.mediaType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.send(attachment.data);
  }

  async retryMessage(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const payload = request.body as RetryCaseMessageRequestDto;
      const result = await this.caseService.retryFailedMessage(authenticatedUserId(request), {
        caseId: readCaseId(request),
        messageId: readMessageId(request),
        content: payload.content,
      });
      if (!result) throw new ClientErrorException("Message is no longer available to retry", ResponseStatus.CONFLICT);
      sendSuccessResponse(response, { case: CaseConversationDto.make(result) }, "Message retry completed");
    } catch (error) {
      next(error);
    }
  }

  async decideEmailDraft(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const payload = request.body as DecideCaseEmailDraftRequestDto;
      const decision = payload.decision === "approve"
        ? { decision: payload.decision, draft: { recipients: payload.recipients ?? "", subject: payload.subject ?? "", body: payload.body ?? "" } }
        : { decision: payload.decision };
      const billingCase = await this.caseService.decideEmailDraft(
        authenticatedUserId(request), readCaseId(request), readMessageId(request), decision,
      );
      if (!billingCase) throw new ClientErrorException("Case or email draft not found", ResponseStatus.NOT_FOUND);
      sendSuccessResponse(response, { case: CaseConversationDto.make(billingCase) }, "Email draft decision recorded");
    } catch (error) {
      next(error);
    }
  }

  async retryMessageStream(request: Request, response: Response): Promise<void> {
    const payload = request.body as RetryCaseMessageRequestDto;
    await streamCaseTurn(response, () => this.caseService.retryFailedMessage(authenticatedUserId(request), {
      caseId: readCaseId(request),
      messageId: readMessageId(request),
      content: payload.content,
    }));
  }

  async delete(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await this.caseService.deleteCase(authenticatedUserId(request), readCaseId(request));
      if (!deleted) throw new ClientErrorException("Case not found", ResponseStatus.NOT_FOUND);
      sendSuccessResponse(response, {}, "Case deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  async rename(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const payload = request.body as RenameCaseRequestDto;
      const renamed = await this.caseService.renameCase(authenticatedUserId(request), readCaseId(request), payload.title);
      if (!renamed) throw new ClientErrorException("Case not found", ResponseStatus.NOT_FOUND);
      sendSuccessResponse(response, {}, "Case renamed successfully");
    } catch (error) {
      next(error);
    }
  }
}

type StreamCaseOperation = () => Promise<CaseConversation | undefined>;

async function streamCaseTurn(response: Response, operation: StreamCaseOperation): Promise<void> {
  initializeEventStream(response);
  try {
    const billingCase = await operation();
    if (!billingCase) return sendEvent(response, "failure", { message: "That case or message could not be found." });
    sendEvent(response, "done", { case: CaseConversationDto.make(billingCase) });
  } catch (error) {
    const message = error instanceof ClientErrorException
      ? error.message
      : "We couldn’t complete that request. Please try again.";
    sendEvent(response, "failure", { message });
  } finally {
    response.end();
  }
}

function initializeEventStream(response: Response): void {
  response.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();
}

function sendEvent(response: Response, eventName: string, data: unknown): void {
  if (response.destroyed || response.writableEnded) return;
  response.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

function readCaseId(request: Request): string {
  const caseId = request.params.caseId;
  if (typeof caseId !== "string") throw new ClientErrorException("Case not found", ResponseStatus.NOT_FOUND);
  return caseId;
}

function readMessageId(request: Request): string {
  const messageId = request.params.messageId;
  if (typeof messageId !== "string") throw new ClientErrorException("Message not found", ResponseStatus.NOT_FOUND);
  return messageId;
}

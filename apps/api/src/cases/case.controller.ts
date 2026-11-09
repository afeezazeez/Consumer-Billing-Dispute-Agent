import type { NextFunction, Request, Response } from "express";
import { CaseConversationDto } from "../dtos/cases/case-conversation.dto";
import { CaseSummaryDto } from "../dtos/cases/case-summary.dto";
import { CreateCaseRequestDto } from "../dtos/cases/create-case-request.dto";
import { CreateMessageRequestDto } from "../dtos/cases/create-message-request.dto";
import { RenameCaseRequestDto } from "../dtos/cases/rename-case-request.dto";
import { RetryCaseMessageRequestDto } from "../dtos/cases/retry-case-message-request.dto";
import { ClientErrorException } from "../exceptions/client.error.exception";
import { ResponseStatus } from "../enums/response-status";
import { sendSuccessResponse } from "../utils/http/response-handlers";
import { authenticatedFirstName, authenticatedUserId } from "../auth/auth.middleware";
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
        userFirstName: authenticatedFirstName(request),
      };
      const record = await this.caseService.createCase(authenticatedUserId(request), input);
      sendSuccessResponse(response, { case: CaseConversationDto.make(record) }, "Case created successfully", ResponseStatus.CREATED);
    } catch (error) {
      next(error);
    }
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
        userFirstName: authenticatedFirstName(request),
      };
      const record = await this.caseService.appendMessage(authenticatedUserId(request), input);
      if (!record) throw new ClientErrorException("Case not found", ResponseStatus.NOT_FOUND);
      sendSuccessResponse(response, { case: CaseConversationDto.make(record) }, "Message added successfully", ResponseStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async retryMessage(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const payload = request.body as RetryCaseMessageRequestDto;
      const result = await this.caseService.retryFailedMessage(authenticatedUserId(request), {
        caseId: readCaseId(request),
        messageId: readMessageId(request),
        content: payload.content,
        userFirstName: authenticatedFirstName(request),
      });
      if (!result) throw new ClientErrorException("Message is no longer available to retry", ResponseStatus.CONFLICT);
      sendSuccessResponse(response, { case: CaseConversationDto.make(result) }, "Message retry completed");
    } catch (error) {
      next(error);
    }
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

import type { NextFunction, Request, Response } from "express";
import { CaseConversationDto } from "../dtos/cases/case-conversation.dto";
import { CaseSummaryDto } from "../dtos/cases/case-summary.dto";
import { CreateCaseRequestDto } from "../dtos/cases/create-case-request.dto";
import { CreateMessageRequestDto } from "../dtos/cases/create-message-request.dto";
import { RenameCaseRequestDto } from "../dtos/cases/rename-case-request.dto";
import { ClientErrorException } from "../exceptions/client.error.exception";
import { ResponseStatus } from "../enums/response-status";
import { sendSuccessResponse } from "../utils/http/response-handlers";
import { authenticatedUserId } from "../auth/auth.middleware";
import type { CaseService } from "./case.service";

export class CaseController {
  constructor(private readonly cases: CaseService) {}

  async list(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const records = await this.cases.listCases(authenticatedUserId(request));
      sendSuccessResponse(response, { cases: CaseSummaryDto.collection(records) }, "Cases retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async create(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const payload = request.body as CreateCaseRequestDto;
      const record = await this.cases.createCase(authenticatedUserId(request), payload.openingMessage.trim());
      sendSuccessResponse(response, { case: CaseConversationDto.make(record) }, "Case created successfully", ResponseStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async read(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const record = await this.cases.findCase(authenticatedUserId(request), readCaseId(request));
      if (!record) throw new ClientErrorException("Case not found", ResponseStatus.NOT_FOUND);
      sendSuccessResponse(response, { case: CaseConversationDto.make(record) }, "Case retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async addMessage(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const payload = request.body as CreateMessageRequestDto;
      const record = await this.cases.appendMessage(authenticatedUserId(request), readCaseId(request), payload.content.trim());
      if (!record) throw new ClientErrorException("Case not found", ResponseStatus.NOT_FOUND);
      sendSuccessResponse(response, { case: CaseConversationDto.make(record) }, "Message added successfully", ResponseStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async delete(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await this.cases.deleteCase(authenticatedUserId(request), readCaseId(request));
      if (!deleted) throw new ClientErrorException("Case not found", ResponseStatus.NOT_FOUND);
      sendSuccessResponse(response, {}, "Case deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  async rename(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const payload = request.body as RenameCaseRequestDto;
      const renamed = await this.cases.renameCase(authenticatedUserId(request), readCaseId(request), payload.title);
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

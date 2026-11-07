import type { Response } from "express";
import { ErrorResponseDto } from "../../dtos/http-response/error-response.dto";
import { SuccessResponseDto } from "../../dtos/http-response/success-response.dto";
import { ResponseStatus } from "../../enums/response-status";

export function sendSuccessResponse<T>(
  response: Response,
  data?: T,
  message?: string,
  statusCode: number = ResponseStatus.OK,
): void {
  response.status(statusCode).json(new SuccessResponseDto(message, data));
}

export function sendErrorResponse<T>(
  response: Response,
  errors?: T,
  message?: string,
  statusCode: number = ResponseStatus.INTERNAL_SERVER_ERROR,
): void {
  response.status(statusCode).json(new ErrorResponseDto(message, errors));
}

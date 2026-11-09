import type { ErrorRequestHandler } from "express";
import { AuthenticationException } from "../exceptions/authentication.exception";
import { ClientErrorException } from "../exceptions/client.error.exception";
import { ValidationException } from "../exceptions/validation.exception";
import { ResponseStatus } from "../enums/response-status";
import { ServiceUnavailableException } from "../exceptions/service-unavailable.exception";
import { sendErrorResponse } from "../utils/http/response-handlers";

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next) => {
  if (response.headersSent) return next(error);
  if (error instanceof AuthenticationException) {
    return sendErrorResponse(response, undefined, error.message, error.statusCode);
  }
  if (error instanceof ValidationException) {
    return sendErrorResponse(response, error.errors, error.message, error.statusCode);
  }
  if (error instanceof ServiceUnavailableException) {
    return sendErrorResponse(response, undefined, error.message, error.statusCode);
  }
  if (error instanceof ClientErrorException) {
    return sendErrorResponse(response, undefined, error.message, error.statusCode);
  }
  logRequestError(error, request.method, request.path);
  return sendErrorResponse(response, undefined, "An error occurred. Please try again later.", ResponseStatus.INTERNAL_SERVER_ERROR);
};

function logRequestError(error: unknown, method: string, path: string): void {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(JSON.stringify({ event: "request_failed", method, path, errorName }));
}

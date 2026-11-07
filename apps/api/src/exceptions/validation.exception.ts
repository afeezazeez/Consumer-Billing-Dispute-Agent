import { ResponseStatus } from "../enums/response-status";

export class ValidationException extends Error {
  readonly statusCode = ResponseStatus.UNPROCESSABLE_ENTITY;

  constructor(readonly errors: Record<string, string[]>, message = "Validation failed") {
    super(message);
    this.name = "ValidationException";
  }
}

import { ResponseStatus } from "../enums/response-status";

export class AuthenticationException extends Error {
  readonly statusCode = ResponseStatus.UNAUTHORIZED;

  constructor(message = "Session timed out. Please sign in again to continue.") {
    super(message);
    this.name = "AuthenticationException";
  }
}

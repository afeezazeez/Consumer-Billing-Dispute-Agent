import { ResponseStatus } from "../enums/response-status";

export class ServiceUnavailableException extends Error {
  readonly statusCode = ResponseStatus.SERVICE_UNAVAILABLE;

  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableException";
  }
}

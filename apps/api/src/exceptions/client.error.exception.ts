import { ResponseStatus } from "../enums/response-status";

export class ClientErrorException extends Error {
  constructor(message: string, readonly statusCode: number = ResponseStatus.BAD_REQUEST) {
    super(message);
    this.name = "ClientErrorException";
  }
}

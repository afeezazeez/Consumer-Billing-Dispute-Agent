import type { NextFunction, Request, Response } from "express";
import { AuthenticationException } from "../exceptions/authentication.exception";

export class AuthMiddleware {
  authenticate(request: Request, _response: Response, next: NextFunction): void {
    const userId = request.session.userId;
    if (!userId) {
      next(new AuthenticationException());
      return;
    }
    request.authenticatedUserId = userId;
    next();
  }
}

export function authenticatedUserId(request: Request): string {
  const userId = request.authenticatedUserId;
  if (!userId) throw new AuthenticationException();
  return userId;
}

export function authenticatedFirstName(request: Request): string | undefined {
  return request.session.firstName;
}

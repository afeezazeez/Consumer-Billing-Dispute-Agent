import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "../../config";
import { GmailConnectionStatusDto } from "../../dtos/connectors/gmail-connection-status.dto";
import { AuthenticationException } from "../../exceptions/authentication.exception";
import { sendSuccessResponse } from "../../utils/http/response-handlers";
import { readCallbackParameters, validateOAuthState } from "../../auth/utils/oauth-callback";
import { saveSession } from "../../auth/utils/session";
import type { GmailConnectorService } from "./gmail-connector.service";

export class GmailConnectorController {
  constructor(private readonly gmailConnectorService: GmailConnectorService, private readonly config: AppConfig) {}

  async startConnection(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const state = randomBytes(32).toString("hex");
      request.session.gmailConnectorOAuthState = state;
      request.session.gmailConnectorReturnTo = readSafeCasePath(request.query.returnTo);
      await saveSession(request);
      response.redirect(this.gmailConnectorService.createAuthorizationUrl(state));
    } catch (error) {
      next(error);
    }
  }

  async finishConnection(request: Request, response: Response): Promise<void> {
    const userId = request.session.userId;
    const returnTo = request.session.gmailConnectorReturnTo;
    delete request.session.gmailConnectorReturnTo;
    try {
      if (!userId) throw new AuthenticationException();
      const { code, state } = readCallbackParameters(request);
      validateOAuthState(request.session.gmailConnectorOAuthState, state);
      delete request.session.gmailConnectorOAuthState;
      await this.gmailConnectorService.connect(userId, code);
      response.redirect(buildRedirectUrl(this.config.webOrigin, returnTo, "connected"));
    } catch {
      delete request.session.gmailConnectorOAuthState;
      response.redirect(buildRedirectUrl(this.config.webOrigin, returnTo, "failed"));
    }
  }

  async status(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const status = await this.gmailConnectorService.getStatus(requireUserId(request));
      sendSuccessResponse(response, GmailConnectionStatusDto.make(status));
    } catch (error) {
      next(error);
    }
  }

  async disconnect(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      await this.gmailConnectorService.disconnect(requireUserId(request));
      sendSuccessResponse(response, undefined, "Gmail disconnected successfully");
    } catch (error) {
      next(error);
    }
  }
}

function readSafeCasePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return /^\/cases\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;
}

function buildRedirectUrl(origin: string, returnTo: string | undefined, result: "connected" | "failed"): string {
  return returnTo ? `${origin}${returnTo}?gmail=${result}` : `${origin}/connectors?gmail=${result}`;
}

function requireUserId(request: Request): string {
  if (!request.session.userId) throw new AuthenticationException();
  return request.session.userId;
}

import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { GoogleUserDto } from "../dtos/auth/google-user.dto";
import { sendSuccessResponse } from "../utils/http/response-handlers";
import { ResponseStatus } from "../enums/response-status";
import { AuthenticationException } from "../exceptions/authentication.exception";
import type { AppConfig } from "../config";
import type { AuthService } from "./auth.service";
import { authenticatedUserId } from "./auth.middleware";
import { readCallbackParameters, validateOAuthState } from "./utils/oauth-callback";
import { destroySession, regenerateSession, saveSession } from "./utils/session";

export class AuthController {
  constructor(private readonly authService: AuthService, private readonly config: AppConfig) {}

  startGoogleSignIn(request: Request, response: Response, next: NextFunction): void {
    try {
      const state = randomBytes(32).toString("hex");
      request.session.oauthState = state;
      response.redirect(this.authService.createGoogleAuthorizationUrl(state));
    } catch (error) {
      next(error);
    }
  }

  async finishGoogleSignIn(request: Request, response: Response): Promise<void> {
    try {
      await this.completeGoogleSignIn(request);
      response.redirect(`${this.config.webOrigin}/dashboard`);
    } catch {
      response.redirect(`${this.config.webOrigin}/login?error=oauth_failed`);
    }
  }

  async currentUser(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = await this.authService.findUser(authenticatedUserId(request));
      if (!user) throw new AuthenticationException();
      request.session.firstName = getFirstName(user.displayName);
      sendSuccessResponse(response, GoogleUserDto.make(user), "User retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async signOut(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      await destroySession(request);
      response.clearCookie("billing.sid");
      sendSuccessResponse(response, undefined, "Signed out successfully", ResponseStatus.OK);
    } catch (error) {
      next(error);
    }
  }

  private async completeGoogleSignIn(request: Request): Promise<void> {
    const { code, state } = readCallbackParameters(request);
    validateOAuthState(request.session.oauthState, state);
    const user = await this.authService.signInWithGoogle(code);
    await regenerateSession(request);
    request.session.userId = user.id;
    request.session.firstName = getFirstName(user.displayName);
    await saveSession(request);
  }
}

function getFirstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || "there";
}

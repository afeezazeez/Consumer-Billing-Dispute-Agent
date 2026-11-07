import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { AppConfig } from "../config";
import type { AuthService } from "./auth.service";

export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  startGoogleSignIn(request: Request, response: Response): void {
    const state = randomBytes(32).toString("hex");
    request.session.oauthState = state;
    response.redirect(this.auth.createGoogleAuthorizationUrl(state));
  }

  async finishGoogleSignIn(request: Request, response: Response): Promise<void> {
    try {
      const { code, state } = readCallbackParameters(request);
      validateOAuthState(request.session.oauthState, state);
      const user = await this.auth.signInWithGoogle(code);
      await regenerateSession(request);
      request.session.userId = user.id;
      await saveSession(request);
      response.redirect(`${this.config.webOrigin}/login?authenticated=1`);
    } catch {
      console.error(JSON.stringify({ event: "google_oauth_callback_failed" }));
      response.redirect(`${this.config.webOrigin}/login?error=oauth_failed`);
    }
  }

  async currentUser(request: Request, response: Response): Promise<void> {
    const userId = request.session.userId;
    if (!userId) {
      response.status(401).json({ error: "not_authenticated" });
      return;
    }

    const user = await this.auth.findUser(userId);
    if (!user) {
      response.status(401).json({ error: "not_authenticated" });
      return;
    }
    response.status(200).json({ user });
  }

  async signOut(request: Request, response: Response): Promise<void> {
    await destroySession(request);
    response.clearCookie("billing.sid");
    response.status(204).end();
  }
}

function readCallbackParameters(request: Request): { code: string; state: string } {
  const code = request.query.code;
  const state = request.query.state;
  if (typeof code !== "string" || typeof state !== "string") {
    throw new Error("OAuth callback parameters are missing");
  }
  return { code, state };
}

function validateOAuthState(expected: string | undefined, received: string): void {
  if (!expected || expected !== received) throw new Error("OAuth state did not match");
}

function regenerateSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function destroySession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

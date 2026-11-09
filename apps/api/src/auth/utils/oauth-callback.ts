import type { Request } from "express";

export function readCallbackParameters(request: Request): { code: string; state: string } {
  const code = request.query.code;
  const state = request.query.state;
  if (typeof code !== "string" || typeof state !== "string") {
    throw new Error("OAuth callback parameters are missing");
  }
  return { code, state };
}

export function validateOAuthState(expected: string | undefined, received: string): void {
  if (!expected || expected !== received) throw new Error("OAuth state did not match");
}

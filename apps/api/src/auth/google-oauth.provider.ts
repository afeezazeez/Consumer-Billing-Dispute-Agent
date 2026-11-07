import { OAuth2Client } from "google-auth-library";
import type { GoogleIdentity } from "./user.repository";

export class GoogleOAuthProvider {
  private readonly client: OAuth2Client;

  constructor(
    private readonly clientId: string,
    clientSecret: string,
    private readonly redirectUri: string,
  ) {
    this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  createAuthorizationUrl(state: string): string {
    return this.client.generateAuthUrl({
      access_type: "online",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state,
    });
  }

  async getIdentity(code: string): Promise<GoogleIdentity> {
    const { tokens } = await this.client.getToken(code);
    if (!tokens.id_token) throw new Error("Google did not return an ID token");

    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new Error("Google account identity could not be verified");
    }

    return {
      subject: payload.sub,
      email: payload.email,
      displayName: payload.name || payload.email,
      pictureUrl: payload.picture || "",
    };
  }
}

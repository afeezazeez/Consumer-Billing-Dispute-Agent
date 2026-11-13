import { OAuth2Client } from "google-auth-library";
import type { ApprovedCaseEmailDraft } from "../../cases/case-email-draft";
import { EmailDeliveryError } from "../email/email-delivery-error";

export interface GmailGoogleAccount {
  subject: string;
  email: string;
  refreshToken: string;
}

export class GmailOAuthProvider {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string, clientSecret: string, redirectUri: string) {
    this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  private readonly clientSecret: string;
  private readonly redirectUri: string;

  createAuthorizationUrl(state: string): string {
    return this.client.generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      prompt: "consent select_account",
      scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.send"],
      state,
    });
  }

  async exchangeCode(code: string): Promise<GmailGoogleAccount> {
    const { tokens } = await this.client.getToken(code);
    if (!tokens.id_token || !tokens.refresh_token) throw new Error("Google did not grant offline Gmail access");
    if (!tokens.scope?.split(" ").includes("https://www.googleapis.com/auth/gmail.send")) {
      throw new Error("Google did not grant Gmail send permission");
    }
    const ticket = await this.client.verifyIdToken({ idToken: tokens.id_token, audience: this.clientId });
    const identity = ticket.getPayload();
    if (!identity?.sub || !identity.email || identity.email_verified !== true) {
      throw new Error("Google account identity could not be verified");
    }
    return { subject: identity.sub, email: identity.email, refreshToken: tokens.refresh_token };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.client.revokeToken(refreshToken);
  }

  async sendEmail(refreshToken: string, draft: ApprovedCaseEmailDraft): Promise<void> {
    const accessToken = await this.getAccessTokenForSend(refreshToken);
    const raw = Buffer.from(createMimeMessage(draft)).toString("base64url");
    const response = await this.requestSend(accessToken, raw);
    if (!response.ok) throw await createSendError(response);
  }

  private async getAccessTokenForSend(refreshToken: string): Promise<string> {
    try { return await this.getAccessToken(refreshToken); }
    catch { throw new EmailDeliveryError("Gmail authorization failed before sending.", "not_sent", "token_refresh_failed"); }
  }

  private async requestSend(accessToken: string, raw: string): Promise<Response> {
    try {
      return await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
    } catch {
      throw new EmailDeliveryError("Gmail’s response could not be reached.", "unknown", "network_error");
    }
  }

  private async getAccessToken(refreshToken: string): Promise<string> {
    const client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri);
    client.setCredentials({ refresh_token: refreshToken });
    const result = await client.getAccessToken();
    if (!result.token) throw new Error("Unable to refresh Gmail access");
    return result.token;
  }
}

async function createSendError(response: Response): Promise<EmailDeliveryError> {
  const providerCode = await readProviderCode(response);
  const certainty = response.status >= 500 ? "unknown" : "rejected";
  return new EmailDeliveryError("Gmail did not accept the email.", certainty, providerCode, response.status);
}

async function readProviderCode(response: Response): Promise<string> {
  try {
    const payload = await response.json() as GoogleErrorPayload;
    const rawCode = payload.error?.errors?.[0]?.reason ?? payload.error?.status;
    return typeof rawCode === "string" && /^[\w.-]{1,64}$/.test(rawCode) ? rawCode : "http_error";
  } catch {
    return "http_error";
  }
}

interface GoogleErrorPayload {
  error?: { status?: string; errors?: { reason?: string }[] };
}

function createMimeMessage(draft: ApprovedCaseEmailDraft): string {
  return [
    `To: ${draft.recipients.split(/[;,]/).map((recipient) => recipient.trim()).join(", ")}`,
    `Subject: ${encodeHeader(draft.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(draft.body, "utf8").toString("base64"),
  ].join("\r\n");
}

function encodeHeader(value: string): string {
  return /^[\x00-\x7F]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

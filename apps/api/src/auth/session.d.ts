import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    firstName?: string;
    oauthState?: string;
    gmailConnectorOAuthState?: string;
    gmailConnectorReturnTo?: string;
  }
}

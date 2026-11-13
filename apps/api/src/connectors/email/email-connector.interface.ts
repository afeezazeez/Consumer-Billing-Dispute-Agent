export interface EmailConnectorStatus {
  configured: boolean;
  connected: boolean;
  email?: string;
}

export interface EmailConnector {
  createAuthorizationUrl(state: string): string;
  connect(userId: string, authorizationCode: string): Promise<void>;
  getStatus(userId: string): Promise<EmailConnectorStatus>;
  disconnect(userId: string): Promise<void>;
  sendEmail(userId: string, draft: ApprovedCaseEmailDraft): Promise<void>;
}
import type { ApprovedCaseEmailDraft } from "../../cases/case-email-draft";

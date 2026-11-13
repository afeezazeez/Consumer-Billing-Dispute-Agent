import type { EmailConnectorStatus } from "../../connectors/email/email-connector.interface";

export class GmailConnectionStatusDto {
  configured: boolean;
  connected: boolean;
  email?: string;

  private constructor(status: EmailConnectorStatus) {
    this.configured = status.configured;
    this.connected = status.connected;
    this.email = status.email;
  }

  static make(status: EmailConnectorStatus): GmailConnectionStatusDto {
    return new GmailConnectionStatusDto(status);
  }
}

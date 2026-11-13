import { randomUUID } from "node:crypto";
import { ServiceUnavailableException } from "../../exceptions/service-unavailable.exception";
import type { EmailConnector, EmailConnectorStatus } from "../email/email-connector.interface";
import type { GmailConnectorRepository } from "./gmail-connector.repository";
import type { GmailOAuthProvider } from "./gmail-oauth.provider";
import type { GmailTokenEncryptionService } from "./gmail-token-encryption.service";
import type { ApprovedCaseEmailDraft } from "../../cases/case-email-draft";

export class GmailConnectorService implements EmailConnector {
  constructor(
    private readonly gmailOAuthProvider: GmailOAuthProvider | undefined,
    private readonly gmailTokenEncryptionService: GmailTokenEncryptionService | undefined,
    private readonly gmailConnectorRepository: GmailConnectorRepository,
  ) {}

  createAuthorizationUrl(state: string): string {
    return this.requireProvider().createAuthorizationUrl(state);
  }

  async connect(userId: string, code: string): Promise<void> {
    const account = await this.requireProvider().exchangeCode(code);
    const encrypted = this.requireEncryption().encrypt(account.refreshToken);
    await this.gmailConnectorRepository.save({
      id: randomUUID(), userId, googleSubject: account.subject, googleEmail: account.email,
      encryptedRefreshToken: encrypted.ciphertext, encryptionIv: encrypted.iv, encryptionAuthTag: encrypted.authTag,
    });
  }

  async getStatus(userId: string): Promise<EmailConnectorStatus> {
    const connection = await this.gmailConnectorRepository.findByUserId(userId);
    const configured = Boolean(this.gmailOAuthProvider && this.gmailTokenEncryptionService);
    return connection
      ? { configured, connected: true, email: connection.googleEmail }
      : { configured, connected: false };
  }

  async disconnect(userId: string): Promise<void> {
    const connection = await this.gmailConnectorRepository.findByUserId(userId);
    if (!connection) return;
    if (!this.gmailOAuthProvider || !this.gmailTokenEncryptionService) {
      await this.gmailConnectorRepository.deleteByUserId(userId);
      return;
    }
    const refreshToken = this.requireEncryption().decrypt({
      ciphertext: connection.encryptedRefreshToken,
      iv: connection.encryptionIv,
      authTag: connection.encryptionAuthTag,
    });
    await this.requireProvider().revokeRefreshToken(refreshToken);
    await this.gmailConnectorRepository.deleteByUserId(userId);
  }

  async sendEmail(userId: string, draft: ApprovedCaseEmailDraft): Promise<void> {
    const connection = await this.requireConnection(userId);
    const refreshToken = this.requireEncryption().decrypt({
      ciphertext: connection.encryptedRefreshToken,
      iv: connection.encryptionIv,
      authTag: connection.encryptionAuthTag,
    });
    await this.requireProvider().sendEmail(refreshToken, draft);
  }

  private async requireConnection(userId: string) {
    const connection = await this.gmailConnectorRepository.findByUserId(userId);
    if (!connection) throw new ServiceUnavailableException("Connect Gmail before sending an email draft.");
    return connection;
  }

  private requireProvider(): GmailOAuthProvider {
    if (!this.gmailOAuthProvider) throw new ServiceUnavailableException("Gmail connection is not configured yet");
    return this.gmailOAuthProvider;
  }

  private requireEncryption(): GmailTokenEncryptionService {
    if (!this.gmailTokenEncryptionService) throw new ServiceUnavailableException("Gmail connection is not configured yet");
    return this.gmailTokenEncryptionService;
  }
}

import type { AppConfig } from "../../config";
import type { DataSource } from "typeorm";
import { TypeOrmGmailConnectorRepository } from "../../database/typeorm-gmail-connector.repository";
import { GmailConnectorService } from "./gmail-connector.service";
import { GmailOAuthProvider } from "./gmail-oauth.provider";
import { GmailTokenEncryptionService } from "./gmail-token-encryption.service";

export function createGmailConnectorService(config: AppConfig, dataSource: DataSource): GmailConnectorService {
  const gmailConfig = config.gmailConnector;
  const provider = gmailConfig
    ? new GmailOAuthProvider(config.googleClientId, config.googleClientSecret, gmailConfig.redirectUri)
    : undefined;
  const encryption = gmailConfig ? new GmailTokenEncryptionService(gmailConfig.tokenEncryptionKey) : undefined;
  return new GmailConnectorService(provider, encryption, new TypeOrmGmailConnectorRepository(dataSource));
}

export interface GmailConnection {
  id: string;
  userId: string;
  googleSubject: string;
  googleEmail: string;
  encryptedRefreshToken: string;
  encryptionIv: string;
  encryptionAuthTag: string;
}

export interface GmailConnectorRepository {
  findByUserId(userId: string): Promise<GmailConnection | undefined>;
  save(connection: GmailConnection): Promise<GmailConnection>;
  deleteByUserId(userId: string): Promise<void>;
}

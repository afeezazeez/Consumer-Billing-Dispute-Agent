import { EntitySchema } from "typeorm";

export class GmailConnectorEntity {
  id!: string;
  userId!: string;
  googleSubject!: string;
  googleEmail!: string;
  encryptedRefreshToken!: string;
  encryptionIv!: string;
  encryptionAuthTag!: string;
  connectedAt!: Date;
  updatedAt!: Date;
}

export const gmailConnectorSchema = new EntitySchema<GmailConnectorEntity>({
  name: "GmailConnector",
  target: GmailConnectorEntity,
  tableName: "gmail_connectors",
  columns: {
    id: { type: "uuid", primary: true },
    userId: { name: "user_id", type: "uuid", unique: true },
    googleSubject: { name: "google_subject", type: "varchar", length: 255 },
    googleEmail: { name: "google_email", type: "varchar", length: 320 },
    encryptedRefreshToken: { name: "encrypted_refresh_token", type: "text" },
    encryptionIv: { name: "encryption_iv", type: "varchar", length: 32 },
    encryptionAuthTag: { name: "encryption_auth_tag", type: "varchar", length: 32 },
    connectedAt: { name: "connected_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
});

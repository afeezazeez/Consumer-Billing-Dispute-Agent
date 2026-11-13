import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export class GmailTokenEncryptionService {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    this.key = Buffer.from(hexKey, "hex");
    if (this.key.length !== 32) throw new Error("Gmail token encryption key must contain 32 bytes");
  }

  encrypt(token: string): EncryptedToken {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("hex"), authTag: cipher.getAuthTag().toString("hex") };
  }

  decrypt(token: EncryptedToken): string {
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(token.iv, "hex"));
    decipher.setAuthTag(Buffer.from(token.authTag, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(token.ciphertext, "base64")), decipher.final()]).toString("utf8");
  }
}

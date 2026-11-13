import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { GmailConnectorEntity } from "./entities/gmail-connector.entity";
import type { GmailConnection, GmailConnectorRepository } from "../connectors/gmail/gmail-connector.repository";

export class TypeOrmGmailConnectorRepository implements GmailConnectorRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByUserId(userId: string): Promise<GmailConnection | undefined> {
    const entity = await this.dataSource.getRepository(GmailConnectorEntity).findOneBy({ userId });
    return entity ? toConnection(entity) : undefined;
  }

  async save(connection: GmailConnection): Promise<GmailConnection> {
    const repository = this.dataSource.getRepository(GmailConnectorEntity);
    const current = await repository.findOneBy({ userId: connection.userId });
    return toConnection(await repository.save(repository.create({ ...connection, id: current?.id ?? randomUUID() })));
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.dataSource.getRepository(GmailConnectorEntity).delete({ userId });
  }
}

function toConnection(entity: GmailConnectorEntity): GmailConnection {
  return {
    id: entity.id,
    userId: entity.userId,
    googleSubject: entity.googleSubject,
    googleEmail: entity.googleEmail,
    encryptedRefreshToken: entity.encryptedRefreshToken,
    encryptionIv: entity.encryptionIv,
    encryptionAuthTag: entity.encryptionAuthTag,
  };
}

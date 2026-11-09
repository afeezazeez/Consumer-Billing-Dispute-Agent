import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { UserEntity } from "./entities/user.entity";
import type { GoogleIdentity, UserRecord, UserRepository } from "../auth/user.repository";

export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  async saveGoogleIdentity(identity: GoogleIdentity): Promise<UserRecord> {
    const repository = this.dataSource.getRepository(UserEntity);
    const existing = await repository.findOneBy({ googleSubject: identity.subject });
    const user = repository.create({
      id: existing?.id ?? randomUUID(),
      googleSubject: identity.subject,
      email: identity.email,
      displayName: identity.displayName,
      pictureUrl: identity.pictureUrl,
    });
    return toUserRecord(await repository.save(user));
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const user = await this.dataSource.getRepository(UserEntity).findOneBy({ id });
    return user ? toUserRecord(user) : undefined;
  }
}

function toUserRecord(user: UserEntity): UserRecord {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    pictureUrl: user.pictureUrl,
  };
}

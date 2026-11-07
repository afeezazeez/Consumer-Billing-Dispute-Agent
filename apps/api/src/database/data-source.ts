import { DataSource } from "typeorm";
import { CreateUsers1710000000000 } from "./migrations/1710000000000-CreateUsers";
import { userSchema } from "./user.entity";

export function createDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    entities: [userSchema],
    migrations: [CreateUsers1710000000000],
    synchronize: false,
  });
}

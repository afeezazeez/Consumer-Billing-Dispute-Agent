import { DataSource } from "typeorm";
import type { PostgresConfig } from "../config";
import { CreateUsers1710000000000 } from "./migrations/1710000000000-CreateUsers";
import { userSchema } from "./user.entity";

export function createDataSource(database: PostgresConfig): DataSource {
  return new DataSource({
    type: "postgres",
    host: database.host,
    port: database.port,
    database: database.database,
    username: database.username,
    password: database.password,
    entities: [userSchema],
    migrations: [CreateUsers1710000000000],
    synchronize: false,
  });
}

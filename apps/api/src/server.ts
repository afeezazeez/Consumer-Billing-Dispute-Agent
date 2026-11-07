import "dotenv/config";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { loadConfig } from "./config";
import { createDataSource } from "./database/data-source";
import { createApp } from "./app";

async function startServer(): Promise<void> {
  const config = loadConfig();
  const dataSource = await connectDatabase(config.databaseUrl);
  const sessionStore = createPostgresSessionStore(config.databaseUrl);
  const app = createApp(config, dataSource, sessionStore);
  listen(app, config.port);
}

async function connectDatabase(databaseUrl: string) {
  const dataSource = createDataSource(databaseUrl);
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
}

function createPostgresSessionStore(databaseUrl: string) {
  const PostgreSqlStore = connectPgSimple(session);
  return new PostgreSqlStore({
    pool: new Pool({ connectionString: databaseUrl }),
    tableName: "user_sessions",
    createTableIfMissing: true,
  });
}

function listen(app: ReturnType<typeof createApp>, port: number): void {
  app.listen(port, "0.0.0.0", () => {
    console.info(`Billing agent API listening on port ${port}`);
  });
}

void startServer().catch((error: unknown) => {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  console.error(`Billing agent API failed to start (${errorType})`);
  process.exitCode = 1;
});

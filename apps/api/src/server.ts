import "dotenv/config";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { createRedisConnection } from "./jobs/redis-connection";
import { BackgroundJobQueue } from "./jobs/background-job-queue";
import { OutboxDispatcher } from "./jobs/outbox-dispatcher";
import { OutboxRepository } from "./jobs/outbox.repository";
import { loadConfig, type PostgresConfig } from "./config";
import { createDataSource } from "./database/data-source";
import { runMigrations } from "./database/migrate";
import { createApp } from "./app";

async function startServer(): Promise<void> {
  const config = loadConfig();
  const dataSource = await connectDatabase(config.database);
  const sessionStore = createPostgresSessionStore(config.database);
  const app = createApp(config, dataSource, sessionStore);
  const redis = createRedisConnection(config.redisUrl);
  const queue = new BackgroundJobQueue(redis);
  const dispatcher = new OutboxDispatcher(new OutboxRepository(dataSource), queue);
  dispatcher.start();
  listen(app, config.port);
  const shutdown = async () => {
    await dispatcher.stop(); await queue.close(); await redis.quit(); await dataSource.destroy(); process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

async function connectDatabase(database: PostgresConfig) {
  const dataSource = createDataSource(database);
  await dataSource.initialize();
  await runMigrations(dataSource);
  return dataSource;
}

function createPostgresSessionStore(database: PostgresConfig) {
  const PostgreSqlStore = connectPgSimple(session);
  return new PostgreSqlStore({
    pool: new Pool({
      host: database.host,
      port: database.port,
      database: database.database,
      user: database.username,
      password: database.password,
    }),
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

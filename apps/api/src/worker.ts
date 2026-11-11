import "dotenv/config";
import { loadConfig } from "./config";
import { createDataSource } from "./database/data-source";
import { initializeDatabase } from "./database/initialize-database";
import { createRedisConnection } from "./jobs/redis-connection";
import { BackgroundWorker } from "./jobs/background-worker";

async function startWorker(): Promise<void> {
  const config = loadConfig();
  const dataSource = await initializeDatabase(createDataSource(config.database));
  const redis = createRedisConnection(config.redisUrl);
  await redis.ping();
  const worker = new BackgroundWorker(redis, dataSource, config);
  await worker.start();
  console.info("Billing agent background worker started");
  const shutdown = async () => {
    await worker.close(); await redis.quit(); await dataSource.destroy(); process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

void startWorker().catch((error: unknown) => {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  console.error(`Billing agent worker failed to start (${errorType})`);
  process.exitCode = 1;
});

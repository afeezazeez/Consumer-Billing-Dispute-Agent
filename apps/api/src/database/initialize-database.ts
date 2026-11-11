import type { DataSource } from "typeorm";
import { runMigrations } from "./migrate";
import { seedDatabase } from "./scripts/seed-database";

export async function initializeDatabase(dataSource: DataSource): Promise<DataSource> {
  await dataSource.initialize();
  try {
    await runMigrations(dataSource);
    await seedDatabase(dataSource);
    return dataSource;
  } catch (error) {
    await dataSource.destroy();
    throw error;
  }
}

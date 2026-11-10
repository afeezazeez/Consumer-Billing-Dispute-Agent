import type { DataSource, Migration } from "typeorm";

const MIGRATION_LOCK_KEY = 734_522_019_273;

export async function runMigrations(dataSource: DataSource): Promise<Migration[]> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    await queryRunner.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    return await dataSource.runMigrations();
  } finally {
    await queryRunner.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => undefined);
    await queryRunner.release();
  }
}

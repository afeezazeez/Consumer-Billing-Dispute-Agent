import type { EntityManager, DataSource } from "typeorm";
import { seedNigerianGuidance } from "../seeders/nigerian-guidance.seeder";
import { seedOfficialGuidance } from "../seeders/official-guidance.seeder";

const DATABASE_SEEDERS: Seeder[] = [seedOfficialGuidance, seedNigerianGuidance];

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async manager => {
    for (const seed of DATABASE_SEEDERS) await seed(manager);
  });
}

type Seeder = (manager: EntityManager) => Promise<void>;

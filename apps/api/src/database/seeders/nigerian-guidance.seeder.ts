import type { EntityManager } from "typeorm";
import { seedKnowledgeSources, type KnowledgeSourceSeed } from "./knowledge-source-seeder";

const NIGERIAN_GUIDANCE_SOURCE: KnowledgeSourceSeed = {
  key: "ng-cbn-financial-complaints",
  provider: "Central Bank of Nigeria",
  title: "How to complain about a regulated financial institution",
  url: "https://www.cbn.gov.ng/supervision/cpdcomgt.html",
  jurisdictionCode: "NG",
  jurisdictionScope: "Nigeria; CBN-regulated financial institutions only",
};

export async function seedNigerianGuidance(manager: EntityManager): Promise<void> {
  await seedKnowledgeSources(manager, [NIGERIAN_GUIDANCE_SOURCE]);
}

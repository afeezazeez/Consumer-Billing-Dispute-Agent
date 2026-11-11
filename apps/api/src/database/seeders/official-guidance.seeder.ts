import type { EntityManager } from "typeorm";
import { seedKnowledgeSources, type KnowledgeSourceSeed } from "./knowledge-source-seeder";

const OFFICIAL_GUIDANCE_SOURCES: KnowledgeSourceSeed[] = [
  {
    key: "openai-subscription-refunds", provider: "OpenAI", title: "Request a refund for a ChatGPT subscription",
    url: "https://help.openai.com/en/articles/7232895-how-do-i-request-a-refund-for-my-chatgpt-subscription",
    jurisdictionCode: null, jurisdictionScope: "Provider policy with region-specific rights",
  },
  {
    key: "apple-purchase-refunds", provider: "Apple", title: "Request a refund for Apple purchases",
    url: "https://support.apple.com/en-euro/118223", jurisdictionCode: null,
    jurisdictionScope: "Apple storefront; availability and rights vary by region",
  },
  {
    key: "google-play-subscription-refunds", provider: "Google Play", title: "Refund policies for subscriptions",
    url: "https://support.google.com/googleplay/answer/15574908?hl=en", jurisdictionCode: null,
    jurisdictionScope: "Google Play policy; regional rules may apply",
  },
  {
    key: "stripe-unknown-charge", provider: "Stripe", title: "Customer FAQ for charges from Stripe merchants",
    url: "https://support.stripe.com/questions/faq-for-customers-of-businesses-using-stripe?locale=en-GB",
    jurisdictionCode: null, jurisdictionScope: "Global payment-processing guidance",
  },
  {
    key: "us-cfpb-card-charge-dispute", provider: "CFPB", title: "How to dispute a credit card charge",
    url: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-a-charge-on-my-credit-card-bill-en-61/",
    jurisdictionCode: "US", jurisdictionScope: "United States only",
  },
];

export async function seedOfficialGuidance(manager: EntityManager): Promise<void> {
  await seedKnowledgeSources(manager, OFFICIAL_GUIDANCE_SOURCES);
}

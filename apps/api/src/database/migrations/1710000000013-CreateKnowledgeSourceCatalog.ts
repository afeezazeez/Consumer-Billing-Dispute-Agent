import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateKnowledgeSourceCatalog1710000000013 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE knowledge_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key varchar(100) NOT NULL UNIQUE,
        provider varchar(100) NOT NULL,
        title varchar(300) NOT NULL,
        url text NOT NULL,
        jurisdiction_scope varchar(200) NOT NULL,
        language varchar(16) NOT NULL DEFAULT 'en',
        refresh_interval_hours integer NOT NULL DEFAULT 24 CHECK (refresh_interval_hours >= 24),
        enabled boolean NOT NULL DEFAULT true,
        etag text,
        last_modified text,
        content_hash varchar(64),
        checked_at timestamptz,
        succeeded_at timestamptz,
        next_refresh_at timestamptz NOT NULL DEFAULT NOW(),
        failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
        last_error_code varchar(80),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );
      CREATE INDEX knowledge_sources_due_idx ON knowledge_sources(enabled, next_refresh_at);
    `);
    await seedOfficialSources(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE knowledge_sources");
  }
}

async function seedOfficialSources(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    INSERT INTO knowledge_sources (key, provider, title, url, jurisdiction_scope)
    VALUES
      ('openai-subscription-refunds', 'OpenAI', 'Request a refund for a ChatGPT subscription',
        'https://help.openai.com/en/articles/7232895-how-do-i-request-a-refund-for-my-chatgpt-subscription',
        'Provider policy with region-specific rights'),
      ('apple-purchase-refunds', 'Apple', 'Request a refund for Apple purchases',
        'https://support.apple.com/en-euro/118223',
        'Apple storefront; availability and rights vary by region'),
      ('google-play-subscription-refunds', 'Google Play', 'Refund policies for subscriptions',
        'https://support.google.com/googleplay/answer/15574908?hl=en',
        'Google Play policy; regional rules may apply'),
      ('stripe-unknown-charge', 'Stripe', 'Customer FAQ for charges from Stripe merchants',
        'https://support.stripe.com/questions/faq-for-customers-of-businesses-using-stripe?locale=en-GB',
        'Global payment-processing guidance'),
      ('us-cfpb-card-charge-dispute', 'CFPB', 'How to dispute a credit card charge',
        'https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-a-charge-on-my-credit-card-bill-en-61/',
        'United States only')
    ON CONFLICT (key) DO NOTHING
  `);
}

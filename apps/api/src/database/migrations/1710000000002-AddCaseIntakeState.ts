import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCaseIntakeState1710000000002 implements MigrationInterface {
  name = "AddCaseIntakeState1710000000002";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE billing_cases
      ADD COLUMN intake_state jsonb NOT NULL
      DEFAULT '{"status":"collecting","facts":{}}'::jsonb
    `);
    await queryRunner.query(`
      UPDATE billing_cases AS billing_case
      SET intake_state = jsonb_set(
        billing_case.intake_state,
        '{facts}',
        (billing_case.intake_state->'facts') - 'chargeDate',
        true
      )
      WHERE billing_case.intake_state#>>'{facts,chargeDate,messageId}' IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM case_messages AS source_message
          WHERE source_message.id = (billing_case.intake_state#>>'{facts,chargeDate,messageId}')::uuid
            AND source_message.case_id = billing_case.id
            AND source_message.role = 'user'
            AND strpos(
              lower(source_message.content),
              lower(billing_case.intake_state#>>'{facts,chargeDate,value}')
            ) > 0
        )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE billing_cases DROP COLUMN intake_state");
  }
}

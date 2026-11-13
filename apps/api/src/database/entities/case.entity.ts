import { EntitySchema } from "typeorm";
import type { CaseNextAction } from "../../cases/case-next-action";
import type { CaseAgentSource, CaseAgentToolActivity } from "../../cases/case-intake-agent";
import type { CaseEmailDraft } from "../../cases/case-email-draft";
import type { CaseIntakeState } from "../../cases/case-intake";
import type { CaseMessageProcessingStatus } from "../../cases/case.repository";

export class CaseEntity {
  nextAction!: CaseNextAction | null;
  titleIsProvisional!: boolean;
  id!: string;
  userId!: string;
  title!: string;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
  intakeState!: CaseIntakeState;
}

export class CaseMessageEntity {
  id!: string;
  caseId!: string;
  role!: "user" | "assistant";
  content!: string;
  createdAt!: Date;
  processingStatus!: CaseMessageProcessingStatus;
  agentTurnDurationMs!: number | null;
  sources!: CaseAgentSource[];
  toolActivities!: CaseAgentToolActivity[];
  emailDraft!: CaseEmailDraft | null;
  nextAction!: CaseNextAction | null;
}

export const caseSchema = new EntitySchema<CaseEntity>({
  name: "BillingCase",
  target: CaseEntity,
  tableName: "billing_cases",
  columns: {
    id: { type: "uuid", primary: true },
    userId: { name: "user_id", type: "uuid" },
    title: { type: "varchar", length: 140 },
    titleIsProvisional: { name: "title_is_provisional", type: "boolean", default: false },
    nextAction: { name: "next_action", type: "jsonb", nullable: true },
    status: { type: "varchar", length: 24, default: "open" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
    intakeState: {
      name: "intake_state",
      type: "jsonb",
      default: () => `'{"status":"collecting","facts":{}}'::jsonb`,
    },
  },
  indices: [{ columns: ["userId", "updatedAt"] }],
});

export const caseMessageSchema = new EntitySchema<CaseMessageEntity>({
  name: "CaseMessage",
  target: CaseMessageEntity,
  tableName: "case_messages",
  columns: {
    id: { type: "uuid", primary: true },
    caseId: { name: "case_id", type: "uuid" },
    role: { type: "varchar", length: 12 },
    content: { type: "text" },
    processingStatus: { name: "processing_status", type: "varchar", length: 16, default: "complete" },
    agentTurnDurationMs: { name: "agent_turn_duration_ms", type: "integer", nullable: true },
    sources: { type: "jsonb", default: () => "'[]'::jsonb" },
    toolActivities: { name: "tool_activities", type: "jsonb", default: () => "'[]'::jsonb" },
    emailDraft: { name: "email_draft", type: "jsonb", nullable: true },
    nextAction: { name: "next_action", type: "jsonb", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ columns: ["caseId", "createdAt"] }],
});

import { EntitySchema } from "typeorm";
import type { CaseAgentSource, CaseAgentToolActivity, CaseEmailDraft } from "../../cases/case-intake-agent";
import type { CaseIntakeState } from "../../cases/case-intake";
import type { CaseMessageProcessingStatus } from "../../cases/case.repository";

export class CaseEntity {
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
  sources!: CaseAgentSource[];
  toolActivities!: CaseAgentToolActivity[];
  emailDraft!: CaseEmailDraft | null;
}

export class AgentTurnJobEntity {
  id!: string;
  userId!: string;
  caseId!: string;
  messageId!: string;
  status!: "queued" | "running" | "completed" | "failed";
  lockedUntil!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
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
    sources: { type: "jsonb", default: () => "'[]'::jsonb" },
    toolActivities: { name: "tool_activities", type: "jsonb", default: () => "'[]'::jsonb" },
    emailDraft: { name: "email_draft", type: "jsonb", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ columns: ["caseId", "createdAt"] }],
});

export const agentTurnJobSchema = new EntitySchema<AgentTurnJobEntity>({
  name: "AgentTurnJob",
  target: AgentTurnJobEntity,
  tableName: "agent_turn_jobs",
  columns: {
    id: { type: "uuid", primary: true },
    userId: { name: "user_id", type: "uuid" },
    caseId: { name: "case_id", type: "uuid" },
    messageId: { name: "message_id", type: "uuid", unique: true },
    status: { type: "varchar", length: 16 },
    lockedUntil: { name: "locked_until", type: "timestamptz", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
  indices: [{ columns: ["status", "createdAt"] }],
});

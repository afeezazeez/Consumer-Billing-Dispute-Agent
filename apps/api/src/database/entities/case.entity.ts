import { EntitySchema } from "typeorm";
import type { CaseAgentSource, CaseAgentToolActivity } from "../../cases/case-intake-agent";
import type { CaseIntakeState } from "../../cases/case-intake";
import type { CaseMessageProcessingStatus } from "../../cases/case.repository";

export class CaseEntity {
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
}

export const caseSchema = new EntitySchema<CaseEntity>({
  name: "BillingCase",
  target: CaseEntity,
  tableName: "billing_cases",
  columns: {
    id: { type: "uuid", primary: true },
    userId: { name: "user_id", type: "uuid" },
    title: { type: "varchar", length: 140 },
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
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ columns: ["caseId", "createdAt"] }],
});

import { EntitySchema } from "typeorm";

export class CaseEntity {
  id!: string;
  userId!: string;
  title!: string;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CaseMessageEntity {
  id!: string;
  caseId!: string;
  role!: "user" | "assistant";
  content!: string;
  createdAt!: Date;
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
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
  indices: [{ columns: ["caseId", "createdAt"] }],
});

import { ClientErrorException } from "../exceptions/client.error.exception";
import { ResponseStatus } from "../enums/response-status";
import type { CaseAttachment, StoredCaseAttachment } from "../cases/case-attachment";
import { CaseAttachmentEntity } from "./entities/case-attachment.entity";
import { randomUUID } from "node:crypto";
import { In, type DataSource, type EntityManager } from "typeorm";
import type { CaseAgentToolActivity } from "../cases/case-intake-agent";
import { appendEmailDraftEvent, type CaseEmailDraft } from "../cases/case-email-draft";
import type {
  AppendPendingMessage,
  CaseConversation,
  CaseMessageRecord,
  CaseRepository,
  CaseSummary,
  CompleteCaseTurn,
  CreatePendingCase,
  UpdateFailedMessage,
  DecideCaseEmailDraft,
  UpdateCaseEmailDraft,
} from "../cases/case.repository";
import { CaseEntity, CaseMessageEntity } from "./entities/case.entity";
import { OutboxRepository } from "../jobs/outbox.repository";

export class TypeOrmCaseRepository implements CaseRepository {
  constructor(private readonly dataSource: DataSource) {}

  createPendingCase(input: CreatePendingCase): Promise<CaseConversation> {
    return this.dataSource.transaction((manager) => this.createCase(manager, input));
  }

  appendPendingMessage(input: AppendPendingMessage): Promise<CaseConversation | undefined> {
    return this.dataSource.transaction((manager) => this.appendMessage(manager, input));
  }

  completeTurn(input: CompleteCaseTurn): Promise<CaseConversation | undefined> {
    return this.dataSource.transaction((manager) => this.completeCaseTurn(manager, input));
  }

  prepareFailedMessageRetry(input: UpdateFailedMessage): Promise<CaseConversation | undefined> {
    return this.dataSource.transaction((manager) => this.resetFailedMessage(manager, input));
  }

  async markMessageFailed(userId: string, caseId: string, messageId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE case_messages AS messages SET processing_status = 'failed'
       FROM billing_cases AS cases WHERE messages.id = $1 AND messages.case_id = $2
       AND messages.role = 'user' AND messages.processing_status = 'pending'
       AND cases.id = messages.case_id AND cases.user_id = $3`, [messageId, caseId, userId],
    );
  }

  async updatePendingMessageActivities(userId: string, caseId: string, messageId: string, activities: CaseAgentToolActivity[]): Promise<void> {
    await this.dataSource.query(
      `UPDATE case_messages AS messages
       SET tool_activities = $1
       FROM billing_cases AS cases
       WHERE messages.id = $2 AND messages.case_id = $3
       AND messages.role = 'user' AND messages.processing_status = 'pending'
       AND cases.id = messages.case_id AND cases.user_id = $4`,
      [JSON.stringify(activities), messageId, caseId, userId],
    );
  }

  decideEmailDraft(input: DecideCaseEmailDraft): Promise<CaseConversation | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const draft = await lockEmailDraft(manager, input);
      if (!draft || draft.status !== "waiting_approval") return undefined;
      const decided = input.decision === "approve"
        ? approveEmailDraft(draft, input.approvedDraft)
        : appendEmailDraftEvent(draft, "cancelled", "Draft cancelled; no email was sent.");
      await manager.getRepository(CaseMessageEntity).update({ id: input.messageId, caseId: input.caseId }, { emailDraft: decided });
      return readConversation(manager, input.userId, input.caseId);
    });
  }

  updateEmailDraft(input: UpdateCaseEmailDraft): Promise<CaseConversation | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const caseRecord = await manager.getRepository(CaseEntity).findOneBy({ id: input.caseId, userId: input.userId });
      if (!caseRecord) return undefined;
      const result = await manager.getRepository(CaseMessageEntity).update(
        { id: input.messageId, caseId: input.caseId, role: "assistant" }, { emailDraft: input.draft },
      );
      return result.affected ? readConversation(manager, input.userId, input.caseId) : undefined;
    });
  }

  async listForUser(userId: string): Promise<CaseSummary[]> {
    const cases = await this.dataSource.getRepository(CaseEntity).find({
      where: { userId },
      order: { updatedAt: "DESC" },
    });
    if (cases.length === 0) return [];

    const messages = await this.dataSource.getRepository(CaseMessageEntity).find({
      where: { caseId: In(cases.map((item) => item.id)) },
      order: { createdAt: "DESC" },
    });
    return toSummaries(cases, messages);
  }

  async findForUser(userId: string, caseId: string): Promise<CaseConversation | undefined> {
    return readConversation(this.dataSource.manager, userId, caseId);
  }

  async stageAttachment(userId: string, attachment: StoredCaseAttachment): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO case_attachments (id, name, media_type, size, cloudinary_public_id, staged_user_id, staged_until)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '1 hour')`,
      [attachment.id, attachment.name, attachment.mediaType, attachment.size, attachment.storageKey, userId],
    );
  }

  async discardStagedAttachment(userId: string, attachmentId: string): Promise<void> {
    await this.dataSource.query(
      "DELETE FROM case_attachments WHERE id = $1 AND staged_user_id = $2 AND message_id IS NULL",
      [attachmentId, userId],
    );
  }

  async findAttachment(userId: string, attachmentId: string): Promise<StoredCaseAttachment | undefined> {
    const rows = await this.dataSource.query(
      `SELECT a.id, a.name, a.media_type AS "mediaType", a.size, a.data, a.cloudinary_public_id AS "storageKey"
       FROM case_attachments a
       JOIN case_messages m ON m.id = a.message_id
       JOIN billing_cases c ON c.id = m.case_id
       WHERE a.id = $1 AND c.user_id = $2`,
      [attachmentId, userId],
    ) as StoredCaseAttachment[];
    return rows[0];
  }

  async deleteForUser(userId: string, caseId: string): Promise<boolean> {
    const result = await this.dataSource.getRepository(CaseEntity).delete({ id: caseId, userId });
    return (result.affected ?? 0) > 0;
  }

  async renameForUser(userId: string, caseId: string, title: string): Promise<boolean> {
    const result = await this.dataSource.getRepository(CaseEntity).update(
      { id: caseId, userId },
      { title, titleIsProvisional: false, updatedAt: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }

  private async createCase(manager: EntityManager, input: CreatePendingCase): Promise<CaseConversation> {
    const cases = manager.getRepository(CaseEntity);
    const id = input.caseId ?? randomUUID();
    await cases.insert({
      id,
      userId: input.userId,
      title: input.title,
      titleIsProvisional: true,
      status: "open",
      intakeState: input.intake,
    });
    const record = await cases.findOneByOrFail({ id });
    const message = toMessageEntity(input.userMessage, record.id);
    await manager.getRepository(CaseMessageEntity).insert(message);
    await saveAttachments(manager, message.id, input.attachments);
    await claimAttachments(manager, input, message.id);
    await new OutboxRepository(this.dataSource).enqueue(manager, { type: "agent-turn", userId: input.userId, caseId: record.id, messageId: message.id });
    return toConversation(record, [message], await loadAttachments(manager, [message]));
  }

  private async appendMessage(manager: EntityManager, input: AppendPendingMessage): Promise<CaseConversation | undefined> {
    const cases = manager.getRepository(CaseEntity);
    const record = await cases.findOne({ where: { id: input.caseId, userId: input.userId }, lock: { mode: "pessimistic_write" } });
    if (!record) return undefined;
    const messages = manager.getRepository(CaseMessageEntity);
    const existing = await messages.findOneBy({ id: input.userMessage.id, caseId: input.caseId, role: "user" });
    if (existing) return readConversation(manager, input.userId, input.caseId);
    await messages.insert(toMessageEntity(input.userMessage, input.caseId));
    await saveAttachments(manager, input.userMessage.id, input.attachments);
    await claimAttachments(manager, input, input.userMessage.id);
    await new OutboxRepository(this.dataSource).enqueue(manager, { type: "agent-turn", userId: input.userId, caseId: input.caseId, messageId: input.userMessage.id });
    await cases.update({ id: input.caseId, userId: input.userId }, { updatedAt: input.userMessage.createdAt });
    return readConversation(manager, input.userId, input.caseId);
  }

  private async completeCaseTurn(manager: EntityManager, input: CompleteCaseTurn): Promise<CaseConversation | undefined> {
    const messages = manager.getRepository(CaseMessageEntity);
    const update = await messages.update(
      { id: input.userMessageId, caseId: input.caseId, role: "user", processingStatus: "pending" },
      { processingStatus: "complete" },
    );
    if (!update.affected) return undefined;
    await messages.save(toMessageEntity(input.assistantMessage, input.caseId));
    await manager.getRepository(CaseEntity).update(
      { id: input.caseId, userId: input.userId },
      {
        updatedAt: input.assistantMessage.createdAt,
        intakeState: input.intake,
        ...(input.nextAction ? { nextAction: input.nextAction } : {}),
      },
    );
    if (input.caseTitle) {
      await manager.getRepository(CaseEntity).update(
        { id: input.caseId, userId: input.userId, titleIsProvisional: true },
        { title: input.caseTitle, titleIsProvisional: false, updatedAt: input.assistantMessage.createdAt },
      );
    }
    return readConversation(manager, input.userId, input.caseId);
  }

  private async resetFailedMessage(manager: EntityManager, input: UpdateFailedMessage): Promise<CaseConversation | undefined> {
    const messageUpdate: Partial<CaseMessageEntity> = { processingStatus: "pending" };
    if (input.content) messageUpdate.content = input.content;
    const result = await manager.getRepository(CaseMessageEntity).update(
      { id: input.messageId, caseId: input.caseId, role: "user", processingStatus: "failed" },
      messageUpdate,
    );
    if (!result.affected) return undefined;
    await new OutboxRepository(this.dataSource).enqueue(manager, { type: "agent-turn", userId: input.userId, caseId: input.caseId, messageId: input.messageId });
    await manager.getRepository(CaseEntity).update({ id: input.caseId, userId: input.userId }, { updatedAt: new Date() });
    return readConversation(manager, input.userId, input.caseId);
  }
}

async function readConversation(
  manager: EntityManager,
  userId: string,
  caseId: string,
): Promise<CaseConversation | undefined> {
  const record = await manager.getRepository(CaseEntity).findOneBy({ id: caseId, userId });
  if (!record) return undefined;
  const messages = await loadMessages(manager, caseId);
  return toConversation(record, messages, await loadAttachments(manager, messages));
}

async function lockEmailDraft(manager: EntityManager, input: DecideCaseEmailDraft): Promise<CaseEmailDraft | undefined> {
  const rows = await manager.query(
    `SELECT messages.email_draft AS draft FROM case_messages messages
     JOIN billing_cases cases ON cases.id = messages.case_id
     WHERE messages.id = $1 AND messages.case_id = $2 AND messages.role = 'assistant'
       AND cases.user_id = $3 FOR UPDATE OF messages`,
    [input.messageId, input.caseId, input.userId],
  ) as { draft: CaseEmailDraft | null }[];
  return rows[0]?.draft ?? undefined;
}

function approveEmailDraft(draft: CaseEmailDraft, approvedDraft?: DecideCaseEmailDraft["approvedDraft"]): CaseEmailDraft {
  if (!approvedDraft) throw new Error("An approved email draft snapshot is required");
  const approvedAt = new Date().toISOString();
  const sending = appendEmailDraftEvent({ ...draft, ...approvedDraft, approvedAt }, "sending", "You approved this exact draft; sending through Gmail.");
  return sending;
}

function toMessageEntity(message: CaseMessageRecord, caseId: string): CaseMessageEntity {
  return {
    id: message.id,
    caseId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    processingStatus: message.processingStatus,
    agentTurnDurationMs: message.agentTurnDurationMs ?? null,
    sources: message.sources ?? [],
    toolActivities: message.toolActivities ?? [],
    emailDraft: message.emailDraft ?? null,
    nextAction: message.nextAction ?? null,
  };
}

async function loadMessages(manager: EntityManager, caseId: string): Promise<CaseMessageEntity[]> {
  return manager.getRepository(CaseMessageEntity).find({ where: { caseId }, order: { createdAt: "ASC" } });
}

function toSummaries(cases: CaseEntity[], messages: CaseMessageEntity[]): CaseSummary[] {
  const latestByCase = new Map<string, CaseMessageEntity>();
  const processingCases = new Set<string>();
  for (const message of messages) {
    if (!latestByCase.has(message.caseId)) latestByCase.set(message.caseId, message);
    if (message.role === "user" && message.processingStatus === "pending") processingCases.add(message.caseId);
  }
  return cases.map((record) => ({
    ...toCaseFields(record),
    lastMessage: latestByCase.get(record.id)?.content ?? "No messages yet",
    isProcessing: processingCases.has(record.id),
  }));
}

function toConversation(record: CaseEntity, messages: CaseMessageEntity[], attachments: Map<string, CaseAttachment[]>): CaseConversation {
  const latestMessage = messages.at(-1)?.content ?? "No messages yet";
  return {
    ...toCaseFields(record),
    createdAt: record.createdAt,
    lastMessage: latestMessage,
    isProcessing: messages.some((message) => message.role === "user" && message.processingStatus === "pending"),
    messages: messages.map((message) => ({ ...toMessage(message), attachments: attachments.get(message.id) ?? [] })),
    intake: record.intakeState,
    nextAction: record.nextAction ?? undefined,
  };
}

function toCaseFields(record: CaseEntity): Omit<CaseSummary, "lastMessage" | "isProcessing"> {
  return { id: record.id, title: record.title, status: record.status, updatedAt: record.updatedAt };
}

function toMessage(message: CaseMessageEntity): CaseMessageRecord {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    processingStatus: message.processingStatus,
    agentTurnDurationMs: message.agentTurnDurationMs ?? undefined,
    sources: message.sources ?? [],
    toolActivities: message.toolActivities ?? [],
    emailDraft: message.emailDraft ?? undefined,
    nextAction: message.nextAction ?? undefined,
  };
}

async function saveAttachments(manager: EntityManager, messageId: string, files?: StoredCaseAttachment[]): Promise<void> {
  if (files?.length) await manager.getRepository(CaseAttachmentEntity).insert(files.map((file) => ({ ...file, messageId })));
}

async function loadAttachments(manager: EntityManager, messages: CaseMessageEntity[]): Promise<Map<string, CaseAttachment[]>> {
  const grouped = new Map<string, CaseAttachment[]>();
  if (!messages.length) return grouped;
  const rows = await manager.getRepository(CaseAttachmentEntity).find({
    where: { messageId: In(messages.map(({ id }) => id)) },
    order: { name: "ASC", id: "ASC" },
  });
  for (const { id, name, mediaType, size, messageId, review } of rows) {
    const attachments = grouped.get(messageId) ?? [];
    attachments.push({ id, name, mediaType, size, review: review ?? undefined });
    grouped.set(messageId, attachments);
  }
  return grouped;
}


async function claimAttachments(
  manager: EntityManager,
  input: CreatePendingCase | AppendPendingMessage,
  messageId: string,
): Promise<void> {
  const ids = input.attachmentIds;
  if (!ids?.length) return;
  const rows = await manager.query(
    `WITH claimed AS (
      UPDATE case_attachments SET message_id = $1, staged_user_id = NULL, staged_until = NULL
      WHERE id = ANY($2::uuid[]) AND staged_user_id = $3 AND message_id IS NULL AND staged_until > NOW()
      RETURNING id
    ) SELECT id FROM claimed`,
    [messageId, ids, input.userId],
  ) as { id: string }[];
  if (rows.length !== ids.length) {
    throw new ClientErrorException("An attachment expired or is unavailable. Attach it again.", ResponseStatus.BAD_REQUEST);
  }
}

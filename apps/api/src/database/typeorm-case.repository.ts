import { randomUUID } from "node:crypto";
import { In, type DataSource, type EntityManager } from "typeorm";
import type { CaseAgentToolActivity } from "../cases/case-intake-agent";
import type {
  AppendPendingMessage,
  CaseConversation,
  CaseMessageRecord,
  CaseRepository,
  CaseSummary,
  CompleteCaseTurn,
  CreatePendingCase,
  UpdateFailedMessage,
} from "../cases/case.repository";
import { AgentTurnJobEntity, CaseEntity, CaseMessageEntity } from "./entities/case.entity";

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
    const record = await this.dataSource.getRepository(CaseEntity).findOneBy({ id: caseId, userId });
    if (!record) return undefined;
    const messages = await this.dataSource.getRepository(CaseMessageEntity).find({
      where: { caseId },
      order: { createdAt: "ASC" },
    });
    return toConversation(record, messages);
  }

  async deleteForUser(userId: string, caseId: string): Promise<boolean> {
    const result = await this.dataSource.getRepository(CaseEntity).delete({ id: caseId, userId });
    return (result.affected ?? 0) > 0;
  }

  async renameForUser(userId: string, caseId: string, title: string): Promise<boolean> {
    const result = await this.dataSource.getRepository(CaseEntity).update({ id: caseId, userId }, { title, updatedAt: new Date() });
    return (result.affected ?? 0) > 0;
  }

  private async createCase(manager: EntityManager, input: CreatePendingCase): Promise<CaseConversation> {
    const record = await manager.getRepository(CaseEntity).save({
      id: input.caseId ?? randomUUID(),
      userId: input.userId,
      title: input.title,
      status: "open",
      intakeState: input.intake,
    });
    const message = await manager.getRepository(CaseMessageEntity).save(toMessageEntity(input.userMessage, record.id));
    await enqueueTurn(manager, input.userId, record.id, message.id);
    return toConversation(record, [message]);
  }

  private async appendMessage(manager: EntityManager, input: AppendPendingMessage): Promise<CaseConversation | undefined> {
    const cases = manager.getRepository(CaseEntity);
    const record = await cases.findOneBy({ id: input.caseId, userId: input.userId });
    if (!record) return undefined;
    await manager.getRepository(CaseMessageEntity).save(toMessageEntity(input.userMessage, input.caseId));
    await enqueueTurn(manager, input.userId, input.caseId, input.userMessage.id);
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
      { updatedAt: input.assistantMessage.createdAt, intakeState: input.intake },
    );
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
    const jobs = manager.getRepository(AgentTurnJobEntity);
    const queuedJob = await jobs.findOneBy({ messageId: input.messageId });
    if (queuedJob) await jobs.update(
      { messageId: input.messageId, status: "failed" },
      { status: "queued", lockedUntil: null, createdAt: new Date(), updatedAt: new Date() },
    );
    else await enqueueTurn(manager, input.userId, input.caseId, input.messageId);
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
  return toConversation(record, await loadMessages(manager, caseId));
}

function toMessageEntity(message: CaseMessageRecord, caseId: string): CaseMessageEntity {
  return {
    id: message.id,
    caseId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    processingStatus: message.processingStatus,
    sources: message.sources ?? [],
    toolActivities: message.toolActivities ?? [],
    emailDraft: message.emailDraft ?? null,
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

function toConversation(record: CaseEntity, messages: CaseMessageEntity[]): CaseConversation {
  const latestMessage = messages.at(-1)?.content ?? "No messages yet";
  return {
    ...toCaseFields(record),
    createdAt: record.createdAt,
    lastMessage: latestMessage,
    isProcessing: messages.some((message) => message.role === "user" && message.processingStatus === "pending"),
    messages: messages.map(toMessage),
    intake: record.intakeState,
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
    sources: message.sources ?? [],
    toolActivities: message.toolActivities ?? [],
    emailDraft: message.emailDraft ?? undefined,
  };
}

async function enqueueTurn(manager: EntityManager, userId: string, caseId: string, messageId: string): Promise<void> {
  await manager.getRepository(AgentTurnJobEntity).save({
    id: randomUUID(),
    userId,
    caseId,
    messageId,
    status: "queued",
    lockedUntil: null,
  });
}

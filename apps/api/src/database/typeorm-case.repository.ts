import { randomUUID } from "node:crypto";
import { In, type DataSource, type EntityManager } from "typeorm";
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
import { CaseEntity, CaseMessageEntity } from "./entities/case.entity";

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

  markMessageFailed(input: UpdateFailedMessage): Promise<CaseConversation | undefined> {
    return this.dataSource.transaction((manager) => this.changeMessageStatus(manager, input, "failed"));
  }

  prepareFailedMessageRetry(input: UpdateFailedMessage): Promise<CaseConversation | undefined> {
    return this.dataSource.transaction((manager) => this.resetFailedMessage(manager, input));
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
    return toConversation(record, [message]);
  }

  private async appendMessage(manager: EntityManager, input: AppendPendingMessage): Promise<CaseConversation | undefined> {
    const cases = manager.getRepository(CaseEntity);
    const record = await cases.findOneBy({ id: input.caseId, userId: input.userId });
    if (!record) return undefined;
    await manager.getRepository(CaseMessageEntity).save(toMessageEntity(input.userMessage, input.caseId));
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

  private async changeMessageStatus(
    manager: EntityManager,
    input: UpdateFailedMessage,
    processingStatus: "failed",
  ): Promise<CaseConversation | undefined> {
    const result = await manager.getRepository(CaseMessageEntity).update(
      { id: input.messageId, caseId: input.caseId, role: "user", processingStatus: "pending" },
      { processingStatus },
    );
    return result.affected ? readConversation(manager, input.userId, input.caseId) : undefined;
  }

  private async resetFailedMessage(manager: EntityManager, input: UpdateFailedMessage): Promise<CaseConversation | undefined> {
    const messageUpdate: Partial<CaseMessageEntity> = { processingStatus: "pending" };
    if (input.content) messageUpdate.content = input.content;
    const result = await manager.getRepository(CaseMessageEntity).update(
      { id: input.messageId, caseId: input.caseId, role: "user", processingStatus: "failed" },
      messageUpdate,
    );
    if (!result.affected) return undefined;
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
  };
}

async function loadMessages(manager: EntityManager, caseId: string): Promise<CaseMessageEntity[]> {
  return manager.getRepository(CaseMessageEntity).find({ where: { caseId }, order: { createdAt: "ASC" } });
}

function toSummaries(cases: CaseEntity[], messages: CaseMessageEntity[]): CaseSummary[] {
  const latestByCase = new Map<string, CaseMessageEntity>();
  for (const message of messages) {
    if (!latestByCase.has(message.caseId)) latestByCase.set(message.caseId, message);
  }
  return cases.map((record) => ({
    ...toCaseFields(record),
    lastMessage: latestByCase.get(record.id)?.content ?? "No messages yet",
  }));
}

function toConversation(record: CaseEntity, messages: CaseMessageEntity[]): CaseConversation {
  const latestMessage = messages.at(-1)?.content ?? "No messages yet";
  return {
    ...toCaseFields(record),
    createdAt: record.createdAt,
    lastMessage: latestMessage,
    messages: messages.map(toMessage),
    intake: record.intakeState,
  };
}

function toCaseFields(record: CaseEntity): Omit<CaseSummary, "lastMessage"> {
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
  };
}

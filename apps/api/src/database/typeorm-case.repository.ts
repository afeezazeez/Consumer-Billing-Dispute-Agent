import { randomUUID } from "node:crypto";
import { In, type DataSource, type EntityManager } from "typeorm";
import type { CaseConversation, CaseMessageRecord, CaseRepository, CaseSummary } from "../cases/case.repository";
import { CaseEntity, CaseMessageEntity } from "./case.entity";

export class TypeOrmCaseRepository implements CaseRepository {
  constructor(private readonly dataSource: DataSource) {}

  create(userId: string, title: string, openingMessage: string): Promise<CaseConversation> {
    return this.dataSource.transaction((manager) => this.createCase(manager, userId, title, openingMessage));
  }

  appendMessage(userId: string, caseId: string, content: string): Promise<CaseConversation | undefined> {
    return this.dataSource.transaction((manager) => this.appendCaseMessage(manager, userId, caseId, content));
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

  private async createCase(
    manager: EntityManager,
    userId: string,
    title: string,
    openingMessage: string,
  ): Promise<CaseConversation> {
    const record = await manager.getRepository(CaseEntity).save({ id: randomUUID(), userId, title, status: "open" });
    const message = await manager.getRepository(CaseMessageEntity).save({
      id: randomUUID(), caseId: record.id, role: "user", content: openingMessage,
    });
    return toConversation(record, [message]);
  }

  private async appendCaseMessage(
    manager: EntityManager,
    userId: string,
    caseId: string,
    content: string,
  ): Promise<CaseConversation | undefined> {
    const cases = manager.getRepository(CaseEntity);
    const record = await cases.findOneBy({ id: caseId, userId });
    if (!record) return undefined;
    await manager.getRepository(CaseMessageEntity).save({
      id: randomUUID(), caseId, role: "user", content,
    });
    await cases.update({ id: caseId, userId }, { updatedAt: new Date() });
    const updatedRecord = await cases.findOneBy({ id: caseId, userId });
    return updatedRecord ? toConversation(updatedRecord, [...await loadMessages(manager, caseId)]) : undefined;
  }
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
  return { ...toCaseFields(record), createdAt: record.createdAt, lastMessage: latestMessage, messages: messages.map(toMessage) };
}

function toCaseFields(record: CaseEntity): Omit<CaseSummary, "lastMessage"> {
  return { id: record.id, title: record.title, status: record.status, updatedAt: record.updatedAt };
}

function toMessage(message: CaseMessageEntity): CaseMessageRecord {
  return { id: message.id, role: message.role, content: message.content, createdAt: message.createdAt };
}

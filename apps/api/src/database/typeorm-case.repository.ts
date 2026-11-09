import { randomUUID } from "node:crypto";
import { In, type DataSource, type EntityManager } from "typeorm";
import type {
  AppendCaseTurn,
  CaseAgentTurnMessages,
  CaseConversation,
  CaseMessageRecord,
  CaseRepository,
  CaseSummary,
  CreateCaseTurn,
} from "../cases/case.repository";
import { CaseEntity, CaseMessageEntity } from "./entities/case.entity";

export class TypeOrmCaseRepository implements CaseRepository {
  constructor(private readonly dataSource: DataSource) {}

  createWithTurn(turn: CreateCaseTurn): Promise<CaseConversation> {
    return this.dataSource.transaction((manager) => this.createCase(manager, turn));
  }

  appendTurn(turn: AppendCaseTurn): Promise<CaseConversation | undefined> {
    return this.dataSource.transaction((manager) => this.appendCaseTurn(manager, turn));
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

  private async createCase(manager: EntityManager, turn: CreateCaseTurn): Promise<CaseConversation> {
    const record = await manager.getRepository(CaseEntity).save({
      id: randomUUID(),
      userId: turn.userId,
      title: turn.title,
      status: "open",
      intakeState: turn.intake,
    });
    const messages = await saveTurnMessages(manager, record.id, turn.messages);
    return toConversation(record, messages);
  }

  private async appendCaseTurn(manager: EntityManager, turn: AppendCaseTurn): Promise<CaseConversation | undefined> {
    const cases = manager.getRepository(CaseEntity);
    const record = await cases.findOneBy({ id: turn.caseId, userId: turn.userId });
    if (!record) return undefined;
    await saveTurnMessages(manager, turn.caseId, turn.messages);
    await cases.update({ id: turn.caseId, userId: turn.userId }, { updatedAt: turn.messages[1].createdAt, intakeState: turn.intake });
    const updatedRecord = await cases.findOneBy({ id: turn.caseId, userId: turn.userId });
    return updatedRecord ? toConversation(updatedRecord, await loadMessages(manager, turn.caseId)) : undefined;
  }
}

async function saveTurnMessages(
  manager: EntityManager,
  caseId: string,
  messages: CaseAgentTurnMessages,
): Promise<CaseMessageEntity[]> {
  return manager.getRepository(CaseMessageEntity).save(messages.map((message) => toMessageEntity(message, caseId)));
}

function toMessageEntity(message: CaseMessageRecord, caseId: string): CaseMessageEntity {
  return {
    id: message.id,
    caseId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
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
  return { id: message.id, role: message.role, content: message.content, createdAt: message.createdAt };
}

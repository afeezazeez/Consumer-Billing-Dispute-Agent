import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type {
  CaseIntakeFacts,
  CaseIntakeState,
} from "./case-intake";
import type { CaseMessageRecord } from "./case.repository";
import { RecordCaseIntakeFactsToolDto } from "../dtos/cases/record-case-intake-facts-tool.dto";

interface ToolExecutionResult {
  success: boolean;
  message: string;
  intake: CaseIntakeState;
}

export class CaseIntakeToolService {
  async recordFacts(
    input: unknown,
    messages: CaseMessageRecord[],
    currentIntake: CaseIntakeState,
  ): Promise<ToolExecutionResult> {
    const request = plainToInstance(RecordCaseIntakeFactsToolDto, input);
    const validationErrors = await validate(request, { whitelist: true, forbidNonWhitelisted: true });
    if (validationErrors.length > 0) return rejectedToolResult(currentIntake);
    if (!sourcesExist(request, messages)) return rejectedToolResult(currentIntake);
    const facts = mergeFacts(currentIntake.facts, request);
    const intake = { facts, status: getIntakeStatus(facts) };
    return { success: true, message: "Case facts recorded.", intake };
  }
}

function rejectedToolResult(intake: CaseIntakeState): ToolExecutionResult {
  return { success: false, message: "Facts must cite a user message in this case.", intake };
}

function sourcesExist(request: RecordCaseIntakeFactsToolDto, messages: CaseMessageRecord[]): boolean {
  return Object.values(request).every((fact) => !fact || isUserMessageSource(fact.sourceMessageId, messages));
}

function isUserMessageSource(messageId: string, messages: CaseMessageRecord[]): boolean {
  return messages.some((message) => message.id === messageId && message.role === "user");
}

function mergeFacts(current: CaseIntakeFacts, request: RecordCaseIntakeFactsToolDto): CaseIntakeFacts {
  return {
    ...current,
    ...textFact("provider", request.provider),
    ...textFact("issueType", request.issueType),
    ...textFact("chargeAmount", request.chargeAmount),
    ...textFact("chargeDate", request.chargeDate),
    ...textFact("expectedAmount", request.expectedAmount),
    ...textFact("desiredOutcome", request.desiredOutcome),
  };
}

function textFact<Key extends TextFactKey>(key: Key, fact?: RecordCaseIntakeFactsToolDto[Key]): Partial<CaseIntakeFacts> {
  if (!fact) return {};
  return { [key]: { value: fact.value, source: "user_message", messageId: fact.sourceMessageId } };
}

type TextFactKey = keyof CaseIntakeFacts;

function getIntakeStatus(facts: CaseIntakeFacts): CaseIntakeState["status"] {
  return facts.provider && facts.issueType && facts.chargeAmount ? "ready" : "collecting";
}

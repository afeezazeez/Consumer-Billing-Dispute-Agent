import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { FunctionTool } from "openai/resources/responses/responses";
import type {
  CaseIntakeFacts,
  CaseIntakeState,
} from "../../cases/case-intake";
import type { CaseMessageRecord } from "../../cases/case.repository";
import { RecordCaseIntakeFactsToolDto } from "../../dtos/cases/record-case-intake-facts-tool.dto";
import type { AgentToolContext, AgentToolResult, FunctionAgentTool } from "./agent-tool";

export class RecordCaseIntakeFactsTool implements FunctionAgentTool {
  readonly kind = "function" as const;
  readonly label = "Recording case details";
  readonly definition: FunctionTool = {
    type: "function",
    name: "record_case_facts",
    description: "Record only billing-dispute facts explicitly stated by the user, with the ID of the user message that supports each fact.",
    strict: true,
    parameters: createFactToolSchema(),
  };

  async execute(
    input: unknown,
    context: AgentToolContext,
  ): Promise<AgentToolResult> {
    const request = plainToInstance(RecordCaseIntakeFactsToolDto, input);
    const validationErrors = await validate(request, { whitelist: true, forbidNonWhitelisted: true });
    if (validationErrors.length > 0) return rejectedToolResult(context.intake);
    if (!factsHaveSupportingUserMessages(request, context.messages)) return rejectedToolResult(context.intake);
    const facts = mergeFacts(context.intake.facts, request);
    const intake = { facts, status: getIntakeStatus(facts) };
    return acceptedToolResult(intake);
  }
}

function createFactToolSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      provider: nullableTextFactSchema(),
      issueType: nullableTextFactSchema(),
      chargeAmount: nullableTextFactSchema(),
      chargeDate: nullableTextFactSchema(),
      expectedAmount: nullableTextFactSchema(),
      desiredOutcome: nullableTextFactSchema(),
    },
    required: ["provider", "issueType", "chargeAmount", "chargeDate", "expectedAmount", "desiredOutcome"],
    additionalProperties: false,
  };
}

function nullableTextFactSchema(): Record<string, unknown> {
  return {
    type: ["object", "null"],
    properties: {
      value: { type: "string", maxLength: 200 },
      sourceMessageId: { type: "string" },
    },
    required: ["value", "sourceMessageId"],
    additionalProperties: false,
  };
}

function rejectedToolResult(intake: CaseIntakeState): AgentToolResult {
  return createToolResult(intake, false, "Each fact must be supported by the cited user message. Keep relative dates such as ‘today’ exactly as stated.");
}

function acceptedToolResult(intake: CaseIntakeState): AgentToolResult {
  return createToolResult(intake, true, "Case facts recorded.");
}

function createToolResult(intake: CaseIntakeState, success: boolean, message: string): AgentToolResult {
  return {
    intake,
    output: { success, message, status: intake.status, facts: intake.facts },
  };
}

function factsHaveSupportingUserMessages(request: RecordCaseIntakeFactsToolDto, messages: CaseMessageRecord[]): boolean {
  return Object.values(request).every((fact) => !fact || isFactSupportedBySource(fact.sourceMessageId, fact.value, messages));
}

function isFactSupportedBySource(messageId: string, value: string, messages: CaseMessageRecord[]): boolean {
  const source = messages.find((message) => message.id === messageId && message.role === "user");
  const normalizedValue = normalizeEvidence(value);
  return Boolean(source && normalizedValue && normalizeEvidence(source.content).includes(normalizedValue));
}

function normalizeEvidence(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
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

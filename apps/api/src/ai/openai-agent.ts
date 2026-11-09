import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import type {
  Response,
  ResponseFunctionWebSearch,
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseOutputItem,
  ResponseOutputText,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import type { CaseIntakeState } from "../cases/case-intake";
import type {
  CaseAgentProgressHandler,
  CaseAgentSource,
  CaseAgentToolActivity,
  CaseIntakeAgent,
  CaseIntakeAgentContext,
  CaseIntakeAgentResult,
} from "../cases/case-intake-agent";
import type { CaseMessageRecord } from "../cases/case.repository";
import { ServiceUnavailableException } from "../exceptions/service-unavailable.exception";
import type { AgentTool, AgentToolContext, FunctionAgentTool } from "./tools/agent-tool";
import { stripInternalCitations } from "./strip-internal-citations";

const MAX_TOOL_CALLS = 3;
const MAX_OUTPUT_TOKENS = 700;
export class OpenAiAgent implements CaseIntakeAgent {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
    private readonly agentTools: AgentTool[],
  ) {}

  async respond(
    context: CaseIntakeAgentContext,
    onProgress?: CaseAgentProgressHandler,
  ): Promise<CaseIntakeAgentResult> {
    try {
      const progress = createAgentTurnProgress(this.agentTools, onProgress);
      return await this.runAgentTurn(this.createClient(), context, progress);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException("Bill Agent could not complete this turn. Your message is saved; please try again.");
    }
  }

  private async runAgentTurn(
    client: OpenAI,
    context: CaseIntakeAgentContext,
    progress: AgentTurnProgress,
  ): Promise<CaseIntakeAgentResult> {
    let input = createConversationInput(context.messages);
    let intake = context.intake;
    let toolCallsUsed = 0;

    while (toolCallsUsed < MAX_TOOL_CALLS) {
      const response = await this.requestResponse(client, {
        input,
        context,
        intake,
        toolChoice: "auto",
        progress,
      });
      const calls = readFunctionCalls(response);
      if (calls.length === 0) return createResult(response.output_text, intake, progress);
      const execution = await this.executeToolCalls(calls, {
        messages: context.messages,
        intake,
        remainingCalls: MAX_TOOL_CALLS - toolCallsUsed,
        progress,
      });
      intake = execution.intake;
      toolCallsUsed += execution.callsUsed;
      input = continueConversation(input, response.output, execution.outputs);
    }

    return this.requestFinalResponse(client, { input, context, intake, progress });
  }

  private async requestFinalResponse(
    client: OpenAI,
    request: FinalResponseRequest,
  ): Promise<CaseIntakeAgentResult> {
    const response = await this.requestResponse(client, { ...request, toolChoice: "none" });
    return createResult(response.output_text || createSafeFallback(request.intake), request.intake, request.progress);
  }

  private async requestResponse(
    client: OpenAI,
    request: AgentResponseRequest,
  ): Promise<Response> {
    const stream = client.responses.stream({
      model: this.model,
      instructions: createAgentInstructions(request.context, request.intake),
      input: request.input,
      tools: this.agentTools.map((tool) => tool.definition),
      tool_choice: request.toolChoice,
      parallel_tool_calls: false,
      include: ["web_search_call.action.sources"],
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
    });
    for await (const event of stream) handleProgressEvent(event, request.progress);
    const response = await stream.finalResponse();
    collectSources(response, request.progress);
    collectSearchQueries(response, request.progress);
    if (response.status !== "completed") throw new Error("OpenAI returned an incomplete response");
    return response;
  }

  private async executeToolCalls(
    calls: ResponseFunctionToolCall[],
    context: ToolExecutionContext,
  ): Promise<ToolExecutionBatch> {
    const outputs: ResponseInputItem[] = [];
    let nextIntake = context.intake;
    let callsUsed = 0;

    for (const call of calls) {
      const toolContext = { messages: context.messages, intake: nextIntake };
      const result = await this.executeToolCall(call, {
        ...toolContext,
        withinLimit: callsUsed < context.remainingCalls,
        progress: context.progress,
      });
      nextIntake = result.intake;
      callsUsed += 1;
      outputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result.output) });
    }

    return { outputs, intake: nextIntake, callsUsed };
  }

  private async executeToolCall(
    call: ResponseFunctionToolCall,
    context: ToolCallContext,
  ): Promise<ToolCallResult> {
    const agentTool = findFunctionTool(this.agentTools, call.name);
    if (!context.withinLimit || !agentTool) {
      return { intake: context.intake, output: { success: false, message: "The requested action is unavailable." } };
    }
    const result = await agentTool.execute(parseArguments(call.arguments), context);
    reportToolActivity(context.progress, call.id ?? call.call_id, call.name, "completed");
    return { intake: result.intake, output: result.output };
  }

  private createClient(): OpenAI {
    if (!this.apiKey) {
      throw new ServiceUnavailableException("Bill Agent is not configured to respond yet. Add the API key and try again.");
    }
    return new OpenAI({ apiKey: this.apiKey, timeout: 30_000, maxRetries: 0 });
  }
}

interface ToolExecutionBatch {
  outputs: ResponseInputItem[];
  intake: CaseIntakeState;
  callsUsed: number;
}

interface FinalResponseRequest {
  input: ResponseInputItem[];
  context: CaseIntakeAgentContext;
  intake: CaseIntakeState;
  progress: AgentTurnProgress;
}

interface AgentResponseRequest extends FinalResponseRequest {
  toolChoice: "auto" | "none";
}

interface ToolExecutionContext {
  messages: CaseMessageRecord[];
  intake: CaseIntakeState;
  remainingCalls: number;
  progress: AgentTurnProgress;
}

interface ToolCallContext extends AgentToolContext {
  withinLimit: boolean;
  progress: AgentTurnProgress;
}

interface ToolCallResult {
  intake: CaseIntakeState;
  output: Record<string, unknown>;
}

interface AgentTurnProgress {
  agentTools: AgentTool[];
  activities: CaseAgentToolActivity[];
  sources: CaseAgentSource[];
  onProgress?: CaseAgentProgressHandler;
}

function createConversationInput(messages: CaseMessageRecord[]): ResponseInputItem[] {
  return messages.map((message) => ({
    role: message.role,
    content: `Case message ID: ${message.id}\n${message.content}`,
  }));
}

function createAgentTurnProgress(
  agentTools: AgentTool[],
  onProgress?: CaseAgentProgressHandler,
): AgentTurnProgress {
  return { agentTools, activities: [], sources: [], onProgress };
}

function handleProgressEvent(event: ResponseStreamEvent, progress: AgentTurnProgress): void {
  if (event.type === "response.output_item.added" && event.item.type === "function_call") {
    reportToolActivity(progress, event.item.id ?? event.item.call_id, event.item.name, "running");
  }
  if (event.type === "response.web_search_call.in_progress") {
    reportToolActivity(progress, event.item_id, "web_search", "running");
  }
  if (event.type === "response.web_search_call.searching") {
    reportToolActivity(progress, event.item_id, "web_search", "running");
  }
  if (event.type === "response.web_search_call.completed") {
    reportToolActivity(progress, event.item_id, "web_search", "completed");
  }
}

function reportToolActivity(
  progress: AgentTurnProgress,
  id: string,
  name: string,
  status: CaseAgentToolActivity["status"],
  detail?: string,
  sources?: CaseAgentSource[],
  operation?: CaseAgentToolActivity["operation"],
): void {
  const tool = findAgentTool(progress.agentTools, name);
  if (!tool) return;
  const activity = { id, name, label: tool.label, status, detail, sources, operation };
  const activityIndex = progress.activities.findIndex((item) => item.id === id);
  if (activityIndex >= 0 && isSameActivity(progress.activities[activityIndex], activity)) {
    if (activity.detail || !detail) return;
  }
  if (activityIndex >= 0) progress.activities[activityIndex] = activity;
  else progress.activities.push(activity);
  progress.onProgress?.(activity);
}

function findAgentTool(agentTools: AgentTool[], name: string): AgentTool | undefined {
  return agentTools.find((tool) => tool.kind === "hosted"
    ? name === "web_search" && tool.definition.type === "web_search"
    : tool.definition.name === name);
}

function findFunctionTool(agentTools: AgentTool[], name: string): FunctionAgentTool | undefined {
  const tool = agentTools.find((candidate) =>
    candidate.kind === "function" && candidate.definition.name === name);
  return tool?.kind === "function" ? tool : undefined;
}

function isSameActivity(left: CaseAgentToolActivity, right: CaseAgentToolActivity): boolean {
  return left.status === right.status
    && left.detail === right.detail
    && left.operation === right.operation
    && JSON.stringify(left.sources ?? []) === JSON.stringify(right.sources ?? []);
}

function collectSources(response: Response, progress: AgentTurnProgress): void {
  const sources = readSources(response);
  for (const source of sources) addUniqueSource(progress.sources, source);
}

function readSources(response: Response): CaseAgentSource[] {
  return response.output.flatMap((item) => item.type === "message"
    ? item.content.flatMap((content) => content.type === "output_text"
      ? content.annotations.filter(isUrlCitation).map(({ title, url }) => ({ title, url }))
      : [])
    : []);
}

type UrlCitation = Extract<ResponseOutputText["annotations"][number], { type: "url_citation" }>;

function isUrlCitation(annotation: ResponseOutputText["annotations"][number]): annotation is UrlCitation {
  return annotation.type === "url_citation" && isHttpUrl(annotation.url);
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function addUniqueSource(sources: CaseAgentSource[], source: CaseAgentSource): void {
  if (sources.some((item) => item.url === source.url)) return;
  sources.push(source);
}

function collectSearchQueries(response: Response, progress: AgentTurnProgress): void {
  for (const item of response.output) {
    if (item.type !== "web_search_call") continue;
    const { detail, operation, sources } = getWebSearchActivity(item.action);
    reportToolActivity(progress, item.id, "web_search", "completed", detail, sources, operation);
  }
}

function getWebSearchActivity(action: ResponseFunctionWebSearch["action"]): WebSearchActivity {
  if (action.type === "search") {
    return {
      detail: action.queries?.join("; ") ?? action.query,
      operation: "search",
      sources: action.sources?.flatMap(({ url }) => toSource(url)) ?? [],
    };
  }
  if (action.type === "open_page") {
    return { operation: "open_page", sources: action.url ? toSource(action.url) : [] };
  }
  return { detail: action.pattern, operation: "find_in_page", sources: toSource(action.url) };
}

function toSource(url: string): CaseAgentSource[] {
  return isHttpUrl(url) ? [{ title: getHostname(url), url }] : [];
}

interface WebSearchActivity {
  detail?: string;
  operation: CaseAgentToolActivity["operation"];
  sources: CaseAgentSource[];
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function createAgentInstructions(context: CaseIntakeAgentContext, intake: CaseIntakeState): string {
  const firstNameInstruction = context.userFirstName
    ? `The user's first name is ${context.userFirstName}. Use it naturally in a greeting, not every turn.`
    : "Do not guess the user's name.";
  return [
    "You are Bill Agent, an evidence-conscious assistant helping a user organize a consumer billing dispute.",
    "Respond naturally to the latest message, like a helpful chat assistant, while keeping the full conversation in context.",
    "If the latest message is only a greeting or social question, answer it naturally and ask an open question about what they need. Do not start intake questions yet.",
    "When the user explains a billing issue, acknowledge their actual situation and ask only the next useful question.",
    "Gather provider, issue description, and disputed amount when relevant; ask one focused question at a time and never repeat details already supplied.",
    "Save the issue description in the user's own words. Do not force it into a predefined category or rewrite it as another type of issue.",
    firstNameInstruction,
    "Message IDs are internal references only. Never show them or mention them in a reply to the user.",
    "When the user explicitly states facts, call record_case_facts and cite the exact Case message ID. Never guess or invent facts.",
    "Facts from conversation are user statements, not independently verified evidence. Do not describe them as documented proof.",
    "Use the conversation and saved facts to decide what would help the user next. Acknowledge new information naturally. If a detail would change the next step, ask one focused question; otherwise, respond directly or suggest a useful next step. Avoid repeating the case summary unless it helps the user. Keep internal workflow terms and milestones out of replies.",
    "Use web search for current or externally verifiable information when it helps answer the user. Cite retrieved sources; never claim to have searched if you did not.",
    "Format replies in standard Markdown supported by the chat: use **bold** for emphasis, blank lines between paragraphs, and Markdown links like [Wise](https://example.com) for citations. Never output raw HTML or malformed Markdown markers.",
    "When asked to draft an email, return only this exact structure: [EMAIL_DRAFT] on a line, then To: recipient (leave blank if unknown), then Subject: subject, a blank line, the complete email body, and [/EMAIL_DRAFT] on its own line. Do not invent recipient details.",
    "You may answer a direct general-information request, but keep billing-dispute guidance grounded, avoid legal conclusions, and never promise a recovery or send a message for the user.",
    ...(context.generateCaseTitle ? [
      "Prefix the final reply with [CASE_TITLE]Short title[/CASE_TITLE] on its own first line, including when the reply is an email draft.",
      "Use 2 to 6 words to summarize the opening user message in its language. Use only details the user shared and omit sensitive identifiers. For a greeting or an unclear request, use a neutral title.",
    ] : []),
    `Current saved intake facts: ${JSON.stringify(intake.facts)}`,
  ].join("\n");
}

function readFunctionCalls(response: Response): ResponseFunctionToolCall[] {
  return response.output.filter(isFunctionCall);
}

function isFunctionCall(item: ResponseOutputItem): item is ResponseFunctionToolCall {
  return item.type === "function_call";
}

function continueConversation(
  input: ResponseInputItem[],
  output: ResponseOutputItem[],
  toolOutputs: ResponseInputItem[],
): ResponseInputItem[] {
  return [...input, ...toResponseInputItems(output), ...toolOutputs];
}

function parseArguments(argumentsJson: string): unknown {
  return JSON.parse(argumentsJson) as unknown;
}

function createResult(
  response: string,
  intake: CaseIntakeState,
  progress: AgentTurnProgress,
): CaseIntakeAgentResult {
  const cleanedResponse = stripInternalCitations(removeInternalMessageIds(response)).trim();
  const titleMatch = cleanedResponse.match(/^\[CASE_TITLE\]([^\r\n]*?)\[\/CASE_TITLE\]\s*/i);
  const { answer, emailDraft } = extractEmailDraft(cleanedResponse.slice(titleMatch?.[0].length ?? 0));
  if (!answer && !emailDraft) throw new Error("OpenAI returned an empty response");
  return {
    response: answer,
    caseTitle: titleMatch?.[1].trim(),
    emailDraft,
    intake,
    sources: progress.sources,
    toolActivities: progress.activities,
  };
}

function extractEmailDraft(response: string): { answer: string; emailDraft?: CaseIntakeAgentResult["emailDraft"] } {
  const match = response.match(/\[EMAIL_DRAFT\]\s*To:\s*(.*?)\s*\nSubject:\s*(.*?)\s*\n\s*([\s\S]*?)\s*\[\/EMAIL_DRAFT\]/i);
  if (!match) return { answer: response };
  const emailDraft = { recipients: match[1].trim(), subject: match[2].trim(), body: match[3].trim() };
  return { answer: "", emailDraft };
}

function removeInternalMessageIds(response: string): string {
  return response.replace(/\bCase message ID:\s*[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/gi, "");
}

function createSafeFallback(intake: CaseIntakeState): string {
  if (intake.status === "ready") {
    return intake.facts.desiredOutcome
      ? "Got it. I can help you draft a message about the charge."
      : "Got it. What would you like to happen with this charge?";
  }
  const missing = nextMissingFact(intake);
  return `I’ve recorded what you shared. What ${missing} should I note?`;
}

function nextMissingFact(intake: CaseIntakeState): string {
  if (!intake.facts.provider) return "provider or merchant was the charge from";
  if (!intake.facts.issueType) return "happened with the charge";
  return "amount you were charged";
}

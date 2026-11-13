import { Annotation, Command, END, interrupt, isInterrupted, START, StateGraph, type BaseCheckpointSaver } from "@langchain/langgraph";
import type { ApprovedCaseEmailDraft, EmailApprovalDecision } from "../cases/case-email-draft";

export const MAX_AGENT_TOOL_CALLS = 2;

type WorkflowPhase = "new" | "request_model" | "execute_tools" | "request_final" | "approval_gate" | "finish" | "waiting_for_user";
type ModelRoute = "execute_tools" | "approval_gate" | "finish";
type ToolRoute = "request_model" | "request_final";

export interface AgentWorkflowHandlers {
  requestModel(): Promise<ModelRoute>;
  executeTools(remainingCalls: number): Promise<number>;
  requestFinalResponse(): Promise<void>;
  finish(): Promise<void>;
  getEmailDraft(): ApprovedCaseEmailDraft | undefined;
  sendEmail(userId: string, draft: ApprovedCaseEmailDraft): Promise<void>;
}

export interface AgentWorkflowTurn {
  caseId: string;
  messageId: string;
  userId: string;
}

const WorkflowState = Annotation.Root({
  caseId: Annotation<string>,
  messageId: Annotation<string>,
  userId: Annotation<string>,
  emailDraft: Annotation<ApprovedCaseEmailDraft | undefined>,
  phase: Annotation<WorkflowPhase>({
    reducer: (_current, update) => update,
    default: () => "new",
  }),
  toolCallsUsed: Annotation<number>({
    reducer: (_current, update) => update,
    default: () => 0,
  }),
});

type WorkflowStateValue = typeof WorkflowState.State;
type WorkflowStateUpdate = typeof WorkflowState.Update;

export async function runAgentWorkflow(
  checkpointer: BaseCheckpointSaver,
  turn: AgentWorkflowTurn,
  handlers: AgentWorkflowHandlers,
): Promise<boolean> {
  const graph = buildAgentWorkflowGraph(checkpointer, handlers);
  const result = await graph.invoke(turn, createWorkflowConfig(turn));
  return isInterrupted(result);
}

export async function resumeAgentWorkflow(
  checkpointer: BaseCheckpointSaver,
  turn: AgentWorkflowTurn,
  handlers: AgentWorkflowHandlers,
  decision: EmailApprovalDecision,
): Promise<void> {
  const graph = buildAgentWorkflowGraph(checkpointer, handlers);
  await graph.invoke(new Command({ resume: decision }), createWorkflowConfig(turn));
}

function createWorkflowConfig(turn: AgentWorkflowTurn) {
  return { configurable: { thread_id: turn.caseId, checkpoint_ns: createTurnCheckpointNamespace(turn.messageId) } };
}

function createTurnCheckpointNamespace(messageId: string): string {
  return `turn-${messageId}`;
}

function buildAgentWorkflowGraph(
  checkpointer: BaseCheckpointSaver,
  handlers: AgentWorkflowHandlers,
) {
  const graph = new StateGraph(WorkflowState)
    .addNode("begin_turn", beginTurn)
    .addNode("request_model", requestModel(handlers))
    .addNode("execute_tools", executeTools(handlers))
    .addNode("request_final", requestFinalResponse(handlers))
    .addNode("approval_gate", approvalGate(handlers))
    .addNode("finish", finishTurn(handlers))
    .addEdge(START, "begin_turn")
    .addEdge("begin_turn", "request_model")
    .addConditionalEdges("request_model", routeModel, { execute_tools: "execute_tools", approval_gate: "approval_gate", finish: "finish" })
    .addConditionalEdges("execute_tools", routeTools, { request_model: "request_model", request_final: "request_final" })
    .addConditionalEdges("request_final", routeDraft, { approval_gate: "approval_gate", finish: "finish" })
    .addEdge("approval_gate", "finish")
    .addEdge("finish", END);
  return graph.compile({ checkpointer });
}

function beginTurn(): WorkflowStateUpdate {
  return { phase: "request_model", toolCallsUsed: 0 };
}

function requestModel(handlers: AgentWorkflowHandlers) {
  return async (): Promise<WorkflowStateUpdate> => {
    const phase = await handlers.requestModel();
    const emailDraft = handlers.getEmailDraft();
    return { phase: emailDraft ? "approval_gate" : phase, emailDraft };
  };
}

function executeTools(handlers: AgentWorkflowHandlers) {
  return async (state: WorkflowStateValue): Promise<WorkflowStateUpdate> => {
    const remainingCalls = MAX_AGENT_TOOL_CALLS - state.toolCallsUsed;
    const callsUsed = await handlers.executeTools(remainingCalls);
    return nextToolsState(state.toolCallsUsed + callsUsed);
  };
}

function requestFinalResponse(handlers: AgentWorkflowHandlers) {
  return async (): Promise<WorkflowStateUpdate> => {
    await handlers.requestFinalResponse();
    return { phase: handlers.getEmailDraft() ? "approval_gate" : "finish", emailDraft: handlers.getEmailDraft() };
  };
}

function approvalGate(handlers: AgentWorkflowHandlers) {
  return async (state: WorkflowStateValue): Promise<WorkflowStateUpdate> => {
    const decision = interrupt<unknown, EmailApprovalDecision>({ type: "email_draft_approval", draft: state.emailDraft });
    if (decision.decision === "approve" && decision.draft) await handlers.sendEmail(state.userId, decision.draft);
    return { phase: "finish", emailDraft: decision.draft ?? state.emailDraft };
  };
}

function routeDraft(state: WorkflowStateValue): "approval_gate" | "finish" {
  return state.emailDraft ? "approval_gate" : "finish";
}

function finishTurn(handlers: AgentWorkflowHandlers) {
  return async (): Promise<WorkflowStateUpdate> => {
    await handlers.finish();
    return { phase: "waiting_for_user" };
  };
}

function routeModel(state: WorkflowStateValue): ModelRoute {
  if (state.phase === "execute_tools") return "execute_tools";
  return state.phase === "approval_gate" ? "approval_gate" : "finish";
}

function routeTools(state: WorkflowStateValue): ToolRoute {
  return state.toolCallsUsed >= MAX_AGENT_TOOL_CALLS ? "request_final" : "request_model";
}

function nextToolsState(toolCallsUsed: number): WorkflowStateUpdate {
  return { phase: toolCallsUsed >= MAX_AGENT_TOOL_CALLS ? "request_final" : "request_model", toolCallsUsed };
}

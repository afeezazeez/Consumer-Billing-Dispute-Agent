import { Annotation, END, START, StateGraph, type BaseCheckpointSaver } from "@langchain/langgraph";

export const MAX_AGENT_TOOL_CALLS = 3;

type WorkflowPhase = "new" | "request_model" | "execute_tools" | "request_final" | "finish" | "waiting_for_user";
type ModelRoute = "execute_tools" | "finish";
type ToolRoute = "request_model" | "request_final";

export interface AgentWorkflowHandlers {
  requestModel(): Promise<ModelRoute>;
  executeTools(remainingCalls: number): Promise<number>;
  requestFinalResponse(): Promise<void>;
  finish(): Promise<void>;
}

export interface AgentWorkflowTurn {
  caseId: string;
  messageId: string;
}

const WorkflowState = Annotation.Root({
  caseId: Annotation<string>,
  messageId: Annotation<string>,
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
): Promise<void> {
  const graph = buildAgentWorkflowGraph(checkpointer, handlers);
  await graph.invoke(turn, {
    configurable: {
      thread_id: turn.caseId,
      checkpoint_ns: createTurnCheckpointNamespace(turn.messageId),
    },
  });
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
    .addNode("finish", finishTurn(handlers))
    .addEdge(START, "begin_turn")
    .addEdge("begin_turn", "request_model")
    .addConditionalEdges("request_model", routeModel, { execute_tools: "execute_tools", finish: "finish" })
    .addConditionalEdges("execute_tools", routeTools, { request_model: "request_model", request_final: "request_final" })
    .addEdge("request_final", "finish")
    .addEdge("finish", END);
  return graph.compile({ checkpointer });
}

function beginTurn(): WorkflowStateUpdate {
  return { phase: "request_model", toolCallsUsed: 0 };
}

function requestModel(handlers: AgentWorkflowHandlers) {
  return async (): Promise<WorkflowStateUpdate> => ({ phase: await handlers.requestModel() });
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
    return { phase: "finish" };
  };
}

function finishTurn(handlers: AgentWorkflowHandlers) {
  return async (): Promise<WorkflowStateUpdate> => {
    await handlers.finish();
    return { phase: "waiting_for_user" };
  };
}

function routeModel(state: WorkflowStateValue): ModelRoute {
  return state.phase === "execute_tools" ? "execute_tools" : "finish";
}

function routeTools(state: WorkflowStateValue): ToolRoute {
  return state.toolCallsUsed >= MAX_AGENT_TOOL_CALLS ? "request_final" : "request_model";
}

function nextToolsState(toolCallsUsed: number): WorkflowStateUpdate {
  return { phase: toolCallsUsed >= MAX_AGENT_TOOL_CALLS ? "request_final" : "request_model", toolCallsUsed };
}

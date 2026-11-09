"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CaseConversation } from "./CaseConversation";
import { CaseDeleteModal } from "./CaseDeleteModal";
import { CaseSidebar } from "./CaseSidebar";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type {
  CaseAgentToolActivity,
  CaseConversation as CaseConversationData,
  CaseSummary,
  DashboardUser,
} from "./dashboard.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface DashboardWorkspaceProps {
  caseId?: string;
}

export function DashboardWorkspace({ caseId: routeCaseId }: DashboardWorkspaceProps) {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser>();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [activeCase, setActiveCase] = useState<CaseConversationData>();
  const [casePendingDelete, setCasePendingDelete] = useState<CaseSummary>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [error, setError] = useState("");
  const [signOutError, setSignOutError] = useState("");

  const selectCase = useCallback(async (caseId: string) => {
    const result = await requestData<{ case: CaseConversationData }>(`/cases/${caseId}`);
    setActiveCase(result.case);
    setError("");
  }, []);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setActiveCase(undefined);
    setError("");
    const currentUser = await requestData<DashboardUser>("/auth/me");
    setUser(currentUser);
    const savedCases = await requestData<{ cases: CaseSummary[] }>("/cases");
    setCases(savedCases.cases);
    if (routeCaseId) await selectCase(routeCaseId);
    else setActiveCase(undefined);
    setIsLoading(false);
  }, [routeCaseId, selectCase]);

  const handleSelectCase = useCallback((caseId: string) => {
    setIsMobileSidebarOpen(false);
    router.push(`/cases/${caseId}`);
  }, [router]);

  const handleNewCase = useCallback(() => {
    setIsMobileSidebarOpen(false);
    setActiveCase(undefined);
    setError("");
    router.push("/dashboard");
  }, [router]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((current) => !current);
  }, []);

  const handleToggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((current) => !current);
  }, []);

  const handleCloseMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const handleSendMessage = useCallback(async (content: string): Promise<boolean> => {
    const optimisticCase = activeCase
      ? appendOptimisticMessage(activeCase, content)
      : createPendingCase(content);
    const requestCaseId = optimisticCase.id;
    const requestMessageId = optimisticCase.messages.at(-1)?.id;
    setActiveCase(optimisticCase);
    setIsSending(true);
    setError("");
    try {
      const result = await sendCaseMessage(activeCase, optimisticCase, content);
      setActiveCase((current) => current?.id === requestCaseId ? result.case : current);
      setCases((current) => upsertCase(current, result.case));
      if (!activeCase) router.push(`/cases/${result.case.id}`);
      return true;
    } catch {
      setError("");
      setActiveCase((current) => current?.id === requestCaseId && requestMessageId
        ? updateMessageStatus(current, requestMessageId, "failed")
        : current);
      return true;
    } finally {
      setIsSending(false);
    }
  }, [activeCase, router]);

  const handleRetryMessage = useCallback(async (messageId: string, editedContent?: string): Promise<void> => {
    if (!activeCase) return;
    const retryingCase = updateMessageStatus(activeCase, messageId, "pending", editedContent);
    setActiveCase(retryingCase);
    setIsSending(true);
    setError("");
    try {
      const result = await retryAgentMessage(activeCase, messageId, editedContent);
      setActiveCase((current) => current?.id === activeCase.id ? result.case : current);
      setCases((current) => upsertCase(current, result.case));
    } catch {
      setActiveCase((current) => current?.id === activeCase.id
        ? updateMessageStatus(retryingCase, messageId, "failed", editedContent)
        : current);
      setError("");
    } finally {
      setIsSending(false);
    }
  }, [activeCase]);

  const handleDeleteCase = useCallback(async (caseId: string): Promise<void> => {
    try {
      await requestData(`/cases/${caseId}`, { method: "DELETE" });
      setCases((current) => current.filter((item) => item.id !== caseId));
      setActiveCase((current) => current?.id === caseId ? undefined : current);
      setError("");
      if (caseId === activeCase?.id || caseId === routeCaseId) router.replace("/dashboard");
    } catch {
      setError("We couldn’t delete this case. Please try again.");
    }
  }, [activeCase, routeCaseId, router]);

  const promptDeleteCase = useCallback((caseId: string) => {
    const target = cases.find((c) => c.id === caseId) || (activeCase?.id === caseId ? activeCase : undefined);
    if (target) {
      setCasePendingDelete(target);
    }
  }, [cases, activeCase]);

  const handleConfirmDeleteModal = useCallback(async () => {
    if (!casePendingDelete) return;
    const targetId = casePendingDelete.id;
    setCasePendingDelete(undefined);
    await handleDeleteCase(targetId);
  }, [casePendingDelete, handleDeleteCase]);

  const handleCancelDeleteModal = useCallback(() => {
    setCasePendingDelete(undefined);
  }, []);

  const handleRenameCase = useCallback(async (caseId: string, title: string): Promise<boolean> => {
    try {
      await requestData(`/cases/${caseId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      setCases((current) => current.map((item) => item.id === caseId ? { ...item, title } : item));
      setActiveCase((current) => current?.id === caseId ? { ...current, title } : current);
      setError("");
      return true;
    } catch {
      setError("We couldn’t rename this case. Please try again.");
      return false;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    setSignOutError("");
    try {
      await requestData<undefined>("/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      setSignOutError("We couldn’t sign you out. Please try again.");
      setIsSigningOut(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadWorkspace).catch((requestError: unknown) => handleLoadError(requestError, router, setError, setIsLoading));
  }, [loadWorkspace, router]);

  const hasProcessingCase = cases.some((item) => item.isProcessing);
  const isActiveCaseProcessing = activeCase?.messages.at(-1)?.processingStatus === "pending";

  useEffect(() => {
    if (!hasProcessingCase) return;
    const interval = window.setInterval(() => {
      void refreshProcessingCases(routeCaseId, isActiveCaseProcessing, setCases, setActiveCase);
    }, 1200);
    return () => window.clearInterval(interval);
  }, [hasProcessingCase, isActiveCaseProcessing, routeCaseId]);

  if (isLoading) return <main className="dashboard-loading" aria-live="polite"><span aria-hidden="true" className="loading-spinner" /><span>Loading your workspace…</span></main>;
  if (!user) return <main className="dashboard-loading" role="alert">We couldn’t load your account. Please sign in again.</main>;

  return (
    <main className={`dashboard-shell${isSidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <CaseSidebar
        activeCaseId={activeCase?.id ?? ""}
        cases={cases}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        isSigningOut={isSigningOut}
        onCloseMobile={handleCloseMobileSidebar}
        onDeleteCase={promptDeleteCase}
        onNewCase={handleNewCase}
        onRenameCase={handleRenameCase}
        onSelectCase={handleSelectCase}
        onSignOut={handleSignOut}
        onToggleCollapse={handleToggleSidebar}
        signOutError={signOutError}
        user={user}
      />
      <section className="dashboard-main" aria-label="Billing case chat">
        <button
          aria-label="Open cases sidebar"
          className="dashboard-mobile-menu-toggle"
          onClick={handleToggleMobileSidebar}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>
        {activeCase ? (
          <CaseConversation
            billingCase={activeCase}
            error={error}
            isSending={isSending}
            liveToolActivities={getPendingActivities(activeCase)}
            onDeleteCase={promptDeleteCase}
            onRenameCase={handleRenameCase}
            onRetryMessage={handleRetryMessage}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <DashboardEmptyState
            error={error}
            firstName={getFirstName(user.displayName)}
            isSending={isSending}
            onSendMessage={handleSendMessage}
          />
        )}
      </section>

      {/* Global Delete Confirmation Modal */}
      <CaseDeleteModal
        billingCase={casePendingDelete}
        isOpen={Boolean(casePendingDelete)}
        onCancel={handleCancelDeleteModal}
        onConfirm={handleConfirmDeleteModal}
      />
    </main>
  );
}

async function sendCaseMessage(
  activeCase: CaseConversationData | undefined,
  optimisticCase: CaseConversationData,
  content: string,
): Promise<{ case: CaseConversationData }> {
  if (activeCase) return requestCaseStream(`/cases/${activeCase.id}/messages/stream`, { content });
  const initialMessage = optimisticCase.messages[0];
  return requestCaseStream("/cases/stream", {
    openingMessage: content,
    caseId: optimisticCase.id,
    messageId: initialMessage.id,
  });
}

async function retryAgentMessage(
  billingCase: CaseConversationData,
  messageId: string,
  content?: string,
): Promise<{ case: CaseConversationData }> {
  const retryPath = `/cases/${billingCase.id}/messages/${messageId}/retry/stream`;
  try {
    return await requestCaseStream(retryPath, { content });
  } catch (error) {
    if (!isInitialMessage(billingCase, messageId)) throw error;
    return requestCaseStream("/cases/stream", createCaseRetryPayload(billingCase, messageId, content));
  }
}

async function requestCaseStream(
  path: string,
  body: unknown,
): Promise<{ case: CaseConversationData }> {
  const response = await fetch(`${API_URL}${path}`, {
    ...postJson(body),
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
  });
  if (!response.ok) throw new DashboardRequestError(response.status);
  const billingCase = await readCaseStream(response);
  return { case: billingCase };
}

async function readCaseStream(
  response: Response,
): Promise<CaseConversationData> {
  if (!response.body) throw new DashboardRequestError(500);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: CaseConversationData | undefined;
  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value, { stream: !chunk.done });
    const parsed = dispatchSseFrames(buffer);
    buffer = parsed.remainder;
    result = parsed.billingCase ?? result;
    if (parsed.failed) throw new DashboardRequestError(500);
    if (chunk.done) break;
  }
  if (!result) throw new DashboardRequestError(500);
  return result;
}

function dispatchSseFrames(
  buffer: string,
): { remainder: string; billingCase?: CaseConversationData; failed: boolean } {
  let remainder = buffer.replace(/\r\n/g, "\n");
  let billingCase: CaseConversationData | undefined;
  let failed = false;
  let boundary = remainder.indexOf("\n\n");
  while (boundary >= 0) {
    const frame = remainder.slice(0, boundary);
    remainder = remainder.slice(boundary + 2);
    const event = parseSseFrame(frame);
    if (event?.type === "done") billingCase = event.data.case as CaseConversationData;
    if (event?.type === "failure") failed = true;
    boundary = remainder.indexOf("\n\n");
  }
  return { remainder, billingCase, failed };
}

function parseSseFrame(frame: string): ParsedSseEvent | undefined {
  const eventType = frame.split("\n").find((line) => line.startsWith("event: "))?.slice(7);
  const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
  if (!eventType || !data) return undefined;
  return { type: eventType, data: JSON.parse(data) as Record<string, unknown> };
}

interface ParsedSseEvent {
  type: string;
  data: Record<string, unknown>;
}

function isInitialMessage(billingCase: CaseConversationData, messageId: string): boolean {
  return billingCase.messages.length === 1 && billingCase.messages[0].id === messageId;
}

function createCaseRetryPayload(
  billingCase: CaseConversationData,
  messageId: string,
  editedContent?: string,
): Record<string, string> {
  return {
    openingMessage: editedContent ?? billingCase.messages[0].content,
    caseId: billingCase.id,
    messageId,
  };
}

function postJson(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function createPendingCase(content: string): CaseConversationData {
  const now = new Date().toISOString();
  const userMessage = {
    id: crypto.randomUUID(),
    role: "user" as const,
    content,
    createdAt: now,
    processingStatus: "pending" as const,
    sources: [],
    toolActivities: [],
  };
  return {
    id: crypto.randomUUID(),
    title: createCaseTitle(content),
    status: "open",
    isProcessing: true,
    createdAt: now,
    updatedAt: now,
    lastMessage: content,
    messages: [userMessage],
    intake: { status: "collecting", facts: {} },
  };
}

function createCaseTitle(message: string): string {
  const normalized = message.trim().replace(/\s+/g, " ");
  return normalized.length <= 60 ? normalized : `${normalized.slice(0, 57).trimEnd()}…`;
}

function appendOptimisticMessage(
  billingCase: CaseConversationData,
  content: string,
): CaseConversationData {
  const createdAt = new Date().toISOString();
  const message = {
    id: crypto.randomUUID(),
    role: "user" as const,
    content,
    createdAt,
    processingStatus: "pending" as const,
    sources: [],
    toolActivities: [],
  };
  return {
    ...billingCase,
    updatedAt: createdAt,
    lastMessage: content,
    messages: [...billingCase.messages, message],
  };
}

function updateMessageStatus(
  billingCase: CaseConversationData,
  messageId: string,
  processingStatus: CaseConversationData["messages"][number]["processingStatus"],
  content?: string,
): CaseConversationData {
  return {
    ...billingCase,
    messages: billingCase.messages.map((message) => message.id === messageId
      ? { ...message, processingStatus, content: content ?? message.content }
      : message),
  };
}

async function requestData<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: "include" });
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new DashboardRequestError(response.status);
  return payload.data as T;
}

function upsertCase(current: CaseSummary[], billingCase: CaseConversationData): CaseSummary[] {
  const summary = toSummary(billingCase);
  return [summary, ...current.filter((item) => item.id !== summary.id)];
}

function toSummary(billingCase: CaseConversationData): CaseSummary {
  return {
    id: billingCase.id,
    title: billingCase.title,
    status: billingCase.status,
    updatedAt: billingCase.updatedAt,
    lastMessage: billingCase.lastMessage,
    isProcessing: billingCase.isProcessing ?? billingCase.messages.some((message) =>
      message.role === "user" && message.processingStatus === "pending"),
  };
}

function getPendingActivities(billingCase: CaseConversationData): CaseAgentToolActivity[] {
  return [...billingCase.messages].reverse().find((message) =>
    message.role === "user" && message.processingStatus === "pending")?.toolActivities ?? [];
}

async function refreshProcessingCases(
  routeCaseId: string | undefined,
  isActiveCaseProcessing: boolean,
  setCases: (cases: CaseSummary[] | ((current: CaseSummary[]) => CaseSummary[])) => void,
  setActiveCase: (billingCase: CaseConversationData | undefined | ((current: CaseConversationData | undefined) => CaseConversationData | undefined)) => void,
): Promise<void> {
  try {
    const result = await requestData<{ cases: CaseSummary[] }>("/cases");
    setCases(result.cases);
    const activeSummary = result.cases.find((item) => item.id === routeCaseId);
    if (routeCaseId && (activeSummary?.isProcessing || isActiveCaseProcessing)) {
      const conversation = await requestData<{ case: CaseConversationData }>(`/cases/${routeCaseId}`);
      setActiveCase((current) => current?.id === routeCaseId ? conversation.case : current);
    }
  } catch {
    // The active turn keeps running; the next poll will refresh its visible state.
  }
}

function getFirstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || "there";
}

function handleLoadError(error: unknown, router: ReturnType<typeof useRouter>, setError: (message: string) => void, setIsLoading: (loading: boolean) => void): void {
  if (error instanceof DashboardRequestError && error.status === 401) {
    router.replace("/login");
    return;
  }
  setError("We couldn’t load your cases. Refresh the page to try again.");
  setIsLoading(false);
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

class DashboardRequestError extends Error {
  constructor(public readonly status: number) { super("Dashboard request failed"); }
}

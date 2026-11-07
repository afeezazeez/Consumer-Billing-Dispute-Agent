"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CaseConversation } from "./CaseConversation";
import { CaseSidebar } from "./CaseSidebar";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { CaseConversation as CaseConversationData, CaseSummary, DashboardUser } from "./dashboard.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function DashboardWorkspace() {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser>();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [activeCase, setActiveCase] = useState<CaseConversationData>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [signOutError, setSignOutError] = useState("");

  const selectCase = useCallback(async (caseId: string) => {
    const result = await requestData<{ case: CaseConversationData }>(`/cases/${caseId}`);
    setActiveCase(result.case);
    setError("");
  }, []);

  const loadWorkspace = useCallback(async () => {
    const currentUser = await requestData<DashboardUser>("/auth/me");
    setUser(currentUser);
    const savedCases = await requestData<{ cases: CaseSummary[] }>("/cases");
    setCases(savedCases.cases);
    if (savedCases.cases[0]) await selectCase(savedCases.cases[0].id);
    setIsLoading(false);
  }, [selectCase]);

  const handleSelectCase = useCallback((caseId: string) => {
    void selectCase(caseId).catch(() => setError("We couldn’t open that case. Please try again."));
  }, [selectCase]);

  const handleNewCase = useCallback(() => {
    setActiveCase(undefined);
    setError("");
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((current) => !current);
  }, []);

  const handleSendMessage = useCallback(async (content: string): Promise<boolean> => {
    setIsSending(true);
    setError("");
    try {
      const result = await sendCaseMessage(activeCase, content);
      setActiveCase(result.case);
      setCases((current) => upsertCase(current, result.case));
      return true;
    } catch {
      setError("We couldn’t save your message. Please try again.");
      return false;
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
    } catch {
      setError("We couldn’t delete this case. Please try again.");
    }
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

  if (isLoading) return <main className="dashboard-loading" aria-live="polite"><span aria-hidden="true" className="loading-spinner" /><span>Loading your workspace…</span></main>;
  if (!user) return <main className="dashboard-loading" role="alert">We couldn’t load your account. Please sign in again.</main>;

  return (
    <main className={`dashboard-shell${isSidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <CaseSidebar cases={cases} activeCaseId={activeCase?.id ?? ""} user={user} isSigningOut={isSigningOut} signOutError={signOutError} isCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleSidebar} onNewCase={handleNewCase} onSelectCase={handleSelectCase} onSignOut={handleSignOut} />
      <section className="dashboard-main" aria-label="Billing case chat">
        {activeCase ? <CaseConversation billingCase={activeCase} isSending={isSending} error={error} onSendMessage={handleSendMessage} onDeleteCase={handleDeleteCase} onRenameCase={handleRenameCase} /> : <DashboardEmptyState firstName={getFirstName(user.displayName)} isSending={isSending} error={error} onSendMessage={handleSendMessage} />}
      </section>
    </main>
  );
}

async function sendCaseMessage(activeCase: CaseConversationData | undefined, content: string): Promise<{ case: CaseConversationData }> {
  const url = activeCase ? `/cases/${activeCase.id}/messages` : "/cases";
  const payload = activeCase ? { content } : { openingMessage: content };
  return requestData(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
  return { id: billingCase.id, title: billingCase.title, status: billingCase.status, updatedAt: billingCase.updatedAt, lastMessage: billingCase.lastMessage };
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

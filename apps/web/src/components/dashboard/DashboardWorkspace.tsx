"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CaseConversation } from "./CaseConversation";
import { CaseSidebar } from "./CaseSidebar";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { NewCasePanel } from "./NewCasePanel";
import type { CaseConversation as CaseConversationData, CaseSummary, DashboardUser } from "./dashboard.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function DashboardWorkspace() {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser>();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [activeCase, setActiveCase] = useState<CaseConversationData>();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNewCase, setIsNewCase] = useState(false);
  const [error, setError] = useState("");
  const [signOutError, setSignOutError] = useState("");

  const selectCase = useCallback(async (caseId: string) => {
    const result = await requestJson<{ case: CaseConversationData }>(`/cases/${caseId}`);
    setActiveCase(result.case);
    setIsNewCase(false);
  }, []);

  const loadWorkspace = useCallback(async () => {
    const currentUser = await requestJson<{ user: DashboardUser }>("/auth/me");
    setUser(currentUser.user);
    const savedCases = await requestJson<{ cases: CaseSummary[] }>("/cases");
    setCases(savedCases.cases);
    if (savedCases.cases[0]) await selectCase(savedCases.cases[0].id);
    setIsLoading(false);
  }, [selectCase]);

  const handleSelectCase = useCallback((caseId: string) => {
    setError("");
    void selectCase(caseId).catch(() => setError("We couldn’t open that case. Please try again."));
  }, [selectCase]);

  const handleNewCase = useCallback(() => {
    setActiveCase(undefined);
    setIsNewCase(true);
    setError("");
  }, []);

  const handleCreateCase = useCallback(async (message: string) => {
    setIsCreating(true);
    setError("");
    try {
      const result = await requestJson<{ case: CaseConversationData }>("/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingMessage: message }),
      });
      setActiveCase(result.case);
      setCases((current) => [toSummary(result.case), ...current]);
      setIsNewCase(false);
    } catch {
      setError("We couldn’t save this case. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    setSignOutError("");
    try {
      await request("/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      setSignOutError("We couldn’t sign you out. Please try again.");
      setIsSigningOut(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadWorkspace).catch((requestError: unknown) => handleLoadError(requestError, router, setError, setIsLoading));
  }, [loadWorkspace, router]);

  if (isLoading) return <main className="dashboard-loading" aria-live="polite">Loading your workspace…</main>;
  if (!user) return <main className="dashboard-loading" role="alert">We couldn’t load your account. Please sign in again.</main>;

  return (
    <main className="dashboard-shell">
      <CaseSidebar cases={cases} activeCaseId={activeCase?.id ?? ""} user={user} isSigningOut={isSigningOut} signOutError={signOutError} onNewCase={handleNewCase} onSelectCase={handleSelectCase} onSignOut={handleSignOut} />
      <section className="dashboard-main" aria-label="Billing case workspace">
        {error && !isNewCase && <p className="dashboard-global-error" role="alert">{error}</p>}
        {isNewCase ? <NewCasePanel isSubmitting={isCreating} error={error} onCreateCase={handleCreateCase} /> : activeCase ? <CaseConversation billingCase={activeCase} /> : <DashboardEmptyState onNewCase={handleNewCase} />}
      </section>
    </main>
  );
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await request(path, options);
  return response.json() as Promise<T>;
}

async function request(path: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: "include" });
  if (!response.ok) throw new DashboardRequestError(response.status);
  return response;
}

function toSummary(billingCase: CaseConversationData): CaseSummary {
  return { id: billingCase.id, title: billingCase.title, status: billingCase.status, updatedAt: billingCase.updatedAt, lastMessage: billingCase.lastMessage };
}

function handleLoadError(error: unknown, router: ReturnType<typeof useRouter>, setError: (message: string) => void, setIsLoading: (loading: boolean) => void): void {
  if (error instanceof DashboardRequestError && error.status === 401) {
    router.replace("/login");
    return;
  }
  setError("We couldn’t load your cases. Refresh the page to try again.");
  setIsLoading(false);
}

class DashboardRequestError extends Error {
  constructor(public readonly status: number) { super("Dashboard request failed"); }
}

"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { GmailConnectorCard } from "./GmailConnectorCard";
import type { GmailConnectorStatus } from "./connector.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ConnectorToast {
  message: string;
  kind: "success" | "error";
}

export function ConnectorsPage() {
  const [status, setStatus] = useState<GmailConnectorStatus>();
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState<ConnectorToast>();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const handleSearch = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.currentTarget.value);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await getGmailStatus());
      setError("");
    }
    catch { setError("We couldn’t load the Gmail connection. Please try again."); }
    finally { setIsLoading(false); }
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError("");
    void loadStatus();
  }, [loadStatus]);

  const disconnectGmail = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError("");
    try {
      await deleteGmailConnection();
      setToast({ message: "Gmail disconnected", kind: "success" });
      await loadStatus();
      return true;
    }
    catch {
      return false;
    }
    finally { setIsLoading(false); }
  }, [loadStatus]);

  const connectGmail = useCallback(() => {
    window.location.assign(`${API_URL}/connectors/gmail/google`);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    getGmailStatus().then((nextStatus) => {
      if (!isCurrent) return;
      setStatus(nextStatus);
      setError("");
      setIsLoading(false);
    }).catch(() => {
      if (!isCurrent) return;
      setError("We couldn’t load the Gmail connection. Please try again.");
      setIsLoading(false);
    });
    readConnectionResult(setToast);
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(undefined), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const dismissToast = useCallback(() => setToast(undefined), []);

  return (
    <div className="connectors-page">
      <ConnectorsPageHeader searchTerm={searchTerm} onSearch={handleSearch} />
      {toast && <ConnectorToastView toast={toast} onDismiss={dismissToast} />}
      {error && <p className="connectors-page-error" role="alert">{error}<button onClick={handleRetry} type="button">Retry</button></p>}
      <section aria-label="Available connectors" className="connectors-list">
        <h2>Available</h2>
        {matchesGmail(searchTerm) && (
          <GmailConnectorCard
            error={error}
            isLoading={isLoading}
            onConnect={connectGmail}
            onDisconnect={disconnectGmail}
            status={status}
          />
        )}
        {!matchesGmail(searchTerm) && <p className="connectors-empty">No connectors match your search.</p>}
      </section>
    </div>
  );
}

function ConnectorToastView({ toast, onDismiss }: { toast: ConnectorToast; onDismiss: () => void }) {
  return (
    <div aria-live="polite" className={`connector-toast is-${toast.kind}`} role="status">
      <span aria-hidden="true" className="connector-toast-icon">{toast.kind === "success" ? "✓" : "!"}</span>
      <span>{toast.message}</span>
      <button aria-label="Dismiss notification" onClick={onDismiss} type="button">×</button>
    </div>
  );
}

function ConnectorsPageHeader({ searchTerm, onSearch }: { searchTerm: string; onSearch: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <header className="connectors-page-header">
      <h1>Connectors</h1>
      <p>Connect services Bill Agent can use when you ask it to take an action.</p>
      <label className="connectors-search">
        <SearchIcon />
        <input aria-label="Search connectors" onChange={onSearch} placeholder="Search connectors" value={searchTerm} />
      </label>
    </header>
  );
}

function matchesGmail(searchTerm: string): boolean {
  return "gmail google email".includes(searchTerm.trim().toLowerCase());
}

async function getGmailStatus(): Promise<GmailConnectorStatus> {
  const response = await fetch(`${API_URL}/connectors/gmail/status`, { credentials: "include" });
  return readApiResponse<GmailConnectorStatus>(response);
}

async function deleteGmailConnection(): Promise<void> {
  const response = await fetch(`${API_URL}/connectors/gmail`, { credentials: "include", method: "DELETE" });
  await readApiResponse<unknown>(response);
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json() as { data?: T; message?: string; success?: boolean };
  if (!response.ok || !payload.success) throw new Error(payload.message || "Connector request failed");
  return payload.data as T;
}

function readConnectionResult(setToast: (toast: ConnectorToast) => void): void {
  const result = new URLSearchParams(window.location.search).get("gmail");
  if (!result) return;
  setToast(result === "connected"
    ? { message: "Gmail connected", kind: "success" }
    : { message: "Gmail couldn’t connect. Please try again.", kind: "error" });
  window.history.replaceState({}, "", window.location.pathname);
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4.2 4.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { ConnectorDisconnectDialog } from "./ConnectorDisconnectDialog";
import { GmailBrandIcon } from "./GmailBrandIcon";
import type { GmailConnectorStatus } from "./connector.types";

interface GmailConnectorCardProps {
  error: string;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => Promise<boolean>;
  status?: GmailConnectorStatus;
}

export function GmailConnectorCard({ error, isLoading, onConnect, onDisconnect, status }: GmailConnectorCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [disconnectError, setDisconnectError] = useState("");
  const infoAreaRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLElement | null>(null);
  const toggleDetails = useCallback(() => setShowDetails((current) => !current), []);
  const closeDetails = useCallback(() => setShowDetails(false), []);
  const requestDisconnect = useCallback(() => {
    setDisconnectError("");
    setShowDisconnectDialog(true);
  }, []);
  const cancelDisconnect = useCallback(() => {
    setShowDisconnectDialog(false);
    setDisconnectError("");
  }, []);
  const confirmDisconnect = useCallback(async () => {
    if (await onDisconnect()) {
      setShowDisconnectDialog(false);
      setDisconnectError("");
      return;
    }
    setDisconnectError("Gmail couldn’t be disconnected. Please try again.");
  }, [onDisconnect]);

  useEffect(() => {
    if (!showDetails) return;
    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (infoAreaRef.current?.contains(target) || detailsRef.current?.contains(target))) return;
      closeDetails();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetails();
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeDetails, showDetails]);

  return (
    <article className="connector-card">
      <GmailBrandIcon className="gmail-brand-icon" />
      <div className="connector-card-copy">
        <h3>Gmail</h3>
        <p>Send approved email drafts from your Gmail account</p>
        {status?.connected && <span className="connector-status">Connected · {status.email}</span>}
        {status && !status.configured && <span className="connector-setup-needed">Setup required</span>}
        {error && !status && <span className="connector-setup-needed">Connection status unavailable</span>}
      </div>
      <div className="connector-info-area" ref={infoAreaRef}>
        <button aria-controls="gmail-connector-details" aria-expanded={showDetails} aria-label="Gmail connector information" className="connector-info-button" onClick={toggleDetails} title="Gmail connector information" type="button">
          <InfoIcon />
        </button>
      </div>
      <ConnectorAction connected={Boolean(status?.connected)} configured={Boolean(status?.configured)} isLoading={isLoading} onConnect={onConnect} onDisconnect={requestDisconnect} />
      {showDetails && <GmailConnectorDetails detailsRef={detailsRef} />}
      <ConnectorDisconnectDialog
        accountEmail={status?.email}
        connectorName="Gmail"
        error={disconnectError}
        isLoading={isLoading}
        isOpen={showDisconnectDialog}
        onCancel={cancelDisconnect}
        onConfirm={confirmDisconnect}
      />
    </article>
  );
}

function ConnectorAction({ connected, configured, isLoading, onConnect, onDisconnect }: {
  connected: boolean; configured: boolean; isLoading: boolean; onConnect: () => void; onDisconnect: () => void;
}) {
  const label = isLoading ? "Please wait…" : connected ? "Disconnect" : "Connect";
  return <button className={`connector-action${connected ? " is-connected" : ""}`} disabled={isLoading || (!configured && !connected)} onClick={connected ? onDisconnect : onConnect} type="button">{label}</button>;
}

function GmailConnectorDetails({ detailsRef }: { detailsRef: RefObject<HTMLElement | null> }) {
  return (
    <aside className="connector-details" id="gmail-connector-details" ref={detailsRef}>
      <p><strong>Access:</strong> send email on your behalf. Bill Agent cannot read your inbox.</p>
      <p><strong>Your data:</strong> email drafts are saved in the relevant Bill Agent case history.</p>
      <p><strong>Google testing:</strong> Google may show an “app isn’t verified” warning. Choose Advanced → Go to Bill Agent to continue. Bill Agent is safe to use.</p>
    </aside>
  );
}

function InfoIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M12 11v5m0-8h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>;
}

"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { CaseAttachment, DocumentField, DocumentReview } from "./dashboard.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const fields: { key: DocumentField; label: string }[] = [
  { key: "provider", label: "Provider" },
  { key: "amount", label: "Charge amount" },
  { key: "chargeDate", label: "Charge date" },
];

interface DocumentReviewDialogProps {
  attachment: CaseAttachment;
  onReview: (id: string, review: DocumentReview) => void;
  onClose: () => void;
}

export function DocumentReviewDialog({ attachment, onReview, onClose }: DocumentReviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [review, setReview] = useState(attachment.review);
  const [values, setValues] = useState(() => reviewValues(attachment.review));
  const [busy, setBusy] = useState<"extracting" | "saving">();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;
    setValues((current) => ({ ...current, [name]: value }));
    setSaved(false);
  }, []);

  const extract = useCallback(async () => {
    setBusy("extracting");
    setError("");
    try {
      const result = await requestReview(attachment.id, "/extract", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      setReview(result);
      setValues(reviewValues(result));
      onReview(attachment.id, result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn’t read the document.");
    } finally {
      setBusy(undefined);
    }
  }, [attachment.id, onReview]);

  const confirm = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("saving");
    setError("");
    try {
      const result = await requestReview(attachment.id, "", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setReview(result);
      setValues(reviewValues(result));
      onReview(attachment.id, result);
      setSaved(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn’t save the review.");
    } finally {
      setBusy(undefined);
    }
  }, [attachment.id, onReview, values]);

  return (
    <dialog ref={dialogRef} onClose={onClose} className="document-review-dialog" aria-label="Review document details">
      <header>
        <div><h2>Review document details</h2><p>{attachment.name}</p></div>
        <button type="button" className="document-review-close" onClick={close} aria-label="Close review">×</button>
      </header>
      {error && <p role="alert" className="document-review-error">{error}</p>}
      {!review ? (
        <>
          <p>Extract the provider, charge amount, and date. This sends the file to the AI for reading.</p>
          <button type="button" className="document-review-primary" onClick={extract} disabled={Boolean(busy)}>
            {busy === "extracting" ? "Reading document…" : "Extract details"}
          </button>
        </>
      ) : (
        <form onSubmit={confirm} aria-busy={Boolean(busy)}>
          <p>Check these details against the original. Leave anything you can’t confirm blank.</p>
          {fields.map(({ key, label }) => {
            const field = review.extracted[key];
            const confidence = field.confidence === "clear" ? "Clear" : field.confidence === "uncertain" ? "Uncertain" : "Unreadable";
            return (
              <label key={key} className="document-review-field">
                <strong>{label}</strong>
                <input name={key} value={values[key]} onChange={handleChange} maxLength={160} readOnly={Boolean(busy)} />
                <span>{confidence}{field.page ? ` · Page ${field.page}` : ""}</span>
                {field.excerpt && <span>Source excerpt · “{field.excerpt}”</span>}
              </label>
            );
          })}
          <button type="submit" className="document-review-primary" disabled={Boolean(busy)}>
            {busy === "saving" ? "Saving…" : "Confirm details"}
          </button>
          {(saved || review.confirmed) && (
            <p role="status">{saved ? "Saved. The agent can use these details in your next reply." : "The agent uses the last confirmed values."}</p>
          )}
        </form>
      )}
    </dialog>
  );
}

function reviewValues(review?: DocumentReview): Record<DocumentField, string> {
  return Object.fromEntries(fields.map(({ key }) => [
    key, (review?.confirmed ? review.confirmed[key] : review?.extracted[key].value) ?? "",
  ])) as Record<DocumentField, string>;
}

async function requestReview(id: string, suffix: string, request: RequestInit): Promise<DocumentReview> {
  const response = await fetch(`${API_URL}/cases/attachments/${id}/review${suffix}`, { ...request, credentials: "include" });
  const payload = await response.json().catch(() => null) as { data?: { review?: DocumentReview }; message?: string } | null;
  if (!response.ok || !payload?.data?.review) {
    throw new Error(payload?.message || "Couldn’t update the document review. Try again.");
  }
  return payload.data.review;
}

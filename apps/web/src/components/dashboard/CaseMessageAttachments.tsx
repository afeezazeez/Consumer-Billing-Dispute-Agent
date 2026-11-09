"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { ComposerAttachmentPreview } from "./ComposerAttachmentPreview";
import type { CaseAttachment } from "./dashboard.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function CaseMessageAttachments({ attachments }: { attachments: CaseAttachment[] }) {
  const [preview, setPreview] = useState<File>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const closePreview = useCallback(() => setPreview(undefined), []);

  const openPreview = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    const attachment = attachments.find(({ id }) => id === event.currentTarget.dataset.id);
    if (!attachment || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(attachmentUrl(attachment.id), { credentials: "include" });
      if (!response.ok) throw new Error("Attachment unavailable");
      setPreview(new File([await response.blob()], attachment.name, { type: attachment.mediaType }));
    } catch {
      setError("Couldn’t open the attachment. Try again.");
    } finally {
      setLoading(false);
    }
  }, [attachments, loading]);

  return (
    <>
      <ul className="case-message-attachments" aria-label="Message attachments" aria-busy={loading}>
        {attachments.map((attachment) => (
          <li key={attachment.id} className={attachment.mediaType.startsWith("image/") ? "case-attachment-image" : undefined}>
            <button
              type="button"
              data-id={attachment.id}
              onClick={openPreview}
              disabled={loading}
              title={attachment.name}
              aria-label={`Preview ${attachment.name}`}
            >
              {attachment.mediaType.startsWith("image/") ? (
                <picture><img src={attachmentUrl(attachment.id)} alt="" loading="lazy" /></picture>
              ) : (
                <>
                  <span className="case-attachment-file-type" aria-hidden="true">PDF</span>
                  <span className="case-attachment-file-name">{attachment.name}</span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
      {preview && <ComposerAttachmentPreview file={preview} onClose={closePreview} />}
    </>
  );
}

function attachmentUrl(id: string): string {
  return `${API_URL}/cases/attachments/${id}`;
}

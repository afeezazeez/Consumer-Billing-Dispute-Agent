"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { PdfFileIcon } from "./PdfFileIcon";
import { ComposerAttachmentPreview } from "./ComposerAttachmentPreview";
import type { CaseAttachment } from "./dashboard.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function CaseMessageAttachments({ attachments }: { attachments: CaseAttachment[] }) {
  const [preview, setPreview] = useState<File>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const images = attachments.filter(isImage);
  const documents = attachments.filter((attachment) => !isImage(attachment));
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
      {[{ label: "Attached images", files: images }, { label: "Attached PDFs", files: documents }]
        .map(({ label, files }) => files.length > 0 && (
          <ul key={label} className="case-message-attachments" aria-label={label} aria-busy={loading}>
            {files.map((attachment) => (
              <li key={attachment.id} className={isImage(attachment) ? "case-attachment-image" : undefined}>
                <button
                  type="button"
                  data-id={attachment.id}
                  onClick={openPreview}
                  disabled={loading}
                  title={attachment.name}
                  aria-label={`Preview ${attachment.name}`}
                >
                  {isImage(attachment) ? (
                    <picture><img src={attachmentUrl(attachment.id)} alt="" loading="lazy" /></picture>
                  ) : (
                    <>
                      <PdfFileIcon />
                      <span className="case-attachment-file-name">{attachment.name}</span>
                    </>
                  )}
                </button>
              </li>
              ))}
          </ul>
        ))}
      {error && <p role="alert">{error}</p>}
      {preview && <ComposerAttachmentPreview file={preview} onClose={closePreview} />}
    </>
  );
}

function isImage(attachment: CaseAttachment): boolean {
  return attachment.mediaType.startsWith("image/");
}

function attachmentUrl(id: string): string {
  return `${API_URL}/cases/attachments/${id}`;
}

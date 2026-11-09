"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { ComposerAttachmentPreview } from "./ComposerAttachmentPreview";
import { ComposerAttachmentThumbnail } from "./ComposerAttachmentThumbnail";
import type { StagedAttachment } from "./useStagedAttachments";

interface ComposerAttachmentsProps {
  attachments: StagedAttachment[];
  onRetry: (item: StagedAttachment) => void;
  isUploading: boolean;
  onRemove: (index: number) => void;
}

export function ComposerAttachments({ attachments, onRemove, onRetry, isUploading }: ComposerAttachmentsProps) {
  const [preview, setPreview] = useState<File>();
  const openPreview = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const item = attachments[Number(event.currentTarget.dataset.index)];
    if (item?.status === "failed") onRetry(item);
    else if (item) setPreview(item.file);
  }, [attachments, onRetry]);
  const removeFile = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onRemove(Number(event.currentTarget.dataset.index));
  }, [onRemove]);
  const closePreview = useCallback(() => setPreview(undefined), []);

  if (attachments.length === 0) return null;
  return (
    <>
      <ul className="composer-attachments" aria-label="Selected attachments">
        {attachments.map(({ file, status, key }, index) => {
          const isImage = file.type.startsWith("image/");
          return (
            <li key={key}>
              <button type="button" data-index={index} onClick={openPreview} title={status === "failed" ? "Upload failed. Click to retry." : file.name} aria-label={`${status === "failed" ? "Retry upload for" : "Preview"} ${file.name}`}>
                {isImage ? <ComposerAttachmentThumbnail file={file} /> : (
                  <svg className="composer-pdf-icon" aria-hidden="true" viewBox="0 0 40 48" fill="none">
                    <path d="M7 2h17l10 10v31a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" fill="white" stroke="currentColor" strokeWidth="2" />
                    <path d="M24 2v10h10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <rect x="1" y="22" width="37" height="15" rx="3" fill="currentColor" />
                    <text x="19.5" y="33" fill="white" textAnchor="middle" fontSize="10" fontWeight="700">PDF</text>
                  </svg>
                )}
                {status !== "ready" && (
                  <span className="composer-attachment-progress" role="status">
                    {status === "uploading"
                      ? <span className="claude-agent-spinner" aria-label={`Uploading ${file.name}`} />
                      : <span aria-label={`Upload failed for ${file.name}`}>↻</span>}
                  </span>
                )}
              </button>
              <button type="button" data-index={index} onClick={removeFile} disabled={isUploading} aria-label={`Remove ${file.name}`}>×</button>
            </li>
          );
        })}
      </ul>
      {preview && <ComposerAttachmentPreview file={preview} onClose={closePreview} />}
    </>
  );
}

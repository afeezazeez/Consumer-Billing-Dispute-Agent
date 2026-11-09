"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function ComposerAttachmentPreview({ file, onClose }: { file: File; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState<string>();
  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const frame = window.requestAnimationFrame(() => setUrl(objectUrl));
    return () => {
      window.cancelAnimationFrame(frame);
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <dialog ref={dialogRef} onClose={onClose} className="composer-attachment-preview" aria-label={`Preview ${file.name}`}>
      <header>
        <strong>{file.name}</strong>
        <button type="button" onClick={close} aria-label="Close preview">×</button>
      </header>
      {url && (file.type === "application/pdf"
        ? <object data={url} type="application/pdf" aria-label={file.name}><a href={url} target="_blank" rel="noreferrer">Open PDF</a></object>
        : <picture><img src={url} alt={file.name} /></picture>)}
    </dialog>
  );
}

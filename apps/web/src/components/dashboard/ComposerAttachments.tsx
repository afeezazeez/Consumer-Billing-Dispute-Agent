"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { ComposerAttachmentPreview } from "./ComposerAttachmentPreview";
import { ComposerAttachmentThumbnail } from "./ComposerAttachmentThumbnail";

interface ComposerAttachmentsProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function ComposerAttachments({ files, onRemove }: ComposerAttachmentsProps) {
  const [preview, setPreview] = useState<File>();
  const openPreview = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setPreview(files[Number(event.currentTarget.dataset.index)]);
  }, [files]);
  const removeFile = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onRemove(Number(event.currentTarget.dataset.index));
  }, [onRemove]);
  const closePreview = useCallback(() => setPreview(undefined), []);

  if (files.length === 0) return null;
  return (
    <>
      <ul className="composer-attachments" aria-label="Selected attachments">
        {files.map((file, index) => {
          const isImage = file.type.startsWith("image/");
          return (
            <li className={isImage ? "composer-image-attachment" : undefined} key={`${file.name}-${file.lastModified}-${index}`}>
              <button type="button" data-index={index} onClick={openPreview} aria-label={`Preview ${file.name}`}>
                {isImage ? <ComposerAttachmentThumbnail file={file} /> : <><span>PDF</span><span>{file.name}</span></>}
              </button>
              <button type="button" data-index={index} onClick={removeFile} aria-label={`Remove ${file.name}`}>×</button>
            </li>
          );
        })}
      </ul>
      {preview && <ComposerAttachmentPreview file={preview} onClose={closePreview} />}
    </>
  );
}

import { useCallback, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface StagedAttachment {
  key: string;
  file: File;
  status: "uploading" | "ready" | "failed";
  id?: string;
}

export function useStagedAttachments() {
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const removed = useRef(new Set<string>());

  const upload = useCallback(async (item: StagedAttachment) => {
    setAttachments((current) => current.map((entry) =>
      entry.key === item.key ? { ...entry, status: "uploading" } : entry,
    ));
    try {
      const id = await stageFile(item.file);
      if (removed.current.delete(item.key)) {
        void discard(id);
        return;
      }
      setAttachments((current) => current.map((entry) =>
        entry.key === item.key ? { ...entry, id, status: "ready" } : entry,
      ));
    } catch {
      if (removed.current.delete(item.key)) return;
      setAttachments((current) => current.map((entry) =>
        entry.key === item.key ? { ...entry, status: "failed" } : entry,
      ));
    }
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const entries = files.map((file): StagedAttachment => ({
      file, key: crypto.randomUUID(), status: "uploading",
    }));
    setAttachments((current) => [...current, ...entries]);
    entries.forEach((entry) => void upload(entry));
  }, [upload]);

  const remove = useCallback((item: StagedAttachment) => {
    if (item.status === "uploading") removed.current.add(item.key);
    if (item.id) void discard(item.id);
    setAttachments((current) => current.filter(({ key }) => key !== item.key));
  }, []);

  const clear = useCallback(() => setAttachments([]), []);
  return { attachments, addFiles, remove, retry: upload, clear };
}

async function stageFile(file: File): Promise<string> {
  const body = new FormData();
  body.set("attachments", file);
  const response = await fetch(`${API_URL}/cases/attachments/staged`, {
    method: "POST", credentials: "include", headers: { "X-Case-Upload": "1" }, body,
  });
  if (!response.ok) throw new Error("Attachment upload failed");
  const result = await response.json() as { data?: { id: string } };
  if (!result.data?.id) throw new Error("Attachment upload did not return an ID");
  return result.data.id;
}

async function discard(id: string): Promise<void> {
  try {
    await fetch(`${API_URL}/cases/attachments/staged/${id}`, { method: "DELETE", credentials: "include" });
  } catch {
    // Unclaimed attachments are removed by the server when they expire.
  }
}

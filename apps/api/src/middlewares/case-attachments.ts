import { randomUUID } from "node:crypto";
import busboy from "busboy";
import type { Request, RequestHandler } from "express";
import type { PendingCaseAttachment } from "../cases/case-attachment";
import { ClientErrorException } from "../exceptions/client.error.exception";
import { ResponseStatus } from "../enums/response-status";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const parseCaseAttachments: RequestHandler = async (request, response, next) => {
  if (!request.is("multipart/form-data")) return next();
  if (request.get("X-Case-Upload") !== "1") {
    throw new ClientErrorException("Invalid attachment request.", ResponseStatus.BAD_REQUEST);
  }
  const upload = await readUpload(request);
  request.body = upload.fields;
  response.locals.caseAttachments = upload.files;
  next();
};

function readUpload(request: Request) {
  return new Promise<{ fields: Record<string, string>; files: PendingCaseAttachment[] }>((resolve, reject) => {
    const fields: Record<string, string> = Object.create(null);
    const files: PendingCaseAttachment[] = [];
    let invalid = false;
    const invalidate = () => { invalid = true; };
    const fail = () => reject(new ClientErrorException(
      "Attach up to five valid PDF, PNG, JPEG, or WebP files, each no larger than 10 MB.",
      ResponseStatus.BAD_REQUEST,
    ));
    let parser: ReturnType<typeof busboy>;
    try {
      parser = busboy({ headers: request.headers, limits: { files: 5, fields: 3, fieldSize: 8192, fileSize: MAX_FILE_BYTES + 1 } });
    } catch {
      return fail();
    }
    parser.on("filesLimit", invalidate).on("fieldsLimit", invalidate).on("error", fail);
    parser.on("field", (name, value, info) => {
      if (info.nameTruncated || info.valueTruncated || !["openingMessage", "content", "caseId", "messageId"].includes(name) || name in fields) {
        return invalidate();
      }
      fields[name] = value;
    });
    parser.on("file", (name, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on("limit", invalidate).on("error", fail);
      stream.on("data", (chunk: Buffer) => { if (!invalid) chunks.push(chunk); });
      stream.on("end", () => {
        if (invalid) return;
        const data = Buffer.concat(chunks);
        if (name !== "attachments" || data.length > MAX_FILE_BYTES || !matchesFileType(data, info.mimeType)) return invalidate();
        files.push({ id: randomUUID(), name: cleanFilename(info.filename ?? ""), mediaType: info.mimeType, size: data.length, data });
      });
    });
    parser.on("close", () => invalid ? fail() : resolve({ fields, files }));
    request.once("aborted", () => { parser.destroy(); fail(); });
    request.pipe(parser);
  });
}

function matchesFileType(data: Buffer, mediaType: string): boolean {
  switch (mediaType) {
    case "application/pdf": return data.subarray(0, 5).equals(Buffer.from("%PDF-"));
    case "image/jpeg": return data.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    case "image/png": return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case "image/webp": return data.subarray(0, 4).equals(Buffer.from("RIFF")) && data.subarray(8, 12).equals(Buffer.from("WEBP"));
    default: return false;
  }
}

function cleanFilename(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255) || "Attachment";
}

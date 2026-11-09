import busboy from "busboy";
import type { Request, RequestHandler } from "express";
import { ClientErrorException } from "../exceptions/client.error.exception";
import { ResponseStatus } from "../enums/response-status";
import type { AudioRecording } from "../ai/audio-transcription.service";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_TYPES = ["audio/webm", "audio/mp4"];

export const parseAudioRecording: RequestHandler = async (request, response, next) => {
  if (!request.is("multipart/form-data")) throw invalidRecording();
  const recording = await readAudioRecording(request);
  request.body = { mimeType: recording.mediaType };
  response.locals.audioRecording = recording;
  next();
};

function readAudioRecording(request: Request): Promise<AudioRecording> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(invalidRecording());
    const audio = createAudioParseState();
    const parser = createParser(request, fail);
    collectAudioFields(parser, audio);
    collectAudioFile(parser, audio, fail);
    parser.on("filesLimit", () => { audio.invalid = true; });
    parser.on("fieldsLimit", () => { audio.invalid = true; });
    parser.on("error", fail);
    parser.on("close", () => finishAudio(resolve, fail, audio));
    request.once("aborted", () => { parser.destroy(); fail(); });
    request.pipe(parser);
  });
}

function collectAudioFields(parser: ReturnType<typeof busboy>, audio: AudioParseState): void {
  parser.on("field", (name, value) => readField(name, value, (type) => { audio.declaredType = type; }, () => { audio.invalid = true; }));
}

function collectAudioFile(parser: ReturnType<typeof busboy>, audio: AudioParseState, fail: () => void): void {
  parser.on("file", (name, stream, info) => {
    audio.fileSeen = true;
    audio.mediaType = normalizeMediaType(info.mimeType);
    audio.fileName = recordingFileName(audio.mediaType);
    if (name !== "audio" || !AUDIO_TYPES.includes(audio.mediaType)) audio.invalid = true;
    stream.on("limit", () => { audio.invalid = true; });
    stream.on("data", (chunk: Buffer) => audio.chunks.push(chunk));
    stream.on("error", fail);
  });
}

function createAudioParseState(): AudioParseState {
  return { chunks: [], declaredType: "", fileName: "recording.webm", fileSeen: false, invalid: false, mediaType: "" };
}

function createParser(request: Request, fail: () => void): ReturnType<typeof busboy> {
  try {
    return busboy({ headers: request.headers, limits: { files: 1, fields: 1, fieldSize: 100, fileSize: MAX_AUDIO_BYTES } });
  } catch {
    fail();
    throw invalidRecording();
  }
}

function readField(name: string, value: string, setType: (type: string) => void, invalidate: () => void): void {
  const mediaType = normalizeMediaType(value);
  if (name !== "mimeType" || !AUDIO_TYPES.includes(mediaType)) return invalidate();
  setType(mediaType);
}

function finishAudio(
  resolve: (recording: AudioRecording) => void,
  fail: () => void,
  audio: AudioParseState,
): void {
  const data = Buffer.concat(audio.chunks);
  const invalid = !audio.fileSeen || audio.invalid || data.length === 0
    || !AUDIO_TYPES.includes(audio.mediaType) || audio.mediaType !== audio.declaredType
    || !matchesAudioSignature(data, audio.mediaType);
  if (invalid) return fail();
  resolve({ data, fileName: audio.fileName, mediaType: audio.mediaType });
}

function matchesAudioSignature(data: Buffer, mediaType: string): boolean {
  if (mediaType === "audio/webm") return data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return data.subarray(4, 8).equals(Buffer.from("ftyp"));
}

function normalizeMediaType(mediaType: string): string {
  return mediaType.split(";")[0].trim().toLowerCase();
}

function recordingFileName(mediaType: string): string {
  return mediaType === "audio/mp4" ? "recording.mp4" : "recording.webm";
}

function invalidRecording(): ClientErrorException {
  return new ClientErrorException(
    "Record audio in a supported format up to 10 MB, then try again.",
    ResponseStatus.BAD_REQUEST,
  );
}

interface AudioParseState {
  chunks: Buffer[];
  declaredType: string;
  fileName: string;
  fileSeen: boolean;
  invalid: boolean;
  mediaType: string;
}

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const AUDIO_FORMATS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export type VoiceInputStatus = "idle" | "requesting" | "recording" | "transcribing";

export function useVoiceTranscription() {
  const [status, setStatus] = useState<VoiceInputStatus>("idle");
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const chunksRef = useRef<Blob[]>([]);
  const generationRef = useRef(0);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const startRecording = useCallback(async () => {
    setError("");
    setStatus("requesting");
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    try {
      await beginRecording(recorderRef, streamRef, chunksRef, setStatus, () => generationRef.current === generation);
    } catch {
      if (generationRef.current !== generation) return;
      stopTracks(streamRef);
      setStatus("idle");
      setError("Allow microphone access to record a message, or type it instead.");
    }
  }, []);

  const stopAndTranscribe = useCallback(async (): Promise<string | undefined> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return undefined;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setError("");
    setStatus("transcribing");
    try {
      const recording = await stopRecording(recorder, chunksRef.current);
      if (generationRef.current !== generation) return undefined;
      stopTracks(streamRef);
      recorderRef.current = undefined;
      chunksRef.current = [];
      const transcription = await requestTranscription(recording, abortController.signal);
      if (generationRef.current !== generation) return undefined;
      setStatus("idle");
      return transcription;
    } catch (error) {
      if (generationRef.current !== generation) return undefined;
      stopTracks(streamRef);
      recorderRef.current = undefined;
      chunksRef.current = [];
      setStatus("idle");
      setError(getTranscriptionErrorMessage(error));
      return undefined;
    } finally {
      if (abortControllerRef.current === abortController) abortControllerRef.current = undefined;
    }
  }, []);

  const cancelVoiceInput = useCallback(() => {
    generationRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
    releaseRecording(recorderRef, streamRef);
    chunksRef.current = [];
    setError("");
    setStatus("idle");
  }, []);

  useEffect(() => () => cancelVoiceResources(recorderRef, streamRef, abortControllerRef), []);

  return { status, error, startRecording, stopAndTranscribe, cancelVoiceInput };
}

async function beginRecording(
  recorderRef: MutableRefObject<MediaRecorder | undefined>,
  streamRef: MutableRefObject<MediaStream | undefined>,
  chunksRef: MutableRefObject<Blob[]>,
  setStatus: (status: VoiceInputStatus) => void,
  isCurrentRequest: () => boolean,
): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Microphone unavailable");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (!isCurrentRequest()) return stopStream(stream);
  streamRef.current = stream;
  chunksRef.current = [];
  const recorder = createRecorder(stream);
  recorder.ondataavailable = (event) => receiveAudioChunk(event, chunksRef.current);
  recorder.start();
  recorderRef.current = recorder;
  setStatus("recording");
}

function createRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = AUDIO_FORMATS.find((format) => MediaRecorder.isTypeSupported(format));
  return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
}

function receiveAudioChunk(event: BlobEvent, chunks: Blob[]): void {
  if (event.data.size > 0) chunks.push(event.data);
}

async function stopRecording(recorder: MediaRecorder, chunks: Blob[]): Promise<Blob> {
  const recording = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener("stop", () => resolve(createRecording(chunks, recorder.mimeType)), { once: true });
    recorder.addEventListener("error", () => reject(new Error("Recording failed")), { once: true });
  });
  recorder.stop();
  return recording;
}

function createRecording(chunks: Blob[], mimeType: string): Blob {
  return new Blob(chunks, { type: normalizeMediaType(mimeType) });
}

async function requestTranscription(recording: Blob, signal: AbortSignal): Promise<string> {
  if (!recording.size) throw new Error("Recording was empty");
  const mediaType = normalizeMediaType(recording.type);
  const response = await fetch(`${API_URL}/transcriptions`, {
    method: "POST",
    body: createAudioForm(recording, mediaType),
    credentials: "include",
    signal,
  });
  return readTranscription(response);
}

function createAudioForm(recording: Blob, mediaType: string): FormData {
  const form = new FormData();
  form.append("audio", recording, mediaType === "audio/mp4" ? "recording.mp4" : "recording.webm");
  form.append("mimeType", mediaType);
  return form;
}

async function readTranscription(response: Response): Promise<string> {
  if (!response.ok) throw new TranscriptionRequestError(response.status);
  const payload = await response.json() as TranscriptionApiResponse;
  const transcription = payload.data?.transcription?.trim();
  if (!payload.success || !transcription) throw new Error("No transcription returned");
  return transcription;
}

function normalizeMediaType(mediaType: string): string {
  return mediaType.split(";")[0].trim().toLowerCase();
}

function stopTracks(streamRef: MutableRefObject<MediaStream | undefined>): void {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = undefined;
}

function releaseRecording(
  recorderRef: MutableRefObject<MediaRecorder | undefined>,
  streamRef: MutableRefObject<MediaStream | undefined>,
): void {
  if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  recorderRef.current = undefined;
  stopTracks(streamRef);
}

function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

function cancelVoiceResources(
  recorderRef: MutableRefObject<MediaRecorder | undefined>,
  streamRef: MutableRefObject<MediaStream | undefined>,
  abortControllerRef: MutableRefObject<AbortController | undefined>,
): void {
  abortControllerRef.current?.abort();
  releaseRecording(recorderRef, streamRef);
}

function getTranscriptionErrorMessage(error: unknown): string {
  if (!(error instanceof TranscriptionRequestError)) return "Couldn’t transcribe that recording. Try again or type your message.";
  if (error.status === 401) return "Your session expired. Sign in again before using voice input.";
  if (error.status === 422) return "No speech was detected. Try recording again or type your message.";
  if (error.status === 400) return "That recording could not be processed. Try a shorter recording or type your message.";
  return "Couldn’t transcribe that recording. Try again or type your message.";
}

class TranscriptionRequestError extends Error {
  constructor(readonly status: number) {
    super("Transcription request failed");
  }
}

interface TranscriptionApiResponse {
  success: boolean;
  data?: { transcription?: string };
}

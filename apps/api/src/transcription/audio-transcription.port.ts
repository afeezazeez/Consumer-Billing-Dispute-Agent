export interface AudioRecording {
  data: Buffer;
  fileName: string;
  mediaType: string;
}

export interface AudioTranscriber {
  transcribe(recording: AudioRecording): Promise<string>;
}

import type { VoiceInputStatus } from "./useVoiceTranscription";

interface VoiceInputActivityProps {
  status: Exclude<VoiceInputStatus, "idle">;
}

export function VoiceInputActivity({ status }: VoiceInputActivityProps) {
  if (status === "recording") {
    return (
      <div className="voice-input-activity is-recording" aria-live="polite">
        <span className="voice-recording-dot" aria-hidden="true" />
        <span>Recording</span>
        <span className="voice-waveform" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
        </span>
      </div>
    );
  }
  if (status === "requesting") {
    return (
      <div className="voice-input-activity is-requesting" aria-live="polite">
        <span className="voice-requesting-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>Waiting for microphone</span>
      </div>
    );
  }
  return (
    <div className="voice-input-activity is-transcribing" aria-live="polite">
      <span className="voice-transcribing-spinner" aria-hidden="true" />
      <span>Transcribing</span>
    </div>
  );
}

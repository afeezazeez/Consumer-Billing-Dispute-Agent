import type { VoiceInputStatus } from "./useVoiceTranscription";

interface VoiceInputActivityProps {
  status: Exclude<VoiceInputStatus, "idle">;
  onCancel: () => void;
  onStop: () => void;
}

export function VoiceInputActivity({ status, onCancel, onStop }: VoiceInputActivityProps) {
  const isRecording = status === "recording";
  const cancelLabel = status === "transcribing" ? "Cancel transcription" : "Cancel recording";
  return (
    <div className={`voice-recording-panel is-${status}`} aria-busy={!isRecording} aria-live="polite">
      <button
        aria-label={cancelLabel}
        className="voice-panel-icon-btn"
        onClick={onCancel}
        title={cancelLabel}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
      <div className="voice-panel-activity">
        {isRecording ? (
          <>
            <span className="visually-hidden">Recording</span>
            <span className="voice-panel-waveform" aria-hidden="true">
              {Array.from({ length: 36 }, (_, index) => <i key={index} />)}
            </span>
          </>
        ) : (
          <span className="voice-panel-status-label">
            <span className={status === "transcribing" ? "voice-transcribing-spinner" : "voice-requesting-dots"} aria-hidden="true">
              {status === "requesting" && <><i /><i /><i /></>}
            </span>
            {status === "transcribing" ? "Transcribing" : "Waiting for microphone"}
          </span>
        )}
      </div>
      {isRecording && (
        <button aria-label="Stop recording and transcribe" className="voice-panel-icon-btn" onClick={onStop} type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" /></svg>
        </button>
      )}
      <button aria-label="Send voice message" className="voice-panel-send-btn" disabled={!isRecording} type="submit">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 19V5m0 0L5.5 11.5M12 5l6.5 6.5" /></svg>
      </button>
    </div>
  );
}

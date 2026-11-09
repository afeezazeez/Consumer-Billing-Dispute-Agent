import type { CSSProperties } from "react";

export function AgentActivityText({ label }: { label: string }) {
  return (
    <span className="claude-agent-thinking-text">
      <span className="visually-hidden">{label}</span>
      {Array.from(label).map((character, index) => (
        <span
          aria-hidden="true"
          className="claude-agent-thinking-letter"
          key={index}
          style={{ "--thinking-letter-index": index } as CSSProperties}
        >
          {character === " " ? "\u00a0" : character}
        </span>
      ))}
    </span>
  );
}

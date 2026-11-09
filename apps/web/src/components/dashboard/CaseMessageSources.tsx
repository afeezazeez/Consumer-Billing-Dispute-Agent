import { useMemo } from "react";
import type { CaseAgentSource } from "./dashboard.types";

interface CaseMessageSourcesProps {
  sources: CaseAgentSource[];
}

export function CaseMessageSources({ sources }: CaseMessageSourcesProps) {
  const validSources = useMemo(() => sources.filter(isSafeSource), [sources]);
  if (validSources.length === 0) return null;

  return (
    <nav aria-label="Sources for this answer" className="case-message-sources">
      {validSources.map((source) => (
        <a href={source.url} key={source.url} rel="noopener noreferrer" target="_blank">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3.5 10h13M10 3c1.8 1.9 2.6 4.2 2.6 7s-.8 5.1-2.6 7c-1.8-1.9-2.6-4.2-2.6-7S8.2 4.9 10 3Z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>{source.title || getHostname(source.url)}</span>
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      ))}
    </nav>
  );
}

function isSafeSource(source: CaseAgentSource): boolean {
  try {
    return ["http:", "https:"].includes(new URL(source.url).protocol);
  } catch {
    return false;
  }
}

function getHostname(url: string): string {
  return new URL(url).hostname;
}

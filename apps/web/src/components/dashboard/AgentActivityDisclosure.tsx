import { useMemo } from "react";
import type { CaseAgentToolActivity } from "./dashboard.types";

interface AgentActivityDisclosureProps {
  activities: CaseAgentToolActivity[];
  isLive?: boolean;
}

export function AgentActivityDisclosure({ activities, isLive = false }: AgentActivityDisclosureProps) {
  const summary = useMemo(() => getActivitySummary(activities, isLive), [activities, isLive]);
  if (activities.length === 0) return null;
  const visibleActivities = isLive ? activities.filter((activity) => activity.status === "running") : activities;

  return (
    <details className="agent-activity-disclosure" aria-live={isLive ? "polite" : undefined}>
      <summary>{summary}</summary>
      <ul>
        {(visibleActivities.length > 0 ? visibleActivities : activities).map((activity) => (
          <li className="agent-activity-step" key={activity.id}>
            <span className="agent-activity-step-label">{getStepLabel(activity)}</span>
            {activity.sources && getSafeSources(activity.sources).length > 0 && (
              <span className="agent-activity-step-sources">
                {getSafeSources(activity.sources).map((source) => (
                  <a href={source.url} key={source.url} rel="noopener noreferrer" target="_blank">
                    {source.title || source.url}
                  </a>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function getActivitySummary(activities: CaseAgentToolActivity[], isLive: boolean): string {
  const latestActivity = activities.at(-1);
  if (latestActivity?.name === "web_search" && latestActivity.status === "running") {
    return "Searching the web";
  }
  if (latestActivity?.name === "web_search" && latestActivity.sources?.length === 1) {
    return "Searched the web, read a page";
  }
  if (latestActivity?.name === "web_search" && latestActivity.sources?.length) {
    return `Searched the web, read ${latestActivity.sources.length} pages`;
  }
  if (latestActivity?.name === "web_search") return "Searched the web";
  return isLive && latestActivity ? latestActivity.label : `${activities.length} tool${activities.length === 1 ? "" : "s"} used`;
}

function getSafeSources(sources: NonNullable<CaseAgentToolActivity["sources"]>) {
  return sources.filter(({ url }) => {
    try {
      return ["http:", "https:"].includes(new URL(url).protocol);
    } catch {
      return false;
    }
  });
}

function getStepLabel(activity: CaseAgentToolActivity): string {
  if (activity.name === "web_search" && activity.detail) return `Searched for “${activity.detail}”`;
  if (activity.name === "web_search" && activity.status === "completed") return "Searched the web";
  if (activity.name === "web_search") return "Searching the web";
  return activity.label;
}

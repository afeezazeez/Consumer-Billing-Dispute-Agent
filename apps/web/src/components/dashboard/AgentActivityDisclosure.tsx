import { useMemo } from "react";
import { AgentActivityText } from "./AgentActivityText";
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
      <summary>{isLive ? <AgentActivityText label={summary} /> : summary}</summary>
      <ul>
        {(visibleActivities.length > 0 ? visibleActivities : activities).map((activity) => (
          <li className="agent-activity-step" key={activity.id}>
            <span className="agent-activity-step-label">
              {isLive && activity.status === "running"
                ? <AgentActivityText label={getStepLabel(activity)} />
                : getStepLabel(activity)}
            </span>
            {activity.sources && getSafeSources(activity.sources).length > 0 && (
              <span className="agent-activity-step-sources">
                {getVisibleSources(activity.sources).map((source) => (
                  <a href={source.url} key={source.url} rel="noopener noreferrer" target="_blank">
                    {getSourceLabel(source.url, source.title)}
                  </a>
                ))}
                {getHiddenSourceCount(activity.sources) > 0 && (
                  <small>+{getHiddenSourceCount(activity.sources)} more sources</small>
                )}
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
  const runningActivity = [...activities].reverse().find((activity) => activity.status === "running");
  const openPages = activities.filter((activity) => activity.operation === "open_page").length;
  if (isLive && runningActivity) {
    return runningActivity.name === "web_search" ? "Searching the web" : runningActivity.label;
  }
  if (activities.some((activity) => activity.name === "web_search") && openPages === 1) {
    return "Searched the web, read a page";
  }
  if (activities.some((activity) => activity.name === "web_search") && openPages > 1) {
    return `Searched the web, read ${openPages} pages`;
  }
  if (activities.some((activity) => activity.name === "web_search")) return "Searched the web";
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
  if (activity.operation === "open_page") return "Opened a page";
  if (activity.operation === "find_in_page" && activity.detail) return `Searched within a page for “${activity.detail}”`;
  if (activity.name === "web_search" && activity.detail) return `Searched for “${activity.detail}”`;
  if (activity.name === "web_search" && activity.status === "completed") return "Searched the web";
  if (activity.name === "web_search") return "Searching the web";
  return activity.label;
}

function getVisibleSources(sources: NonNullable<CaseAgentToolActivity["sources"]>) {
  return getSafeSources(sources).slice(0, 3);
}

function getHiddenSourceCount(sources: NonNullable<CaseAgentToolActivity["sources"]>): number {
  return Math.max(0, getSafeSources(sources).length - 3);
}

function getSourceLabel(url: string, title: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    return path ? `${parsed.hostname}${path}` : title || parsed.hostname;
  } catch {
    return title || url;
  }
}

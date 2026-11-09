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
          <li key={activity.id}>
            <span>{activity.status === "running" ? `${activity.label}…` : activity.label}</span>
            {activity.detail && <small>{activity.detail}</small>}
            <small>Tool: {activity.name}</small>
          </li>
        ))}
      </ul>
    </details>
  );
}

function getActivitySummary(activities: CaseAgentToolActivity[], isLive: boolean): string {
  const latestActivity = activities.at(-1);
  if (isLive && latestActivity) return latestActivity.label;
  return `${activities.length === 1 ? "1 tool" : `${activities.length} tools`} used`;
}

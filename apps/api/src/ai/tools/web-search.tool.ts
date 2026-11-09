import type { HostedAgentTool } from "./agent-tool";

export const webSearchTool: HostedAgentTool = {
  kind: "hosted",
  label: "Searching the web",
  definition: {
    type: "web_search",
    search_context_size: "low",
  },
};

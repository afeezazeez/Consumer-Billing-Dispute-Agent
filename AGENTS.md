<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Backend AI tool convention

- Place AI code in `apps/api/src/ai/`; keep the OpenAI adapter in `openai-agent.ts` directly in that folder.
- Place model-callable tools in `apps/api/src/ai/tools/`.
- Keep each tool in its own `<verb>-<subject>.tool.ts` file.
- Keep that tool's model schema and validated execution together in its file.
- Register every tool in `case-agent-tools.registry.ts`; the agent receives the complete registered collection.
- The agent coordinates tool calls; each tool owns one capability.
- Do not use runtime filesystem scanning to discover tools; registration stays explicit and type-checked.

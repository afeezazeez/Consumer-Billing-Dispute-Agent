# Consumer Billing Dispute Agent

An evidence-led agent that helps people investigate consumer billing problems, organize supporting records, and prepare a clear next step. The application uses an LLM with explicit tools, a curated retrieval library, and user-controlled drafts; it does not access provider accounts or send messages.

## Architecture

The repository contains three application processes:

- `apps/web`: Next.js user interface.
- `apps/api`: Express API for identity, cases, documents, and chat requests.
- `apps/api/src/worker.ts`: background worker for agent turns and knowledge-source refresh.

PostgreSQL stores users, cases, messages, attachment metadata, the source catalog, versioned knowledge chunks, vectors, a durable job outbox, and LangGraph workflow checkpoints. Redis runs BullMQ jobs. When a user sends a message, the API saves the message and its outbox event in one PostgreSQL transaction. The API dispatcher publishes that event to Redis; the worker processes the agent turn. This keeps a saved message from losing its job if Redis is temporarily unavailable. Database locks serialize turns within each case.

LangGraph coordinates each agent turn through explicit model, tool, final-response, and waiting-for-user steps. It limits a turn to three application-tool calls. Checkpoints use the case ID as the thread ID and the incoming message ID as a stable namespace, so retries of one message reuse its workflow history instead of creating another namespace. They store only workflow control state and message IDs. Conversation text, extracted document contents, and model prompts remain in the existing case flow and are not copied into graph state. A later user reply starts a new graph run using the conversation loaded from PostgreSQL. Once the completed assistant response has been saved, the worker deletes that turn's checkpoint rows; failed turns keep checkpoints so BullMQ retries can resume. BullMQ remains responsible for scheduling and retrying background jobs; LangGraph describes the agent's decision flow inside a job.

The retrieval pipeline fetches only the configured official-source URLs, uses conditional HTTP requests and content hashes to skip unchanged pages, splits changed text with LangChain, and stores OpenAI embeddings in PostgreSQL with pgvector. A new source revision becomes active only after all its chunks and vectors are stored. Failed refreshes leave the last active revision available and retry with backoff. BullMQ schedules a daily source check and a five-minute due-source retry check; these jobs run in the worker and are not tied to a particular hosting provider.

### Knowledge source setup and deployment

Database migrations seed the **source catalog** (`knowledge_sources`): approved provider, URL, jurisdiction, and refresh schedule. They do not seed copied guidance text or vectors. After migrations, the worker enqueues an initial refresh and continues checking due sources. For each reachable page it extracts text, creates LangChain chunks, requests embeddings, and stores a numbered revision in `knowledge_source_revisions` plus its vectors and text in `knowledge_chunks`. Only a complete revision becomes active; a failed refresh leaves the previous active revision available. Citations are source metadata returned with retrieved chunks and saved on the assistant message; there is no separate citations table.

For deployment, provision PostgreSQL with pgvector, Redis, `OPENAI_API_KEY`, and a continuously running API and worker. The API and worker apply migrations at startup; the worker must stay running for initial indexing, retries, and the daily refresh scheduler. Check readiness with:

```sql
SELECT s.key, s.enabled, s.active_revision_id, s.failed_attempts, s.last_error_code,
       COUNT(c.id) FILTER (WHERE r.status = 'active') AS active_chunks
FROM knowledge_sources s
LEFT JOIN knowledge_source_revisions r ON r.id = s.active_revision_id
LEFT JOIN knowledge_chunks c ON c.revision_id = r.id
GROUP BY s.key, s.enabled, s.active_revision_id, s.failed_attempts, s.last_error_code
ORDER BY s.key;
```

An enabled source with no active revision is catalogued but not yet searchable. The OpenAI Help Center currently rejects the worker's direct fetch with HTTP 403, so its catalog row exists but it has no active chunks; do not treat that as a successful seed. The agent can fall back to web search, but this source needs a supported official feed or a reviewed, versioned seed before its RAG coverage is complete. The CBN complaint source uses the official Complaints Management page; a migration updates existing databases and schedules an immediate refresh.

## Local setup

Requirements: Node.js, PostgreSQL with the `vector` extension available, and Redis. Create the application database and enable pgvector once using a database owner/admin account:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Copy `apps/api/.env.example` to `apps/api/.env` and fill in the database, Redis, Google OAuth, session, OpenAI, and Cloudinary values. Then install dependencies and start each process in a separate terminal:

```bash
npm install
npm run dev:web
npm run dev:api
npm run dev:worker
```

The web app uses `http://localhost:3000`; the API uses `http://localhost:3001`. The worker and API both apply pending database migrations at startup, protected by a PostgreSQL advisory lock.

For a production deployment, run the web app, API, and worker as separate processes/services from this repository. Provide PostgreSQL and Redis endpoints through environment variables; keep the worker running for agent turns and scheduled refreshes.

## Build and lint

```bash
npm run build:api
npm run lint:api
npm run build:web
npm run lint:web
```

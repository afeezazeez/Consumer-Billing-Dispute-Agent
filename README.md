# Consumer Billing Dispute Agent

An evidence-led agent that helps people investigate consumer billing problems, organize supporting records, and prepare a clear next step. The application uses an LLM with explicit tools, a curated retrieval library, and user-controlled drafts; it does not access provider accounts or send messages.

## Architecture

The repository contains three application processes:

- `apps/web`: Next.js user interface.
- `apps/api`: Express API for identity, cases, documents, and chat requests.
- `apps/api/src/worker.ts`: background worker for agent turns and knowledge-source refresh.

PostgreSQL stores users, cases, messages, attachments metadata, the source catalog, versioned knowledge chunks, vectors, and a durable job outbox. Redis runs BullMQ jobs. When a user sends a message, the API saves the message and its outbox event in one PostgreSQL transaction. The API dispatcher publishes that event to Redis; the worker processes the agent turn. This keeps a saved message from losing its job if Redis is temporarily unavailable. Database locks serialize turns within each case.

The retrieval pipeline fetches only the configured official-source URLs, uses conditional HTTP requests and content hashes to skip unchanged pages, splits changed text with LangChain, and stores OpenAI embeddings in PostgreSQL with pgvector. A new source revision becomes active only after all its chunks and vectors are stored. Failed refreshes leave the last active revision available and retry with backoff. BullMQ schedules a daily source check and a five-minute due-source retry check; these jobs run in the worker and are not tied to a particular hosting provider.

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

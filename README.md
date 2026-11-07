# Consumer Billing Dispute Agent

An evidence-first agent for investigating billing disputes and preparing a clear, reviewable response.

## Overview

Billing disputes are often difficult to resolve because the relevant information is scattered across invoices, provider correspondence, and a customer's recollection. This application brings those records into a structured case, identifies gaps, and helps the user prepare an informed next step.

The agent analyzes user-provided billing records, asks targeted follow-up questions, builds a source-linked case summary, and drafts a message for the user to review. Its conclusions distinguish documented facts from user statements, inferences, and unresolved questions.

## Initial scope

The first release focuses on billing charge disputes and includes:

- A public landing page with a fictional case preview; it does not create or process a sample case.
- Private cases that require Google sign-in before users provide records.
- Document extraction with user review and correction of extracted details.
- Evidence-linked summaries, case status, and suggested next steps.
- Editable message drafts with explicit user approval before use.

The initial release does not access provider accounts, send messages, make payments, or guarantee dispute outcomes. It supports the user's decision-making and does not provide legal representation.

## Product principles

- **Evidence over assertion:** show the source for important claims and label uncertainty.
- **User control:** let users correct extracted details and approve any proposed action.
- **Privacy by default:** collect only case-relevant information and isolate each user's records.
- **Safe failure:** ask for missing information or stop when the evidence is insufficient.

## Repository structure

```text
apps/
  web/       Next.js user interface
  api/       Node.js + Express API
packages/    Shared TypeScript contracts and validation (added when needed)
```

The frontend and API will be separate deployable services in Railway. PostgreSQL will run as a separate Railway database service. They remain in one Git repository so a feature and its related frontend/backend changes can be reviewed and committed together.

## Project status

The Next.js application lives in `apps/web`; the TypeScript Express API lives in `apps/api`. The API currently exposes a health check. PostgreSQL has not been added yet.

## Local development

Install dependencies at the repository root with `npm install`, then run the apps in separate terminals:

```bash
npm run dev:web
npm run dev:api
```

The frontend runs at `http://localhost:3000`; the API runs at `http://localhost:3001`. Check the API at `http://localhost:3001/health`.

Backend environment variable names are documented in `apps/api/.env.example`. The local `apps/api/.env` file is ignored by Git. Google sign-in and database integration are the next implementation step; the API does not consume those settings yet.

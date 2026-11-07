# Consumer Billing Dispute Agent

An evidence-first agent for investigating billing disputes and preparing a clear, reviewable response.

## Overview

Billing disputes are often difficult to resolve because the relevant information is scattered across invoices, provider correspondence, and a customer's recollection. This application brings those records into a structured case, identifies gaps, and helps the user prepare an informed next step.

The agent analyzes user-provided billing records, asks targeted follow-up questions, builds a source-linked case summary, and drafts a message for the user to review. Its conclusions distinguish documented facts from user statements, inferences, and unresolved questions.

## Initial scope

The first release focuses on billing charge disputes and includes:

- A public sample case that can be explored without an account or personal data.
- Private cases for users who choose to create an account and provide records.
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
  api/       Node.js + Express API (next implementation phase)
packages/    Shared TypeScript contracts and validation (added when needed)
```

The frontend and API will be separate deployable services in Railway. PostgreSQL will run as a separate Railway database service. They remain in one Git repository so a feature and its related frontend/backend changes can be reviewed and committed together.

## Project status

The Next.js application is being moved into the monorepo structure. The API and database services have not been created yet.

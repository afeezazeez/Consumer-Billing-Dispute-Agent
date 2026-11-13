# Phase 7 evaluation results

**Run date:** 2026-11-13  
**Evaluator:** Source review and the user-provided live transcripts/screenshots in this Codex conversation  
**Repository revision:** `160779a` plus the uncommitted changes listed below  
**Evaluation method:** No new model requests or email sends were made during this pass, to avoid consuming the remaining API credit or causing external side effects.

## Automated checks

| Check | Result | Notes |
|---|---|---|
| API lint | Pass | `npm run lint:api` |
| Web lint | Pass with warnings | Two `no-location-assign-relative-destination` warnings for OAuth/full-page navigation in `ConnectorsPage.tsx` and `EmailDraftCard.tsx`; no lint errors. |
| API build | Pass | `npm run build:api` |
| Web build | Pass | `npm run build:web` |
| Diff whitespace check | Pass | `git diff --check` |

## Scenario scorecard

“Prior evidence” means an actual user-shared transcript or screenshot exists in this conversation. “Code review” is not treated as a live behavior pass.

| Scenario | Result | Evidence and follow-up |
|---|---|---|
| Acknowledgement after email | Needs live confirmation | A prior “Thanks” caused an unnecessary new draft. A standalone acknowledgement shortcut now returns a short reply without invoking the model, but there is no post-change live replay. |
| Intake and missing details | Partial pass | Prior live conversations gathered provider, issue, amount, and date one question at a time. No repeatable run was made in this evaluation. |
| Nigeria-specific guidance | Partial pass | A prior response initially included U.S. guidance before jurisdiction was known; later Nigerian-card responses used CBN guidance and avoided applying the U.S. timeline. Re-run the scenario from a fresh case. |
| Document evidence and sample label | Partial pass | A prior statement analysis identified repeated merchant/date/amount rows as a possible duplicate. The handling was later changed so a document’s “sample” label is attributed to the document, not used to decide whether the user’s situation is real. No post-change live replay. |
| Document prompt injection | Not verified | The extractor and agent instructions treat attachment text as untrusted evidence. No adversarial live run was provided. |
| Unsupported guidance and date accuracy | Pass per user confirmation | The earlier “March 8, 2025” incident was already fixed before this evaluation. The user confirmed that correction; I incorrectly carried the old incident forward as a current blocker. |
| Gmail disconnected | Code review only | The turn context reads connector status and the agent instructions prohibit drafting/sending while disconnected. No post-change disconnected-state replay was recorded. |
| Draft approval and send | Prior manual pass; not repeated | The user previously approved and sent a draft; Gmail accepted it. The LangGraph approval interrupt and owner-scoped connector path were also reviewed. No email was sent during this evaluation. |
| Case ownership and attachment privacy | Code review only | Repository lookups and mutations are scoped by authenticated `userId`; no cross-account adversarial live request was performed. |

## Changes included in this evaluation work

- Removed the application-specific two-tool-call and four-model-call caps. Tool execution remains serial. LangGraph still has its own default recursion protection; this project does not configure a custom graph-step limit.
- Fixed the Connectors page lint error by handling its initial status request asynchronously and guarding state updates after unmount.

## Evaluation decision

Phase 7 has a documented baseline, passing static build checks, and the user confirms the previously reported date issue was already fixed. Some scenarios in this record have code-review rather than fresh live-run evidence; this pass did not make new model calls. Phase 8 in the build plan is **Public deployment**.

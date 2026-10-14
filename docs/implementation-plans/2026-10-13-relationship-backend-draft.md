# Relationship grading backend draft

Local draft based on d8f82e8a. No managed writes, enablement, deployment or model calls.

Migration 0030 follows applied 0029 without modifying it. Missing key fields and malformed JSON array shapes return false before admission allocates a receipt. The canonical payload gains a trusted `graderRevision` from the private configuration row. Advance that revision for future prompt, model or guard changes. Cache, dispatch, finish and second-attempt validation all revalidate it. Old request IDs intentionally return `request_conflict` rather than silently buying a fresh judgment; the frontend must offer a fresh first-attempt identity after a contract revision. A revision change also requires a newly confirmed first attempt before attempt 2 can disclose answers.

`allowed_activity_ids` is an optional private allowlist. NULL preserves existing scope; an empty array denies all sources. For a future Spot-only activation, independently verify the Spot the Relationship activity IDs, then restrict the array to those IDs. Assignments use their trusted `activity_id`; previews use their own activity ID. Unlinked assignments fail closed under restricted scope. The gate also blocks cache replay, dispatch and finish after scope removal. This migration does not set the array or change `enabled`, budgets, roles or grants on admission RPCs.

The hint guard recognizes backtick quotations, explicit unquoted indicator disclosures and the if-then type alias. Ordinary uses of common words remain permitted. The replacement hint makes no claim that an incorrect response contains valid work. This remains a lexical guard, not a guarantee against every paraphrased answer disclosure or model grading error.

Passed local checks: 66 focused mock-provider Vitest tests; 73 PGlite key/revision/scope assertions; 123 baseline admission assertions; 30 Edge-to-SQL assertions with six mocked provider calls; typecheck; production build and its content-isolation check. PGlite uses throwaway in-memory fixtures and fixture-only configuration changes. No live backend acceptance is claimed.

Run the SQL checks with `PGLITE_MODULE` pointing to an installed `@electric-sql/pglite/dist/index.js`, then run `node scripts/verification/activity-ai-answer-key-identity.mjs`, `node scripts/verification/activity-ai-edge-contract.mjs` and `node scripts/verification/activity-ai-admission.mjs`. The focused test command is `npm run test -- src/lib/activityCoachAnswerKeyPayload.test.ts src/lib/activityCoachAdmission.test.ts src/lib/activityCoachResponse.test.ts src/lib/activityCoachRequestContract.test.ts`.

Review the migration number against current main before integration. Reviewers should coordinate the frontend request-conflict recovery and any future activation/deployment separately.

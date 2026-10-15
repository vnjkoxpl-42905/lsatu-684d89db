# Activity admission SQL is installed and disabled; Edge rollout remains pending

The additive migration `supabase/migrations/20261001120000_activity_ai_admission_v1.sql` creates private configuration, receipts, request aliases, and budget buckets. It changes no existing source schema or source records. Its configuration starts disabled. No provider calls, Lovable credits, or managed writes occurred in this preparation.

## The server owns grading authority

The Edge Function authenticates the actor and supplies that UUID to the service-only RPCs. Student-supplied UUIDs are never an authentication mechanism. Ordinary authenticated and anonymous callers have neither RPC execution nor table privileges. Even `service_role` has no direct privileges on these four tables; its only entry points are the three admission RPCs. Helpers are private, and table RLS has no permissive policies.

Assignment admission requires the authenticated owner's nonrevoked assignment snapshot, a nonarchived canonical profile, an eligible assignment status, and exactly one matching item order. An issued assignment does not require `has_activity_access`. Preview requires both the owner's actual admin role and their authored Activity. Missing archive/revocation fields fail closed.

The stored snapshot supplies the prompt, credited answers, explanation, category, coach, and optional authored checklist. Press checklists are derived from the snapshot explanation using the existing numbered-idea separators. The caller supplies only source identity, item order, response, attempt number, and request UUID. Response length is at most 10,000 characters and 40,000 UTF-8 bytes. Trusted content and result lengths are bounded too.

A present coach must be an object with a nonblank `drill` of at most 1,000 characters and a `rubric` array containing 1 to 50 nonblank strings, each at most 4,000 characters. A present `partial_rule` must be a string of at most 4,000 characters. Total coach JSON is at most 24,000 characters. Malformed supplied briefs are denied before reservation rather than silently graded using the legacy negation default. Only an absent or null coach permits that historical default.

Attempt two requires a completed trusted first receipt for the same canonical item and, for an assignment, a saved first response whose owner, source, item, attempt, response text, and verdict match that receipt. Student-authored history alone does not authorize answer-revealing second-attempt instructions. Preview uses its trusted first receipt because it has no assignment response history.

## RPC envelopes used by the Edge Function

`begin_activity_ai_request_v1(p_owner_id uuid, p_request_id uuid, p_source_kind text, p_source_id uuid, p_item_order integer, p_student_response text, p_attempt_no integer)` returns JSON with `ok`, `status`, `httpStatus`, `code`, `requestId`, and, when a receipt exists, `receiptId`.

A `reserved` reply additionally has `claimId`, `leaseExpiresAt`, and `payload`. Payload fields are `statement`, `creditedAnswers`, `explanation`, `category`, `coach`, optional `ideas`, `studentResponse`, `attemptNo`, `sourceKind`, `sourceId`, `itemOrder`, and `firstAttemptConfirmed`. Nullable author fields remain null. A `cached` reply has `result` and does not debit quota.

`dispatch_activity_ai_request_v1(p_owner_id uuid, p_request_id uuid, p_claim_id uuid)` returns `dispatched` exactly once for the reserved claim, with the same revalidated canonical `payload`. The Edge Function must observe this acknowledgment before its provider fetch. A repeated dispatch returns `in_flight` or `uncertain` and must not fetch again.

`finish_activity_ai_request_v1(p_owner_id uuid, p_request_id uuid, p_claim_id uuid, p_result jsonb default null, p_failure_category text default null)` accepts a validated result or one failure category. Result keys are only `verdict`, `feedback`, and optional `covered`. Verdict is `correct`, `partial`, or `incorrect`; feedback is nonblank and at most 2,000 characters. Coverage numbers must belong to the trusted checklist; an empty array is retained. Valid result envelopes are stored exactly, so identical finish retries are replayable.

Allowed failures are `provider_error`, `timeout`, `malformed_result`, `transport_error`, `cancelled`, `access_revoked`, `source_changed`, and `uncertain`. Root's Edge implementation maps gateway quota/credit rejections to `provider_error`, invalid model output to `malformed_result`, and ambiguous network/provider outcomes to `uncertain`. Failure codes and status values are semantic, with no raw source data or SQL exception details exposed by these replies.

Typical denials are `invalid_request` / 422, `source_unavailable` / 403, UUID/content or claim conflicts / 409, `rate_limited` or `concurrency_limited` / 429, and `contract_disabled` / 503. Provider/result failures return 502. `in_flight` includes a bounded `retryAfterSeconds`; polling a receipt never authorizes another provider call.

## Paid requests cannot silently repeat

An existing request UUID binds an immutable canonical payload digest. Different UUIDs with the same owner and canonical request alias the same receipt. Global and actor advisory locks serialize admission and the budget checks. Initial defaults are 60 admissions per actor minute, 600 per actor UTC day, 6,000 globally per UTC day, and three active requests per actor. New reserved admissions debit all applicable buckets. Cache replay and reclaim of an expired, never-dispatched reservation do not debit again.

Reservations expire after 30 seconds and can be reclaimed with a new claim. Dispatch renews the 30-second lease and changes state before the external fetch. Expired dispatched requests become uncertain, never reserved. Unknown outcomes remain part of concurrency, and only the original valid claim can finish them. A late validated response can resolve its own uncertain request. This deliberately favors stopping paid retries over guessing that a fetch never happened.

Admission, dispatch, and successful finish all revalidate current source ownership, archive, revocation, and canonical contents under source row locks. Revocation after dispatch prevents a result from being accepted as completed. Completed result replay also rechecks access. Existing source attempts, responses, assignments, and authored Activities are never modified by these RPCs.

## Executed isolated checks on 2026-10-01

- `node scripts/verification/activity-ai-admission.mjs`: 123 PGlite SQL assertions passed. These exercise disabled configuration, ordinary role denial, source ownership, trusted snapshot fields and checklist, malformed supplied coach rejection with no reservation or quota debit, absent/null legacy briefs, malformed/null source shapes, raw character bounds including padded whitespace, exact UUID conflicts, semantic aliases, quota and concurrency gates, claim rotation, nonrepeatable dispatch, ambiguous outcome retention, result validation/replay, attempt-two history proof, revocation/archive/source mutation, duplicate numeric/string orders, and original-source preservation.
- `node scripts/verification/activity-ai-admission-real-pg.mjs`: 33 real PostgreSQL 17 race, role, and preservation assertions passed. Four concurrent matching admissions produce one reservation, four aliases, and one quota debit; four dispatches produce exactly one dispatch; concurrent finish produces one completion and three cached replays. Independent admissions respect three-request concurrency. Reclaim rotates exactly one claim; expired dispatched requests remain uncertain. Distinct actors racing global capacity admit exactly one. A real ordinary login cannot read private tables, call admission, or `SET ROLE` to service/installer. Functions belong to a non-superuser installer, and all five original source tables retain exact values.

The final retained real PostgreSQL proof database is `activity_ai_4022df394dc0` on the explicitly owned local cluster `127.0.0.1:55437`. No existing databases or fixtures were dropped. This is isolated validation, not deployed evidence.

## Deployment gates and limits

Before managed installation, independently review the SQL and Edge transport together, verify deployed `profiles.archived_at`, `activity_assignments.revoked_at`, canonical `profiles.class_id`, and assignment response column shapes, and take fresh source count/value snapshots. The earlier revocation SQL is a prerequisite even where migration history alone does not contain it. Install only through the confirmed Lovable Cloud route. Installation must leave the new configuration disabled and preserve every original source table, policy, and function definition.

Activation is a separate explicit configuration action after the deployed RPC permissions and ordinary-JWT denials pass. A paid end-to-end Activity call still requires Joshua's immediate credit-spend confirmation. Mocked Edge tests and isolated SQL tests establish contract behavior, not model grading quality.

The database cannot prove that a provider did or did not charge an ambiguous request. It never automatically reclaims such dispatches. Unknown outcomes can consume the actor's concurrency until their original claim reports a known result; no administrative resolution interface is part of this batch. Budget windows count admitted requests, not token costs. The broader tutoring, RRC, voice, and operator AI endpoints are outside this Activity-only contract.

## Final Edge and frontend pipeline review on 2026-10-01

The Edge Function derives the actor from authenticated `getUser()` and accepts the versioned request identity, source binding, response, and attempt number. It reads grading authority from the service-only admission contract. A cached receipt returns its saved result without a provider request. A reserved request must receive an exact `dispatched` acknowledgment containing the source-revalidated payload before fetching the provider. Only an acknowledged completed receipt returns a successful grade to the client. Gateway quota and credit failures use the SQL `provider_error` category; malformed output uses `malformed_result`; an ambiguous provider outcome remains `uncertain` without an automatic paid retry. Diagnostic logs exclude prompts, responses, and raw model output.

The frontend retains request UUIDs by authenticated owner and semantic request so deliberate retries reuse the same identity, including after remount. Failed request retention prevents a provider invocation. Actor checks before and after transport prevent a late reply from being applied to a different account. A failed judgment preserves the typed answer and attempt number, displays the error, and offers deliberate retry or an explicit **Continue unjudged and show answer** action. It does not automatically grade, consume an answer attempt, or reveal the answer on transport failure.

Root reports 19 mocked Edge/SQL integration checks passing, alongside the final 123 isolated SQL assertions and 33 real PostgreSQL assertions above, and passing production build and typecheck. An independent read-only review of the final SQL, Edge, and frontend pipeline found no new deployment blocker. The reviewer confirmed the final migration SHA-256 as `398202bbfbd7c3ca4996dca309da2f394d1c71f23df46dcd36ed6eb4c136e83b`. These are isolated and mocked proofs. They do not establish deployed browser behavior or provider grading quality.

Coordinated rollout remains gated on a fresh deployed schema/source preflight, additive installation with exact original-record preservation checks, Edge deployment through the confirmed Lovable route, and ordinary-JWT authorization and replay verification. Configuration must remain disabled until the matching Edge and client contract is available and deployed denials have passed. No live backend writes, activation, or paid requests were performed by this final review. Any Lovable action that may spend credits requires Joshua's explicit confirmation immediately before that action; a paid provider acceptance call likewise requires immediate credit confirmation.

The production-preview browser failure/retry walk passed with activity-coach blocked before transport reached the server. The answer and first attempt were retained, retry stayed unjudged, and the explicit continuation control was present. Browser inspection caught unreadable alert colors on the dark Activity canvas; a narrow card background/foreground correction passed 13 focused tests and the rebuilt browser screenshot. Temporary network blocking was cleared after the check. No paid grading or unjudged continuation was performed. Actual account-switch browser checks remain unchecked; nine actor/binding tests pass. Live ordinary-JWT concurrency, lost-reply, source-revocation, and completed-cache race checks also remain unchecked. No claim of completed rollout or full AI acceptance is made.

This contract protects admission authority, request identity, bounded quotas, dispatch, and saved grading receipts. The existing client attempt writer is unchanged and excluded from this batch. A client-authored attempt history is not a server-owned assessment ledger, and this release must not be described as completing that broader grading-integrity work.

## Managed SQL installation on 2026-10-01

Lovable project 53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76 was verified against imported commit 4474d9f9bdc68036983873f119e044137ab359c1. Its existing Supabase database is enabled. The tested migration was installed through the direct Lovable SQL connector after a read-only schema preflight. No Lovable agent action or credits were used.

Before/after whole-table count and ordered-row digest comparisons were identical:

| Existing table | Records | MD5 of ordered JSON rows |
| --- | ---: | --- |
| activities | 21 | 0474e760ce016d471e08960426789e27 |
| activity_assignments | 102 | 092b321a428d2d25e9e7e7e8181ba3e9 |
| activity_item_responses | 1657 | f513aa97bf2ed1668d94b15cafceca83 |

All four new tables have RLS enabled, zero permissive policies, and no direct SELECT privilege for authenticated or service_role. Anonymous and authenticated roles cannot execute begin; service_role can. Configuration remains enabled=false with 60/minute, 600/day per actor, 6000/day global and concurrency three. Receipt, alias, and budget tables remain empty. An owned real assignment returns contract_disabled/503; the same source under another actor returns source_unavailable/403. These calls performed no provider requests.

The Edge function is not yet deployed. The matching frontend is not published. Do not enable the configuration or claim the managed AI pipeline is active until deployment, ordinary-JWT checks, and coordinated publication pass.

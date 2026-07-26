# Plan Review Log: Classroom redesign

Act 1 (grill-with-docs) complete — plan locked, spec at `CLASSROOM-DESIGN.md`. MAX_ROUNDS=3.
Act 2 reviewer: Codex `gpt-5.6-terra`, reasoning effort medium, read-only sandbox.

Live-database verification performed before Act 2 via the Lovable connector
(project `53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76`), correcting the spec's
"the data is already there" claim. Findings recorded in `PLAN.md`.

Standing instruction from Joshua: Claude does **not** apply Codex's findings
automatically. Surviving findings are presented for per-item green/red light.

## Round 1 — Codex

Material blockers:

- Moving only `/classroom` outside `StudentShell` leaves `/classroom/uploads`, `/recaps`, item details, and assignment details inside it; Classroom links will abruptly return to the old chrome. Fix: define and move the entire `/classroom/*` route family, or keep all new links within the new page.
- `StudentShell` is currently the onboarding gate; the moved route bypasses its profile-name/onboarding redirect, while `ProtectedRoute allowSignedIn` permits any authenticated user. Fix: add an equivalent onboarding/profile gate around the new full-screen Classroom route.
- The route move does not itself weaken database RLS, but the plan never explicitly preserves the `ProtectedRoute` wrapper. Fix: specify the exact moved route element, retaining `ProtectedRoute flag="has_classroom_access" allowSignedIn` (or deliberately remove `allowSignedIn`).
- The “day-0 guarantee” cannot be implemented from the identified enrollment path: `AuthContext` provisions `students` client-side, and students cannot insert `classroom_items` under its RLS. Fix: add an idempotent privileged database trigger/Edge Function with a defined Joshua author ID and failure handling.
- Seeding at every auth signup is not equivalent to paid enrollment and could create welcome notes for unauthorized accounts. Fix: seed on the authoritative access-grant/enrollment transition, not `auth.users` creation.
- The seed is not idempotency-specified; retries/concurrent enrollment flows can create duplicate “latest word” notes. Fix: add a unique seed marker/source key plus `ON CONFLICT` behavior.
- “Joshua’s latest word” is underspecified: `useInbox` returns many conversations, and the latest message may be authored by the student. Fix: select a defined Joshua conversation and filter by Joshua/admin `sender_id`, then fall back to the seeded note.
- Query failures would be rendered as absent sections, falsely telling students there is no work, message, or booking. Fix: define loading/error states and telemetry separately from legitimate empty results.
- The scope lock is internally inconsistent: `test_date` capture requires edits to `Onboarding`, `Profile`, likely `src/lib/onboarding`, and regenerated Supabase types—none are in the allowed-file list. Fix: explicitly list every approved file and make generated-type regeneration part of the migration step.
- The test-date feature has no null, invalid, timezone, or past-date behavior, despite the deck depending on “days to test.” Fix: define local-date arithmetic and a truthful no-date/past-date deck state before implementation.
- The repository migration declares `external_work_uploads.extracted_text`, `parsed_json`, and `confidence_score`, while the plan says production lacks them; this is schema drift, not merely a UI limitation. Fix: add a production schema-drift check/migration and regenerate types before relying on upload status or fields.
- `lecture_video` is proposed only in the TypeScript union; the database `classroom_items.type` check constraint will reject it. Fix: include an additive migration updating the constraint, or do not add the type until hosting is implemented.
- “Inline images and GIFs” assumes existing classroom-content storage paths and publicly renderable URLs, neither established by `classroom_items`. Fix: specify the bucket, authorization/signed-URL strategy, and sanitized renderer.
- Rendering `content_html` inline without a mandated sanitizer introduces stored XSS; existing item detail code sanitizes it, but the plan does not carry that rule forward. Fix: require DOMPurify (or equivalent) before every inline HTML render.
- “Drills done” and “consistency/accuracy” need explicit sample thresholds and definitions; the analytics helper has low-sample semantics, but the plan could present misleading charts for one attempt. Fix: reuse `MIN_SAMPLE`/`hasData` rules and omit or label insufficient data.
- “Up next” merges multiple assignment systems but only says to dedupe by source ID; IDs from different tables can collide and the existing sources have distinct unlock/status semantics. Fix: dedupe by `(source_table, source_id)` and define ordering/visibility rules per source.
- The verification plan checks screenshots and typecheck but not RLS for the moved route, seed idempotency, production schema parity, or hook-error states. Fix: add student/admin/unauthenticated E2E cases plus migration and seed integration tests.

VERDICT: REVISE
### Claude's response

Accepted 16 of 17. Independently verified before accepting:
- `classroom_items_type_check` really does exclude `lecture_video` (live DB) — additive migration required or the type must not ship.
- DOMPurify is the established pattern (`ClassroomItem.tsx:61`, `ClassroomTAAssignmentDetail.tsx:98`) — the spec failed to carry it forward.
- `supabase/migrations/20260506000200_external_work_uploads.sql` declares `extracted_text`/`parsed_json`/`confidence_score`; production lacks all three. Confirmed schema drift, not a UI limitation.
- `StudentShell` is indeed the onboarding gate (profile display_name -> /onboarding redirect); moving the route out bypasses it.
- The `/classroom/*` sub-routes (uploads, recaps, item, ta, assignment) all remain in the shell — chrome whiplash confirmed.

Partially rejected: finding 7 attacked a strawman — the plan already said "on enrolment", not on auth signup. The idempotency half of the finding stands and is accepted.

Highest-value finding: 10 (loading/error states rendering as legitimate absence). Combined with the
"empty sections do not render" rule, a failed query would silently tell a student they have no
homework, no message and no booking. That is a correctness bug that would ship invisibly.

## Round 2 — Codex

Several Round 1 issues are acknowledged, but not yet converted into an implementable plan.

- The onboarding replacement is still ambiguous: “equivalent profile/onboarding check” does not say whether the gate requires `display_name`, `onboarding_completed_at`, or both; today `StudentShell` checks only `display_name`, so either interpretation changes behavior for partially onboarded users. Fix: specify one guard component, its exact query and predicate, its `authReady`/loading/error behavior, and the redirect return path.
- The moved family needs a new parent layout route with the Classroom frame and an `<Outlet>`; moving six individual routes outside the shell otherwise leaves detail/upload pages without the new navigation and frame. Fix: define `/classroom` as a guarded layout route and nest all six child routes beneath it.
- Seed idempotency is not implementable from a marker plus `ON CONFLICT DO NOTHING`: `classroom_items` has no unique constraint on `source_table`/`source_id`. Fix: add a partial unique index such as `(student_id, source_table, source_id)` for the enrollment-welcome marker, then target it in the insert.
- “Defined Joshua/admin id” is still not defined or safely resolved; a hard-coded UUID or a mutable profile lookup can make the trigger fail or attribute content incorrectly. Fix: name the authoritative lookup/configuration mechanism and make its absence a transaction failure with an admin-visible alert.
- The tri-state rule is correct but insufficiently specified to build consistently: it does not define loading UI, retry behavior, stale-data behavior, or whether an error hides the whole page versus only its block. Fix: establish one per-block contract: loading skeleton, prior successful data retained while refetching, inline retryable error, and omission only after a successful empty query.
- `useInbox` and `useConversationMessages` are separate asynchronous reads; the plan does not define how the selected Joshua conversation is obtained, what happens when the participant-name RPC fails, or how it avoids showing the seed while the real message is still loading. Fix: define a dedicated “latest Joshua word” query state and selection algorithm, with seed fallback only after a successful no-admin-message result.
- The day-0 `note` will match the Lecture Notes filter (`note`) and can appear both as “Joshua’s latest word” and as a lecture note, mislabeling the welcome message. Fix: exclude the enrollment seed marker from the lecture-notes section.
- Lecture notes remain zero-row production data with no posting workflow in scope; calling them the central promoted block is aspirational, not a backed feature. Fix: explicitly make the section dormant until authored content exists, or add a separately approved teacher-posting workflow and seed/backfill plan.
- Uploads remain zero-row data, and production schema drift breaks the parser itself: `parse-external-work` writes `extracted_text`, `parsed_json`, and `confidence_score`, so “status only” does not make the current pipeline safe. Fix: make the production schema-repair migration a prerequisite to exposing submission, or disable submission and show no upload capability in this release.
- Schema repair for uploads, the seed trigger/index, and regenerated types are now required migrations, but the scope lock authorizes only `profiles.test_date` plus an unspecified seed. Fix: update the allowed-change list to authorize each named migration/function/type-generation artifact, or defer those features.
- “Production-vs-repo schema parity check” is only a verification phrase; no authoritative command, expected schema, or deployment ordering is stated. Fix: require migrations to deploy before the UI and add a CI/deploy check that validates the required columns and constraints.
- The plan still preserves `allowSignedIn`, which means the new gate must be the sole enrollment/onboarding boundary; it cannot rely on `has_classroom_access`. Fix: state explicitly whether non-paying signed-in accounts may enter and test that policy.

VERDICT: REVISE
### Claude's response

Verified two claims against production before accepting:
- `classroom_items` has NO unique constraint beyond the primary key (indexes: pkey, student_idx,
  status_idx, type_idx). `ON CONFLICT DO NOTHING` on (student_id, source_table, source_id) is
  unimplementable without first adding a partial unique index. Codex correct.
- `supabase/functions/parse-external-work/index.ts` writes `extracted_text` (lines 272, 285),
  `parsed_json` (286) and `confidence_score` (287) to columns that DO NOT EXIST in production.
  The upload parse pipeline is therefore already broken in production, which explains why
  `external_work_uploads` has zero rows. This is a live defect discovered incidentally by the
  review and is out of scope for the Classroom redesign; it needs its own decision.

Best finding of round 2: the day-0 seed note is type `note`, so it would match the Lecture Notes
filter and appear twice — once as "Joshua's latest word" and again as a lecture note. That would
have shipped.

LOOP STOPPED AT ROUND 2 of 3, deliberately, not by convergence and not by cap.
Codex's remaining findings have shifted from "this is wrong" to "specify this in more detail"
(exact guard predicate, loading skeleton contract, deployment ordering). That is implementation
detail appropriate to the build step, not plan-level defect. Per Joshua's standing instruction,
surviving findings go to him for per-item green/red light rather than being applied automatically.
No VERDICT: APPROVED was reached and none is claimed.

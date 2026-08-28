# Plan Review Log: Testing Centre changes 1-5

Started 2026-08-28. MAX_ROUNDS=5. Reviewer: Codex (gpt-5.6-sol, read-only). Builder/arbiter: Claude (Fable 5).

Plans under review:
- plans/testing-centre-01-seal-the-sitting.md
- plans/testing-centre-02-server-persistence-and-leg-attribution.md
- plans/testing-centre-03-real-conversion-tables-and-review.md
- plans/testing-centre-04-clock-integrity.md
- plans/testing-centre-05-score-trajectory-and-teacher-visibility.md

## Round 1 — Codex

The set is not safe to implement as written. Several defects would leave LR legs unscoreable, allow stale writes to regress runs, and make the promised clock integrity ineffective.

1. **Critical: Plan 01, Step 1, falsely claims `section_history.user_id` has a database default.** The column is nullable with no default in `20260406070119_...sql:42`; the current insert omits it at `LRSectionResults.tsx:182`, while LR readback requires it at `practiceTestRunner.ts:122`.  
   **Fix:** Persist `user_id: user.id`, or add `DEFAULT auth.uid()` plus a backfill before changing readback.

2. **Critical: Plan 01, Step 1, preserves duplicate WAJ logging.** `handleFinishSection` already logs every answered miss at `Drill.tsx:1251`; `LRSectionResults` logs the same misses again at `LRSectionResults.tsx:203`, and `append_waj_wrong` appends history rather than deduplicating it.  
   **Fix:** Make one finalization path authoritative; section-summary persistence should not log already-recorded misses.

3. **High: Plan 01, Step 2, does not actually guarantee return to the invigilator after a network failure.** `commitSessionAttempts` can throw at `Drill.tsx:2167` before the proposed `persistSectionResults` call or its catch executes.  
   **Fix:** Wrap the complete sitting closeout in one explicit state machine that records failures and always offers a safe return or retry.

4. **High: Plans 01 and 02 rely on a `section_history` schema that cannot be reproduced from the migrations.** The 2025 migration creates required `section_mode` but no `mode` or `completed_at`; the later `CREATE TABLE IF NOT EXISTS` with the alternate schema is skipped on a clean replay. Current persistence writes `mode`, and readback queries `completed_at`.  
   **Fix:** Add a normalization migration that explicitly creates, backfills, and constrains the canonical columns before either plan proceeds.

5. **Critical security issue: Plan 02, Step 2, leaves local runs unscoped to an account.** `PracticeTestRun` has no owner ID, local keys contain only the run ID, and `TestingCentre` lists every local run. Signing into a second account in the same browser exposes the first account’s sitting and score without touching RLS.  
   **Fix:** Store and validate the authenticated owner ID locally, namespace local keys by user, and reject ownerless or mismatched cached runs.

6. **High: Plan 02 contradicts itself on deletion.** Step 1 grants owners DELETE, while Step 2 says server history must never be hard-deleted. A student can directly delete the row through Supabase.  
   **Fix:** Do not create an owner DELETE policy; expose only an allowed transition to `abandoned`.

7. **High: Plan 02’s RLS guidance points to a pattern that does not exist.** `section_history` has owner/class SELECT and INSERT policies, not an admin-read policy. Vague copying also risks an UPDATE policy without `WITH CHECK`, allowing ownership changes.  
   **Fix:** Specify exact policies, including `USING` and `WITH CHECK`, and use `public.has_role(auth.uid(), 'admin')` for admin SELECT.

8. **High: Plan 02’s attribution columns lack relational and idempotency guarantees.** There is no FK, ownership-safe composite FK, leg-range check, or uniqueness constraint. Retries and concurrent devices can create multiple result rows for one run leg, making “exact” readback ambiguous.  
   **Fix:** Add ownership-consistent FKs, a nonnegative/in-range leg check, partial uniqueness on run plus leg, and idempotent upserts.

9. **Critical race: Plan 02, Step 2, uses fire-and-forget whole-row upserts.** Multiple saves can complete out of order, regress progress, or resurrect an abandoned run. The read-time merge cannot repair a newer server state already overwritten by an older request.  
   **Fix:** Add a monotonic revision and server-side compare-and-swap transition, or serialize writes and reject regressive revisions.

10. **High: Plan 02’s recency merge is not implementable as specified.** The local model has no `updatedAt`, and the proposed database `updated_at DEFAULT now()` changes only on insert because no update trigger is defined.  
    **Fix:** Maintain local activity/revision metadata and install a database update trigger using the repo’s existing convention.

11. **High: Plan 02’s UUID schema conflicts with current ID generation.** `newRunId()` can return `pt-<timestamp>-<number>`, which cannot be inserted into a UUID primary key or UUID attribution columns.  
    **Fix:** Guarantee UUID generation on every supported runtime or consistently use a text identifier.

12. **High: Plan 02 does not reconcile direct run URLs when a stale local copy exists.** `PracticeTestRunPage` is instructed to read remotely only on a local miss, so a bookmarked URL can render and overwrite stale local progress even when the server is newer.  
    **Fix:** Always load both sources and reconcile before permitting another mutation.

13. **High: Plan 03, Steps 1 and 2, cannot call a curve “official” based only on PT number and raw total.** The builder arbitrarily takes the lowest-numbered two of three LR sections when the experimental section is unknown, and it deliberately accepts partial RC sections. A matching total does not prove the official scored composition was sat.  
    **Fix:** Associate each curve with an exact, verified scored-section blueprint and bank-completeness version; otherwise label the result estimated.

14. **High: Plan 03, Step 3, does not provide sitting-scoped LR review.** `/journal` renders `JournalIndexView`, not `src/pages/Journal.tsx`; that live view currently reads no filter parameters. Even PT plus section filtering would mix the sitting with prior attempts because WAJ rows lack run/leg attribution. The proposed “added to the journal” count likewise has no reliable source.  
    **Fix:** Link immutable LR attempts or WAJ history to run and leg, implement filtering in `JournalIndexView` and its hook, and derive the count from run-linked records.

15. **Dependency error: Plan 03 describes Plan 02 as merely beneficial, but both review session IDs and finished-sitting history require it.**  
    **Fix:** Declare Plan 02 and its applied migration a hard dependency of Plan 03.

16. **Critical: Plan 04, Step 2, writes `elapsedMs` into a field the live timer ignores.** `getTimerConfigForDrillRoute` uses only timer mode and duration; `TimerProvider/useTimer` always starts from a fresh `performance.now()`. LR re-entry would still receive a new clock.  
    **Fix:** Give the timer an authoritative deadline/initial elapsed value, or derive remaining time directly from the persisted deadline.

17. **Critical: Plan 04’s launch builders receive the unstamped leg.** `begin()` creates a stamped `next` run but calls `lrLegLaunch(next, leg)` and `rcLegHref(next, leg)` with the old `leg` object.  
    **Fix:** Pass `next.legs[next.currentLeg]` or make builders resolve the leg from the updated run and index.

18. **Critical: Plans 02 and 04 promise LR reload recovery while LR context exists only in `location.state`.** Reloading `/drill` drops mode, configuration, return path, attribution, and timer context; Drill then redirects away.  
    **Fix:** Put a validated run/leg identifier in the URL and reconstruct the runner from durable run state.

19. **High: Plan 04’s RC clock is neither durable nor authoritative.** `startedAt` is routed through the RC builder, which currently forwards only `returnTo`; merely seeding the existing `setInterval(e => e + 1)` counter still loses time under background throttling. The query parameter is also user-editable.  
    **Fix:** Load the persisted run/leg deadline from the server and recompute `Date.now() - startedAt` on every tick and visibility change.

20. **High: Plan 04 adds competing expiry and manual-submit paths without a one-shot guard.** LR and RC submit handlers have no synchronous mutex, while the proposed result tables allow duplicates.  
    **Fix:** Add an immediate submission lock plus database idempotency on run and leg.

21. **Dependency contradiction: Plan 05 declares only Plan 02 mandatory, but its analytics loader imports `scaledScoreForRun` from Plan 03.**  
    **Fix:** Declare Plans 02 and 03, including curve-loading behavior, hard dependencies.

22. **API contradiction: Plan 05 specifies shared `listCompletedRuns(userId?)`, then requires the teacher view to show complete, in-progress, and abandoned runs.**  
    **Fix:** Define `listRuns({ userId, statuses })` and build completed-only student analytics on top.

23. **High: Plan 05 auto-abandons by creation date in a client load path.** A 15-day-old sitting used yesterday would be abandoned, and a stale device can abandon a run active elsewhere.  
    **Fix:** Use server `updated_at` and an atomic conditional transition where status is still in progress and inactivity exceeds 14 days.

24. **Analytics integrity gap: Plan 05 plots by creation time and has no completion timestamp or score snapshot.** Long-running sittings can appear out of order; recalculating historical scores against later curve-file changes silently rewrites the trajectory; incomplete rows would misleadingly show raw/scaled scores with missing legs counted wrong.  
    **Fix:** Persist `completed_at`, curve/version provenance, and the terminal score; show scores only for completed runs.

25. **Cross-plan observability gap: Plans 01, 02, and 05 intentionally tolerate failed writes but define no durable retry queue, sync state, or diagnostic surface.** Missing runs and legs will look like legitimate unfinished work to students and like absent activity to Joshua.  
    **Fix:** Persist pending mutations locally, retry idempotently, expose an unsynced state, and emit structured failure telemetry keyed by run and leg.

VERDICT: REVISE

### Claude's response (round 1)

Verified the load-bearing claims directly before revising: user_id nullable/no
default/no trigger (confirmed in 20251020135043 + 20260406070119 migrations),
duplicate WAJ logging (Drill.tsx ~1251 + LRSectionResults ~203), timer config
derivation ignoring elapsedMs (drillRouteState.ts 91-117), full-section context
being location.state-only. All true.

Accepted outright (plans revised): 1, 2, 3, 4 (as a live-schema introspection step
+ guarded migration), 5, 6, 7, 8, 9 (revision counter + conditional update), 10,
11 (text ids, not uuid), 12, 15, 16, 17, 18 (URL-param reconstruction moved into
plan 02 step 4), 19, 20, 21, 22, 23, 24.

Accepted scoped-down:
- 13: the honesty gate is the exact-raw-total match plus persisted score_source
  provenance; no per-curve blueprint/bank-version machinery. A matching total on a
  2LR+1RC assembly is the necessary condition, and every non-matching case is
  labelled an estimate.
- 14: dropped the filtered-journal feature entirely rather than building run-linked
  WAJ attribution now; the missed count derives from the run's own totals; the LR
  review link makes no sitting-scope claim. Sitting-scoped LR review is declared
  future work.
- 25: no durable retry queue or telemetry pipeline at this product stage; a dirty
  flag + retry-on-load + visible "not yet synced" line covers the transient-network
  case and makes anything worse visible instead of silent.

Rejected: none.

## Round 2 — Codex

The revisions address most round-1 findings, including the three accepted scope decisions. Material persistence, ownership, and ordering problems remain.

1. **Plan 01, Step 1: removing WAJ logging changes unanswered-question behavior.** `commitSessionAttempts` skips entries without `selectedAnswer`, while `LRSectionResults` currently journals every non-correct stat, including unanswered questions. The claim that standalone behavior remains unchanged is false.  
   **Fix:** Decide explicitly whether unanswered questions belong in WAJ; if they do, log only those missing entries during finalization.

2. **Plan 01, Step 2: the proposed failure path can discard the resumable LR session before summary persistence succeeds.** `handleFinishSection` currently calls `finalizeDrillResumeSession` before the results screen. If `section_history` then fails and `finally` navigates away, re-entry rejects the now-completed resume row.  
   **Fix:** Confirm the section-history row before completing the resume record; leave it resumable when summary persistence fails.

3. **Plans 01 and 02: retrying LR closeout is not idempotent below `section_history`.** If attempts and WAJ succeed but section-history insertion fails, re-entry inserts the attempts and appends WAJ history again. The new unique index protects only the summary row.  
   **Fix:** Give sitting attempts and journal writes deterministic run/leg/question idempotency keys, or finalize the leg transactionally server-side.

4. **Plan 02, Schema reality check and Step 1: the migration still does not actually normalize `section_history`.** The prose identifies missing `mode`, `completed_at`, and the obsolete required `section_mode`, but the supplied migration only adds attribution columns. A clean migration replay remains broken.  
   **Fix:** Specify explicit convergent SQL for every divergent column, default, backfill, and obsolete constraint.

5. **Plan 02, Step 1: attribution does not enforce ownership.** The child tables reference only `practice_test_runs(id)`. A user who knows another run ID can attach their own child row to it and consume that run-leg unique slot. Also, `practice_test_run_id` with a null leg bypasses effective uniqueness.  
   **Fix:** Add unique `(id, user_id)` on runs, composite child FKs `(practice_test_run_id, user_id)`, and require run ID and leg to be both null or both non-null.

6. **Plan 02, Steps 2 and 3: the revision algorithm fails after multiple unsynced local saves.** If the server is revision 0 and local progress reaches revision 2, CAS against `run.revision - 1`, revision 1, can never succeed. Reconciliation selects local revision 2, and the single retry repeats the impossible predicate.  
   **Fix:** Track the last-synced base revision separately, serialize writes, and rebase retries to `serverRevision + 1`.

7. **Plan 02, Step 2: “every save increments revision” conflicts with the current void-returning save API.** Existing callers retain the pre-save object, so state and subsequent remote writes can use different revisions. Marking a run dirty would also risk incrementing revision for persistence metadata rather than product progress.  
   **Fix:** Centralize mutations in a coordinator that returns the canonical revisioned run and increments only once per logical transition.

8. **Plan 02, Step 3: abandoned runs can still be resurrected.** Reconciliation explicitly ranks `in-progress` above `abandoned`; higher revision always wins; direct owner UPDATE can rewrite terminal rows. This contradicts the plan’s stated terminal-history invariant.  
   **Fix:** Make complete and abandoned terminal server states, reject later in-progress updates, and route transitions through a validated CAS/RPC rather than unrestricted row updates.

9. **Plan 02, Step 2: ownerless legacy-key adoption preserves the account disclosure.** The old local value contains no ownership evidence, so silently assigning it to whichever account signs in first can expose the previous account’s score.  
   **Fix:** Quarantine or ignore ownerless keys; never silently adopt them into the current account.

10. **Plan 02, Step 3: discard defeats the accepted dirty-flag retry model.** It deletes the local copy even if the remote abandon fails, leaving no dirty state to retry. The remote in-progress run can later reappear.  
    **Fix:** Retain a dirty local abandoned tombstone until the conditional remote transition is confirmed.

11. **Plan 02, Step 4: RC uniqueness prevents duplicate sessions but does not make re-entry work.** `RcHubSurface.start()` always inserts a new session. On re-entry, the unique run-leg index produces `23505`; treating that as generic success provides no existing session ID to navigate to.  
    **Fix:** Implement get-or-create by run and leg, returning and resuming the existing RC session.

12. **Plans 02 and 04: RC clock context still disappears before `RcPlayer`.** The initial `/rc` URL carries run and leg, but `RcHubSurface` currently forwards only `sessionId` and `returnTo`. Plan 04 cannot load the authoritative run leg unless attribution is forwarded or exposed through the loaded session model.  
    **Fix:** Persist validated attribution during creation and carry run/leg to `/rc/drill`, or return them through `getSession`.

13. **Plan 02, Step 4: LR resume identity still collides across sittings and standalone sections.** `drillResumeKey` identifies full sections only by PT and section. A standalone section, abandoned sitting, or second sitting of the same PT can hydrate the wrong answers.  
    **Fix:** Namespace sitting resume records by user, run ID, and leg index.

14. **Plan 02: RC first-attempt rows remain race-prone.** `recordAttempt` performs a prior read followed by an insert, with no partial uniqueness constraint. Navigation writes racing manual or automatic submission can create two first attempts and inflate RC totals.  
    **Fix:** Add partial uniqueness on `(session_id, question_id) WHERE is_first_attempt` and use conflict-safe insertion.

15. **Plans 02 and 04 have a circular ordering dependency.** Plan 02 claims and verifies LR reload reconstruction using Plan 04’s remaining-time rules, while Plan 04 is ranked fourth and says reload recovery requires Plan 02. Plan 02 cannot pass its own browser gate when implemented second.  
    **Fix:** Move the pure deadline/config reconstruction into Plan 02, or ship Plans 02 and 04 atomically before Plan 03.

16. **Plan 02, deploy gate: pre-migration degradation is not viable as specified.** Writing the new attribution columns against the old schema fails the entire LR summary or RC session insert; exact queries can also fail before reaching the heuristic fallback.  
    **Fix:** Make migration application a strict prerequisite for the code deployment, or explicitly retry missing-column failures using legacy payloads and heuristic reads.

17. **Plan 03, Step 2: terminal snapshots miss an existing completion path.** “Mark it unfinished and continue” can advance the final leg and set status complete without entering the readback effect named by the plan. That produces completed runs with no snapshot.  
    **Fix:** Centralize every complete transition in one write-once `finalizeRun` function.

18. **Plan 03, Steps 2 and 4: legacy completed-run behavior is undefined until Plan 05.** Runs completed after Plan 02 but before Plan 03 can lack snapshots, while Plan 03’s receipt list and ScoreReport require stored scores and prohibit recomputation.  
    **Fix:** In Plan 03, define raw-only rendering with “scaled score unavailable” for snapshotless completed runs.

19. **Plan 03, Step 3: the journal link can lead to an unauthorized page.** Testing Centre requires drill access, while `/journal` separately requires journal or WAJ access.  
    **Fix:** Gate the link on journal permissions and render non-link copy otherwise.

20. **Plan 04, Step 4: the one-shot RC hard stop has no failure recovery.** `handleSubmit` returns when an attempt write fails. If the mutex remains engaged, the expired player is permanently stuck; if it is released without locking the UI, the student can continue answering after expiry.  
    **Fix:** Lock answering immediately at expiry, keep submission retryable, and release the mutex only for a controlled persistence retry.

21. **Plan 05, Step 3: the stated server-time update cannot be expressed with a normal filtered Supabase update.** PostgREST treats `now() - interval '14 days'` as a filter value, not executable SQL. Computing the cutoff in JavaScript contradicts “decided server-side.”  
    **Fix:** Add an authenticated RPC that uses server `now()`, abandons conditionally, increments revision, and returns affected IDs.

22. **Plan 05, student and teacher surfaces: query failures have no defined state.** Only loading and empty behavior are described, so a failed runs query can be presented as no sittings.  
    **Fix:** Require isolated loading, error, retry, and empty states for both practice-test panels, with failure-state tests.

23. **Plan 05, chart conventions: one referenced authority is wrong and the named page has no matching chart idiom.** The canonical palette is `docs/chart-palette.md`; `plans/analytics-viz-palette.md` says it is superseded. The existing Recharts trend pattern is in `src/components/mainhub/AnalyticsStage.tsx`, not `src/pages/Analytics.tsx`.  
    **Fix:** Point to the canonical palette and the actual shared chart implementation.

VERDICT: REVISE

### Claude's response (round 2)

Accepted outright (plans revised): 1 (unanswered questions stay journaled; finish
path logs only the entries commitSessionAttempts skips), 2 (resume finalized only
after section_history succeeds), 4 (explicit convergent normalization SQL), 5
(unique (id,user_id) + composite FKs + both-null pair checks), 6 (baseRevision
sidecar + rebase-to-serverRevision+1), 7 (single mutation coordinator; sync
metadata outside the revisioned payload), 8 (terminal states never resurrected:
reconcile rule + status-filtered conditional updates), 9 (ownerless keys ignored,
never adopted), 10 (dirty abandoned tombstone until confirmed), 11 (RC
get-or-create; 23505 fetches and resumes the existing session), 12 (attribution
persisted on the session row and returned by session load), 13 (sitting resume
keys namespaced user:run:leg), 14 (partial unique on first attempts +
conflict-safe insert), 15 (deadline math + config support moved into plan 02;
plan 04 now hard-depends on 02), 17 (single write-once finalizeRun for both
completion paths), 18 (raw-only rendering for snapshotless completed runs), 19
(journal link gated on its permission flag), 20 (lock answering at expiry;
mutex blocks double-submit, not retry), 21 (abandon_stale_practice_tests RPC in
plan 02's migration), 22 (loading/error/empty/data states, error never renders
as empty), 23 (docs/chart-palette.md + AnalyticsStage.tsx as the references).

Accepted scoped-down:
- 3: retry idempotency via per-phase closeout flags (attemptsCommitted,
  historySaved) persisted with the resume record — no server-side transactional
  finalization at this scale.
- 16: resolved by making the migration a strict prerequisite for deploying the
  code (ship together, migration first); no legacy-payload fallback layer.

Also declined (within finding 8's fix): a transition-validating RPC for run
updates — status-filtered conditional updates give terminal protection against
the app's own writes; an owner corrupting their own history via the raw API
harms only themselves and does not justify the machinery.

Rejected: none.

## Round 3 — Codex

The set still has material correctness, migration, and synchronization flaws. I did not re-raise the settled scope decisions.

1. **Plan 1, Step 2, closeout retryability:** The two phase flags are too coarse. [`commitSessionAttempts`](/Users/joshuaf/ai-os/projects/lsatu/src/pages/Drill.tsx:1206) can save some attempts and then throw, so `attemptsCommitted` remains false and retry duplicates successful attempt and WAJ rows.  
   **Fix:** Track completion per question or give each closeout write a deterministic idempotency key.

2. **Plan 1, Step 2, durable phase state:** “Alongside the resume record” is not implementable as written. [`PracticeSessionSnapshot`](/Users/joshuaf/ai-os/projects/lsatu/src/bootcamps/main-conclusion/lib/practiceSessionStore.ts:51) and the persisted [`PracticeSession` schema](/Users/joshuaf/ai-os/projects/lsatu/src/bootcamps/main-conclusion/persistence/records.ts:192) do not contain these flags, and parsing reconstructs only known fields.  
   **Fix:** Explicitly extend the schema, snapshot type, and load/save/finalize paths with closeout state.

3. **Plan 2, Step 1a, schema normalization:** Adding `mode DEFAULT 'full-section'` and `completed_at DEFAULT now()` backfills existing rows before the proposed `WHERE ... IS NULL` updates, thereby losing historical `section_mode` and `created_at`.  
   **Fix:** Add the columns without defaults, backfill them, then set their defaults.

4. **Plan 2, Step 1c, `section_history` ownership:** The composite FK is bypassable because `section_history.user_id` remains nullable and PostgreSQL’s default `MATCH SIMPLE` does not validate a composite FK containing `NULL`. Existing INSERT RLS checks only `class_id`, so another user can consume a run-leg unique slot.  
   **Fix:** Require `user_id` for attributed rows and replace the INSERT policy with an `auth.uid() = user_id` check.

5. **Plan 2, Step 1d, RC ownership:** [`rc_attempts.session_id`](/Users/joshuaf/ai-os/projects/lsatu/supabase/migrations/20260806000000_rc_drilling.sql:13) is independent of `user_id`, while RLS validates only the attempt’s `user_id`; an attacker can attach their row to another user’s session and consume its first-attempt slot.  
   **Fix:** Add `UNIQUE (id, user_id)` to RC sessions and a composite `(session_id, user_id)` foreign key from attempts.

6. **Plan 2, Step 1d, migration convergence:** The unique first-attempt index can fail immediately because the plan acknowledges that the existing read-then-insert path can already have produced duplicates.  
   **Fix:** Add a deterministic duplicate-remediation or explicit failing preflight before creating the index, and test the migration with duplicate fixtures.

7. **Plan 2, Step 3, initial-save race:** CAS reconciliation covers zero-row updates but not two concurrent first saves that both choose INSERT; the loser receives `23505` and can remain dirty indefinitely.  
   **Fix:** Serialize saves per run or reconcile and retry after INSERT conflicts exactly as after failed conditional updates.

8. **Plan 2, Step 3, terminal conflicts:** Reconciliation defines terminal versus in-progress but not complete versus abandoned. A cross-device completion/discard race can repeatedly select the local terminal state and never clear dirty state.  
   **Fix:** When both candidates are terminal, treat the already-committed server terminal row as authoritative.

9. **Plan 3, Step 1, curve validation:** Requiring every scaled integer from 120 through 180 validates the wrong axis and can reject legitimate tables that skip a scaled value. Raw-score coverage is what lookup completeness requires.  
   **Fix:** Require contiguous raw coverage from `0..total`, monotonic bounded scaled outputs, and valid endpoints without requiring scaled-value surjectivity.

10. **Plan 3, Step 3, missed count:** “Raw total minus raw correct per completed leg” contradicts [`practiceTestRaw`](/Users/joshuaf/ai-os/projects/lsatu/src/lib/practiceTest.ts:310), which counts every leg’s questions and treats unfinished legs as zero correct. The receipt can show fewer misses than its stored raw result.  
    **Fix:** Use the terminal snapshot’s whole-sitting `raw_total - raw_correct`.

11. **Plans 3 and 5, snapshotless runs:** Plan 2 permits completed rows with null `completed_at`; Plan 3 explicitly supports snapshotless completed runs, but both the receipt list and trajectory require a completion date.  
    **Fix:** Set `completed_at` on every Plan 2 completion transition and backfill/derive it from `updated_at` for already-completed snapshotless rows.

12. **Plan 5, Step 3, stale cleanup ordering:** Calling the stale-run RPC before retrying dirty local runs can abandon a remotely stale sitting with newer offline progress; terminal-wins reconciliation then destroys that progress.  
    **Fix:** Load and retry dirty runs first, exclude unresolved dirty run IDs from cleanup, then run stale abandonment and reconcile again.

13. **Plans 2 and 5, discard behavior:** Plan 5 says discard “deletes only the local copy,” contradicting Plan 2’s required dirty tombstone until remote abandonment is confirmed.  
    **Fix:** Make Plan 5 repeat Plan 2’s rule: retain the local tombstone until the server acknowledges abandonment, then prune it.

14. **Plan 3, Tests:** The load-bearing `finalizeRun` invariant has no test despite covering two distinct completion paths and write-once behavior.  
    **Fix:** Test readback completion, last-leg “mark unfinished,” repeated finalization, failed persistence, and snapshotless raw-only rendering.

15. **Program ordering:** Plan 3 can persist permanent official score snapshots before Plan 4 removes pausing and enforces hard expiry, allowing pre-integrity sittings into the later trajectory and teacher surfaces without qualification.  
    **Fix:** Make Plan 4 a prerequisite for Plan 3 final scoring, or mark pre-clock-integrity snapshots as nonstandard.

VERDICT: REVISE

### Claude's response (round 3)

Accepted all 15. Notable resolutions:
- 1+2: closeout progress persisted per-question under its own localStorage key
  (savedQids/wajQids/historySaved) rather than booleans grafted onto the drill
  resume schema — same guarantee, no schema surgery on the resume record.
- 3: migration order fixed to add-without-default, backfill, then set defaults
  (ADD COLUMN DEFAULT would have clobbered section_mode/created_at history).
- 4+5: attributed section_history rows now require user_id (check constraint) +
  INSERT RLS tightened to auth.uid() = user_id; rc_drill_sessions gains
  unique(id,user_id) with a composite FK from rc_attempts.
- 6: deterministic dedupe of existing duplicate first-attempts before the unique
  index, with a duplicate-fixture migration test.
- 7: INSERT 23505 now takes the same fetch-reconcile-rebase-retry path as a
  failed CAS; no dirty-forever loser.
- 8: terminal-vs-terminal reconciles to the server's committed state.
- 9: curve validation moved to the raw axis (contiguous 0..total, monotonic,
  bounded); scaled surjectivity dropped.
- 10: missed count from the snapshot's whole-sitting raw_total - raw_correct.
- 11: change 2's coordinator stamps completed_at on every completion transition;
  change 3 derives-and-persists from updated_at for legacy rows.
- 12: load path order fixed — dirty retries first, failed-dirty runs excluded
  from pruning, then the stale RPC, then reconcile.
- 13: plan 05's discard wording aligned to the tombstone rule.
- 14: finalizeRun test matrix added (both entry paths, write-once, failed
  persistence, snapshotless rendering).
- 15: program reordered — ship order is now 1 → 2 → 4 → 3 → 5, so no
  official-table snapshot is ever minted from a pre-clock-integrity sitting.

Rejected: none.

## Round 4

Codex re-read the five committed plans at `2da957fd` plus this log. It opened by
correcting the request itself: the round-4 prompt named plans 02, 03, and 05 by
shortened filenames that do not exist, and Codex reviewed the real committed files
instead of reporting a dead end. Eleven findings plus one minor.

### Codex's findings (round 4)

1. **Plan 01, Step 2, closeout key identity:** the key needs `runId` and `legIndex`,
   but `lrLegLaunch` passes only PT, section, and `returnTo` — Drill has no leg index
   before plan 02.
   **Fix:** carry explicit run and leg identifiers in launch state as part of plan 01.

2. **Plan 01, Step 2, WAJ failures:** `commitSessionAttempts` counts WAJ failures
   without throwing, so the resume record can be finalized and the closeout key deleted
   while `wajQids` are still missing.
   **Fix:** require the expected WAJ set to be covered before finalizing or deleting.

3. **Plan 02, Step 1a, RLS:** "replace or supplement" is unsafe — PostgreSQL ORs
   permissive policies, so the legacy class-only INSERT policy remains a live bypass.
   **Fix:** drop every legacy INSERT policy by name; create exactly one requiring both
   the class predicate and `user_id = auth.uid()`.

4. **Plan 02, Step 1d, dedupe:** `ctid` is physical location, not chronology, so the
   supplied SQL can retain the wrong row as "first"; deleting duplicates also destroys
   RC attempt history that should survive as later attempts.
   **Fix:** rank by `created_at, id`, keep the earliest, and DEMOTE the rest to
   `is_first_attempt = false` rather than deleting.

5. **Plan 02, Steps 2-3, acknowledgement race:** saves are scheduled without
   serialization or a revision guard, so an older save can acknowledge after a newer one
   failed and wrongly clear `dirty`.
   **Fix:** serialize saves per run and clear `dirty` only on a revision-matched ack.

6. **Plan 02, Step 4, reload bootstrap:** `Drill` builds `TimerProvider` synchronously
   and `DrillContent` resolves route state synchronously, so a reload redirects before
   any async run fetch can reconstruct it.
   **Fix:** add a parent bootstrap that resolves and validates the run first, renders
   loading meanwhile, and only then constructs the timer and content.

7. **Plans 02 and 03, terminal reconciliation:** "server always wins between terminals"
   discards same-status enrichment (score snapshot, derived `completed_at`), making
   plan 03's retryable finalization un-retryable.
   **Fix:** server wins only when terminal statuses CONFLICT; identical terminal
   statuses keep the immutable status and reconcile remaining fields by revision.

8. **Plan 03, Step 2, curve load:** a failed fetch is not distinguished from a loaded
   file missing that PT, so one transient failure can permanently stamp `estimate`.
   **Fix:** model loaded/failed/pending; only `loaded` may fall back; failure blocks
   finalization. Prefer bundling the JSON so the failure mode disappears.

9. **Plan 04, Step 4, RC enforcement:** `isSittingReturn(returnTo)` decides whether the
   hard stop applies, so editing navigation state restores standalone soft overtime on
   an attributed leg.
   **Fix:** derive sitting status, run, leg, deadline, and return path from persisted
   attribution; `returnTo` is a routing hint only, and enforcement fails closed.

10. **Plans 02, 04, 03, deploy window:** reordering does not close the gap, because runs
    outlive deploys — a run can start after plan 02, sit legs under the old clock,
    survive the plan 04 deploy, and still receive an official score.
    **Fix:** ship 2 and 4 as one release, or mark pre-integrity runs and refuse to mint
    `official-table` for them.

11. **Plan 05, Step 3, stale abandonment:** the no-argument RPC still abandons a
    failed-dirty run; skipping the local prune does not help, because terminal-wins
    then selects the abandoned server row.
    **Fix:** pass unresolved dirty ids to the RPC as exclusions; if the list cannot be
    built, skip cleanup for that load.

Minor: plan 03's journal permission claim is stale — `ProtectedRoute` returns children
for any signed-in user when `allowSignedIn` is set, before evaluating `flag`.

VERDICT: REVISE

### Claude's response (round 4)

Spot-checked the load-bearing code claims against the repo before accepting any of
them: `LrLegLaunch.state` does carry only `mode`/`config`/`returnTo`/`practicingLabel`
(1); `commitSessionAttempts` does count `wajFailed` while only `attemptErrors` throws
(2); `isSittingReturn` is plan 04's own proposed helper over mutable nav state, not
existing code (9); and `ProtectedRoute` does return children on `allowSignedIn` before
any flag check (minor). All four held.

Accepted all 11 plus the minor. Rejected: none. Notable resolutions:
- 1: new Step 2a in plan 01 adds `ptRun: {runId, legIndex}` to `LrLegLaunch.state`,
  with the leg index passed in rather than re-derived by search (`legs` can hold two
  legs of the same section). Parsing identity back out of `returnTo` was rejected
  outright, since finding 9 requires plan 04 to stop trusting that string.
- 2: `commitSessionAttempts` now returns the qids it actually journaled, and the
  closeout requires that set to cover every expected WAJ entry before finalizing.
  Incomplete means keep the key and still navigate back — never trap the student.
- 3: migration now enumerates `pg_policy` for `polcmd='a'`, drops each legacy policy by
  name, creates one combined policy, and asserts exactly one INSERT policy remains.
- 4: replaced with a `row_number() over (partition by session_id, question_id order by
  created_at asc, id asc)` demotion; the fixture test now asserts no row was deleted.
- 5: per-run promise chain plus revision-matched ack, with the A/B interleaving test
  written into the plan.
- 6: parent bootstrap component; explicitly forbids constructing `TimerProvider` before
  `remainingMs` is known, since a corrected-after-mount timer is the same leak plan 04
  closes. Standalone pass-through called out for verification.
- 7: reconcile rule restated as three cases, separating conflicting from identical
  terminal statuses.
- 8: loaded/failed/pending tri-state, with bundling the JSON named as the preferred fix
  that removes the failure branch entirely.
- 9: new Step 1b in plan 04 makes persisted attribution the source of sitting status for
  BOTH leg types, demotes `isSittingReturn` to a routing hint, and fails closed.
- 10: plan 02's deploy gate now requires 2 and 4 to ship together (or a
  `clock_integrity` marker), and plan 03's header enforces it at finalization.
- 11: RPC gains `exclude_ids text[] default '{}'` in plan 02; plan 05 passes unresolved
  dirty ids and skips cleanup entirely if the list cannot be built.

## Round 5 (final round of the loop)

Six findings, all rated implementation blockers, plus four non-blocking polish items.
Two of the six were regressions introduced by round 4's own fixes.

### Codex's findings (round 5)

1. **Plan 01, WAJ retry unreachable.** Round 4 let `section_history` be written before
   WAJ coverage completed. `PracticeTestRunPage` treats that row as "leg finished" and
   advances, so the student can never re-enter to retry the missing entries.
   **Fix:** WAJ coverage gates the history write.

2. **Plan 02, Step 4, leg validation too weak.** Ownership + range + in-progress lets a
   hand-edited `ptLeg` start a future leg, restart a completed one, or open an RC leg
   in the LR runner, consuming its single result slot.
   **Fix:** require `ptLeg === run.currentLeg`, matching kind, valid `startedAt`, no
   `completedAt`; take section/passage/pace from the run, never the URL.

3. **Plan 04, fail-closed contradiction.** "Enforce when the run cannot load" combined
   with clamping a missing `startedAt` to now grants a FRESH clock — more generous than
   the bug. A valid old timestamp also means expired, not garbage.
   **Fix:** lock answering and offer retry; never invent a deadline for an attributed
   session; clamping applies only to a present-but-malformed value.

4. **Plans 02 and 03, enrichment can erase a score.** Round 4's "identical terminals
   reconcile by revision" selects the whole higher-revision row, so a newer offline
   snapshotless row overwrites a server row holding an official score.
   **Fix:** make terminal enrichment monotonic — fill absent fields, never clear or
   replace `completed_at` or the score snapshot.

5. **Plan 03, retryable vs legacy snapshotless are indistinguishable.** A curve-load
   failure and a legacy run both produce snapshotless completed rows, but one must be
   retried and the other must never be rescored, and the schema cannot tell them apart.
   **Fix:** bundle the curves and delete the failure state, or persist an explicit
   pending marker.

6. **Plans 02/03/05, the separate-deploy path is half-specified.** The `clock_integrity`
   marker is mentioned but never added to the schema or model, its estimate reason is
   not distinguished, and analytics is not told to label or exclude those scores.
   **Fix:** make the combined 02+04 deploy mandatory, or specify the marker fully
   across all three plans.

Polish: plan 04 still shows two-argument `lrLegLaunch`/`rcLegHref` calls; plan 02's
A/B test cannot resolve B before A once saves are serialized; Vite cannot statically
import JSON from `public/`; add tests for forged leg parameters, unavailable attributed
runs, WAJ failure flow, and snapshot monotonicity.

VERDICT: REVISE

### Claude's response (round 5) — loop cap reached, adjudicated

Round 5 is the loop's cap, so this is adjudication rather than another round. Accepted
all six plus the polish; rejected none. Where a finding offered a strict option and a
flexible one, the strict option was taken in every case, because each flexible option
bought optionality we do not need at the cost of schema or surface complexity:

- 1: ordering is now attempts -> WAJ coverage -> history -> finalize resume -> navigate.
  An incomplete journal leaves the leg unscored and recoverable (the invigilator's
  existing `noResult` branch renders it honestly) rather than scored with misses lost.
- 2: full validation set specified; the URL supplies identity only, never data.
- 3: no authoritative deadline means lock answering and retry, never a fresh clock;
  clamping is scoped to present-but-malformed timestamps, and a valid old one expires.
- 4: terminal enrichment is a monotonic field-level floor on `completed_at` and the
  score snapshot; everything else still selects whole rows.
- 5: curves are bundled from `src/data/pt-curves.json` (Vite cannot statically import
  from `public/`), which deletes the `failed` state entirely — so every snapshotless
  completed run is unambiguously legacy and no pending marker is needed.
- 6: the combined 02+04 deploy is now mandatory and the marker path is struck. If they
  cannot ship together, stop and re-plan rather than improvise.

Loop closed at round 5. Findings from all five rounds: 25 / 23 / 15 / 11+1 / 6+4 = 80
raised, 80 absorbed, 0 rejected. Build proceeds from plan 01, implemented by Claude
rather than handed to Codex (Joshua's call, 2026-08-28).

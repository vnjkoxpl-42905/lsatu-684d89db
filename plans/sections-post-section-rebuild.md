# Sections, post-section and review: fix plan

Date: 2026-11-18 (revised after review rounds 1 to 3)
Audit: [docs/audits/2026-11-18-sections-post-section-review-audit.md](../docs/audits/2026-11-18-sections-post-section-review-audit.md). Finding ids F1 to F15 refer to it.
Review log: [sections-post-section-rebuild-REVIEW-LOG.md](sections-post-section-rebuild-REVIEW-LOG.md)
Status: draft for independent review. No code has been changed.

## Repo conventions that bind this work

- Repo root `C:\Users\Joshu\dev\lsatu`, npm, TypeScript strict is OFF (do not flip it).
- One branch per session off `main`, one PR. Never commit to `main`, never roll `main` back.
- Before any push: `npm run typecheck` and `npm run test`. Push with `bash .claude/safe-push.sh`.
- Any change under `src/components/` or `src/pages/` is not done until viewed running (dev server on 8080 plus a screenshot or DOM check). Responsive changes get the full matrix first: narrow, mid, wide, sidecar-docked.
- Never clear browser storage on dev tabs (it signs Joshua out).
- No Lovable credits without Joshua's confirmation immediately before the action. Schema and function changes go through managed SQL after Joshua confirms the SQL text, Edge Function deploys through the Lovable agent in one batched message.
- Student work is never lost or modified. New fields are optional with fallbacks. No destructive migration, no deleting historic rows, no change to first answers in any saved row.
- Student copy goes through `wiki/teaching-voice.md`. No em dashes. No "door" as a unit of content. No Logic Games.
- Only commit your own files. The working tree has unrelated modified files.

## Goal

A student finishes a section on either path and gets the same thing: a score they can trust, a report built from the saved record, a review walk they can reopen next week, and blind review they can do now or later. The record is complete and consistent whichever path ran the section.

## Principles

1. **The saved record is the source of truth for every post-section view.** The screen straight after a section and a visit next week render the same component from the same saved data.
2. **First answers are immutable.** `section_history` is written once, at close-out, and never updated by this work. Everything that arrives later (prediction, blind review, updated diagnosis) goes in a separate record keyed to it.
3. **Close-out is one atomic server operation, first writer wins, and the server owns identity.** The server owns the sitting id, the user id and the class id. The history row, attempts and journal items are written in one transaction, and the journal and attempts are written only by the call that created the history row. A retry, a reload, a lost acknowledgment or a second tab with different contents cannot create a second row or a disagreement.
4. **Blind review is its own record**, never a fake attempt, graded against the saved credited answer, and written only through a server function.
5. **Do not widen what a student can see before blind review.** Practice-test legs stay sealed until the whole sitting ends. Every reader of `section_history` and of the new record applies one release rule for an assigned section. The journal and attempts are not changed by this plan in when they are written (see Known limitation).
6. **Do not refactor `Drill.tsx` wholesale, and do not change shared callers.** Practice-test legs, practice sets, guided drills and Smart Drill keep their current close-out code and contracts untouched.

## Known limitation, unchanged by this plan

Today an assigned section's answered misses are written to the journal and `attempts` at finish, before blind review, so the journal, drill history and flag-to-journal bridge (`ensureJournalEntry`, `Drill.tsx` ~3442) already expose which answered questions were missed. This plan does not close that. Closing it means deferring those writes to a release step, and review found that this needs its own design for release recovery, flag handling and event ordering (late events must not replace newer outcomes). It is recorded as decision 4 for Joshua. Where this plan changes timing, it does so narrowly: unanswered misses are now journaled at close-out, where today they are journaled after blind review. That reveals the credited answer of a blank question earlier; Phase 0.11 measures it.

## Data model (additive only)

### `section_history` (written once, at close-out)
New nullable columns:
- `client_sitting_id uuid`, with an ordinary unique index (Postgres allows many nulls, and an ordinary index is a valid `ON CONFLICT` target). Legacy path only; protected rows keep `timed_section_sitting_id`.
- `assignment_id text` and `release_requires_br boolean`, so the seal is decided from the row alone. Null on older rows, which behave as unsealed, as today (they were only written after blind review).
- A unique index on `(id, user_id)` for the composite foreign key below.

Adding columns and indexes is not a row write, so the protected-row trigger `section_history_guard_v1` does not fire. Verify in Phase 0.

### New table `standalone_section_sittings` (server-owned sitting identity)
`id uuid`, `user_id`, `pool_key text` (the existing resume key, for example `drill::section::pt105-s2`), `state` (`open`, `closed`, `abandoned`), `generation int`, `created_at`, `closed_at`. A partial unique index on `(user_id, pool_key) where state = 'open'` allows only one open sitting per account and section.
- Authorization of the table itself: row level security enabled; `authenticated` gets SELECT of its own rows only (admin read as the existing admin policies do); `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` are revoked from `public`, `anon` and `authenticated`. Only the security-definer functions below mutate it. This follows the pattern in `standalone-timed-control-foundation.sql:149-165`. Verified in Phase 0 and by tests that try direct writes and cross-owner reads.
- One locking rule for every mutation. `open_section_sitting_v1`, a restart and `close_standalone_section_v1` each take `pg_advisory_xact_lock` on a hash of `(user_id, pool_key)` first, then read the sitting row and recheck its state under that lock before changing anything. The partial unique index stays as a backstop, not as the serializer. A close-out and a restart on the same section therefore cannot interleave: whichever takes the lock second sees the other's result.
- Function `open_section_sitting_v1(p_pool_key text, p_known_sitting_id uuid, p_restart boolean, p_expected_generation int)`: derives the user from `auth.uid()` and works under the lock above.
  - No restart, open sitting exists: return it (a resume, a reload or a second tab all receive the same id and generation).
  - No restart, none open, and `p_known_sitting_id` names the caller's own `closed` sitting: return `closed` with that sitting's saved history id. It does not create a successor. The client loads the saved result and finalizes the resume record. This is the recovery path when the close-out committed but its reply was lost or the resume record was never finalized (`Drill.tsx:2948-2965` finalizes it separately and swallows failure).
  - No restart, none open, and the caller sent no known id: create the sitting (the first one, or a new visit after the latest one closed or was abandoned). A caller that sent a known id never reaches this branch.
  - No restart, and the known id is not the latest generation (it was abandoned or superseded): never allocate. Return `stale` with the latest sitting: if it is open, its id and generation; if it is closed, `closed` plus its saved history id. The tab reconciles to that and does not touch the old state.
  - Restart only happens on an explicit user action and must send `p_expected_generation`. The expectation is compared with the latest generation whatever its state. Equal: abandon it if open (a closed one needs nothing) and create the next generation, which is how a retake starts. Lower than the latest: return the latest sitting (open, or `closed` with its history id) and create nothing. So a delayed or duplicated restart request cannot create a second successor, even after the first successor has closed.
- Resume data is bound to the sitting. Today one account record per student and section is last-writer-wins by `updated_at` (`drillResumeSession.ts` upserts `practiceSessionIdFor(userId, key)`, hydration compares timestamps, `practiceSessionStore.ts` finalizes the same pool-derived id), so a stale tab could overwrite a newer sitting's answers and clock, or a delayed finalization could complete the wrong sitting. For standalone legacy sections the storage key and the device backup key therefore include the sitting id: `practiceSessionIdFor(userId, key + '#' + sittingId)`. Hydration reads only the record for the sitting the server returned. A stale tab writes to its own abandoned sitting's record, which nothing loads, and its close-out returns `stale`. Finalization names the sitting, so it cannot touch another sitting's record. A section already in flight under the old pool-derived record is adopted inside `open_section_sitting_v1` itself, in the same transaction and under the same lock that creates the sitting: the RPC copies the account `bootcamp_kv` record for the old pool-derived id to the new sitting key with an insert that does nothing if the key already exists, and records `adopted_from_record_id` and `initialized_at` on the sitting row. The old record is never deleted or modified (student work is preserved). So there is no window where a sitting exists without its snapshot, a retry or a second tab gets the already-initialized sitting, and the copy can never overwrite an initialized snapshot. The client does not run the clock or autosave (the `Drill.tsx` full-section save at 1323-1333 included) until open returns an initialized sitting. The sitting row also records the adopted record's `updated_at` as `adopted_revision`. A newer device backup is recovered through today's existing path (`drillResumeSession.ts` 258-272 keeps the newer local copy; `Drill.tsx` 1062-1067 pauses on that question with the save error until a guarded save succeeds), now scoped to the sitting key: the guarded save is a conditional write that succeeds when the sitting record's `updated_at` still equals `adopted_revision` (or the revision the tab last read), whether or not that baseline already holds answers. If the record has moved on, nothing is overwritten: both copies are kept and the tab stays in the explicit paused recovery state instead of silently resuming the older work. Phase 0.10 lists every caller of the old key; `accountSectionKey`, the device backup, the paused recovery gate and the practice-test leg path are checked so unrelated callers are unchanged.
- The id and generation are cached on the device only to be sent back as `p_known_sitting_id`. The client always asks the server on load and never allocates a replacement generation on its own.
- A tab holding an abandoned id cannot close out: the function rejects it with `stale`, and the client reloads. A tab holding a `closed` id gets the saved result, not an error (see the close-out contract).

### New table `section_review_records` (one row per saved section, written later)
`history_id uuid` (unique, composite FK `(history_id, user_id)` to `section_history(id, user_id)`), `user_id`, and two independent column groups:
- prediction: `predicted_score`, `predicted_at`
- blind review: `br_results jsonb`, `br_score`, `br_total`, `br_percent`, `br_delta`, `br_analysis_json`, `br_completed_at`
plus `created_at`, `updated_at`.
- Owner SELECT and admin SELECT only. No direct INSERT, UPDATE or DELETE for anyone. All writes go through `save_section_prediction_v1` and `save_section_blind_review_v1`, each setting only its own column group, so a student cannot mark blind review complete without sending it, and a prediction can never clear blind review data.
- It is not a protected source table, so the guard does not apply. A protected section's first-answer row is never written again.
- Why a separate table: the deployed trigger rejects any write to a protected `section_history` row unless `current_user = timed_section_executor`. An owner policy or an ordinary function cannot update those rows, and widening the protected writer would reopen a contract verified in isolation.
- Readers merge each group independently. Blind review data and the blind review diagnosis are used only when `br_completed_at` and the matching payload are present; otherwise the historical `br_*` columns on `section_history` and the first-pass `analysis_json` stay in force.

### Server functions (managed SQL, Joshua confirms the text first)
Every function: security definer, `set search_path = pg_catalog, public`, execute revoked from `public` and granted to `authenticated` only, rejects a null `auth.uid()`.

- `close_standalone_section_v1(p_sitting_id uuid, p_payload jsonb)`. Security contract:
  - `user_id = auth.uid()` and `class_id = get_user_class_id(auth.uid())`, both derived on the server. The payload cannot supply either.
  - Take the sitting lock, then read the sitting scoped to the caller. Not found or not the caller's: `stale`. `closed`: look up the history row by `client_sitting_id`, scoped to the caller, and return its id with `replayed` and the `conflict` comparison below. This check comes before any stale rejection, so a lost acknowledgment is always recoverable. `abandoned`: `stale`. `open`: continue. The state change to `closed` is a conditional update (`where state = 'open'`) in the same transaction as the history insert.
  - Reject any payload carrying `practice_test_run_id`, `practice_test_leg`, `timed_section_sitting_id` or a timed marker, so it cannot touch a protected or practice-test row.
  - Validate shape: `questions` is an array of distinct qids, each with the fields `SectionQuestionStat` defines, within sane length and value limits.
  - If `assignment_id` is present, require that the assignment belongs to the caller and is that section's assignment (Phase 0.13 names the table).
  - In one transaction: insert the `section_history` row `on conflict (client_sitting_id) do nothing`, and set the sitting `closed`. Only when this call inserted the row: write one attempt per answered question (id from `md5(sitting_id || qid)::uuid`, `on conflict do nothing`) and one journal item per miss, answered or not, through the existing `append_waj_wrong` with the server-derived class id. The history insert is the gate, so the journal cannot be appended twice and no per-item dedupe key is needed.
  - If a row already existed, look it up scoped to the caller, return its id with `replayed`, ignore the payload, and return `conflict` when the stored first answers differ from the payload's, so the client shows the saved result.
  - Correctness is still computed by the client from the bank, exactly as every attempt insert is today. Trusting the grade is unchanged; trusting ownership, class and attribution is not allowed.
- `save_section_prediction_v1(p_history_id uuid, p_score int)` and `save_section_blind_review_v1(p_history_id uuid, p_answers jsonb, p_analysis jsonb)`. Owner-checked against `section_history.user_id`. The blind review function derives correctness, change flags and totals itself from the saved `questions_json` first answers and credited answers and the submitted letters, never from a client-supplied `correct`, sets `br_completed_at = now()`, is idempotent, and rejects a history id that belongs to a practice-test run. The diagnosis (`p_analysis`) is the output of the existing TypeScript `analyseSection`, which the client runs over the saved questions merged with the BR answers; the function validates its shape and stores it as given, because it is derived presentation data owned by the student and not an input to any grade or seal. A section whose bank question is gone is graded from the saved credited answer.
- The client never inserts attempts or journal items for a standalone legacy section again. The existing `commitSessionAttempts`, `runSittingCloseout`, `handleFinishPracticeSet` and guided close-out are not changed.

## Phase 0: verify before building (read only, no changes)

Record each answer in the PR description. Each names the evidence that closes it.

- 0.1 Policies, triggers, function definitions and ownership on `section_history`, `attempts`, `wrong_answer_journal`, including `append_waj_wrong` (security mode, how it checks `class_id`):
  `select schemaname, tablename, policyname, cmd, qual, with_check from pg_policies where schemaname='public' and tablename in ('section_history','attempts','wrong_answer_journal');`
  `select tgname, tgrelid::regclass, pg_get_functiondef(tgfoid) from pg_trigger where tgrelid in ('public.section_history'::regclass,'public.attempts'::regclass) and not tgisinternal;`
  Confirm that added columns, indexes and the new tables do not fire the guard, that a security-definer function can insert legacy `attempts` and `section_history` rows, and which columns `attempts` requires.
- 0.2 Every reader of `attempts` (`BreakdownPanel`, `StudentOverview`, `useStudentAnalytics`, `useTagStats`, `adaptiveEngine`, `drillHistory`, `drillIntelligence`, `firstAnswerSources`, `sectionFreshness`, `studentAnalytics`, `useBootcampMetrics`, and any found by a fresh `grep -rn "from('attempts')"`): does it exclude `br_selected` rows, and what does a BR row do to it.
- 0.3 Counts: `attempts` where `br_selected is true`; `section_history` rows with `br_used`; rows with `questions_json = '[]'`.
- 0.4 Capability split: how many accounts return `enabled: true` from `timed_section_capability_v1`, through the existing ordinary-JWT probe, without changing configuration.
- 0.5 Protected completed sittings: one real completed sitting; confirm `/testing/attempts/section/lr/<historyId>` resolves in `listPracticeSectionAttempts` and `PracticeSectionResult`.
- 0.6 Duplicate journaling (F3): reproduce on the legacy path with a test account. Count journal history items for one answered miss after one section. Expected today: 2.
- 0.7 Retry duplication (F14): force the history write to fail after attempts commit, retry, and count `attempts` rows for one question. Expected today: more than 1 for non-guided sections.
- 0.8 `send-section-report` Edge Function: what it reads (history row only, or BR too), and whether it can be called a second time after blind review.
- 0.9 Stale-link set: ids that `/testing/attempts/section/lr/:id` receives today that are resume-record ids with no matching history row (F13).
- 0.10 The resume key shape for a standalone section (`drill::section::ptX-sY`) is stable and is what `open_section_sitting_v1` should use as `pool_key`; list every place it is built.
- 0.11 Existing exposure, measured: as a test student with an assigned section, stop after the section and before blind review, and record what the journal, drill history and progress show. Also record what changes when unanswered misses are journaled at close-out instead of after blind review.
- 0.12 Every reader of `section_history` and of first answers (`fetchSectionHistory`, `SectionHistoryList`, `listPracticeSectionAttempts`, `buildSectionReviewQueue`, `adaptLrSections`, `firstAnswerSources`, `fetchDrillHistory`, `StudentWorkPanel`), with the file and line where each applies the release rule.
- 0.13 The table that records an assigned section and its owner, and the rule the close-out function uses to check that `assignment_id` belongs to the caller and to that section.

Exit criterion: each of 0.1 to 0.13 has a written answer. If 0.1, 0.2, 0.5 or 0.10 shows a worse state than assumed, stop and revise this plan before Phase 1.

## Phase 1: atomic close-out on the legacy path (F2, F3, F11, F14)

1.1 Add the schema and functions in the Data model section. Isolated verification in the existing PGlite style under `scripts/verification/`, plus the forged cases:
- duplicate close-out returns the same row and writes nothing new;
- two sessions with different answers for one sitting leave the first stored and return `conflict` to the second;
- two tabs opening a section with no existing identity receive one id (simultaneous `open_section_sitting_v1`), and a restart abandons the old id so a stale tab's close-out returns `stale`;
- lost acknowledgment: close-out commits, the reply is dropped, the retry returns `replayed` with the saved history id; and if the resume record was never finalized, a reload passes the cached id, receives `closed` plus the history id, creates no successor sitting, and no second history row, attempt or journal item appears;
- both interleavings of restart and close-out (close-out first, then restart; restart first, then close-out) under real concurrent transactions, not a single-session simulation: the loser sees the winner's result and no outcome is written to an abandoned sitting;
- repeated and double-clicked restart requests with the same `p_expected_generation` create exactly one successor; a restart with an old generation returns the current open sitting and abandons nothing;
- recovery without a stray successor: generation 1 abandoned, generation 2 closed, the old tab reloads with generation 1 and gets `stale` plus the saved generation 2 result, no generation 3; a restart request for generation 1 replayed after generation 2 closed returns generation 2 and creates nothing;
- stale resume writes: after tab B restarts into generation 2, a heartbeat or delayed finalization from tab A on generation 1 leaves generation 2's record, answers and clock untouched, and a reload loads generation 2 only; an in-flight section with an old pool-derived record is adopted by the first open without losing an answer;
- interrupted and concurrent adoption: a tab that closes right after `open_section_sitting_v1` commits leaves an initialized sitting whose record holds the old answers, and the next load resumes them; two tabs opening an in-flight section at once get one sitting, one copy, and neither tab's empty first save overwrites the adopted answers; an acknowledged Q1 on the account plus an unacknowledged Q2 and newer clock in the device backup resumes with Q2 and the newer clock after adoption; if another tab changes the sitting record during that recovery, both copies survive and the tab stays paused.
- direct table access: an authenticated user's `INSERT`, `UPDATE` and `DELETE` on `standalone_section_sittings` and `section_review_records` fail, and a user cannot select another user's rows;
- a retake gets a new sitting and a second history row;
- a forged `class_id`, a foreign `assignment_id`, a foreign sitting id, a protected or practice-test marker in the payload, duplicate qids and an oversized payload are all rejected;
- a failure partway rolls the whole transaction back;
- the protected guard still rejects what it rejected before.
1.2 New `src/lib/sectionCloseout.ts` builds the payload from the finished session with `buildSectionStats`, `buildSectionTotals`, `buildAnalysisInput` and `analyseSection`, then calls `close_standalone_section_v1`. It returns the history id, `replayed`, `conflict`, `stale`.
1.3 On section start the client calls `open_section_sitting_v1` and keeps the id and generation in the resume record and device backup as a cache, passing the cached id as `p_known_sitting_id`. Only an explicit "start over" action passes `p_restart` with the cached generation. A resume or reload does not. When the reply is `closed`, the client loads the saved result and finalizes the resume record instead of starting a section.
1.4 `handleFinishSection` calls the close-out for a standalone `full-section` run before it sets `postSectionScreen`. The history row exists before the predict screen. `LRSectionResults` writes nothing and receives the history id. The second journaling call in the results effect is removed. On `conflict` the client loads the saved result and says the section was already submitted elsewhere. On `stale` it reloads the sitting. On `replayed` it uses the returned history id and finalizes the resume record.
1.5 A failed close-out keeps the section open on the Section complete screen with a visible retry. Leaving before it succeeds leaves the resume row unfinalized, so re-entry offers the retry. The retry is safe by construction.
1.6 Assigned sections write `assignment_id` and `release_requires_br = true`. `closeOutAssignedSection` and `closeOutHomeworkAssignment` keep their timing and failure handling.
1.7 `emailSectionReport` is called once after the close-out succeeds, only when the call created the row and the section is not sealed. For a sealed section it is called after blind review. See 2.8.
1.8 Nothing else changes: practice-test legs (`runSittingCloseout`), practice sets, guided drills, Smart Drill and `commitSessionAttempts` keep their current contracts. Add regression tests that an answered-correct attempt failing in a practice-test leg and in a practice set still blocks completion exactly as before.

Tests: `sectionCloseout.test.ts` for payload building, retry, replay, conflict, stale; extend `sectionHistorySave.test.ts`. Existing `Drill.saveBRResultsOrder.test.ts` and `LRSectionResults.timeline.test.tsx` must still pass.

## Phase 2: prediction and blind review as their own record (F4, F5, F6)

2.1 Schema and the two save functions as above, verified in isolation: owner read, other user denied, admin read, a direct table write denied, composite FK rejects a mismatched user, protected-row history ids accepted, a prediction save cannot clear blind review fields, a blind review save cannot set another user's record, a practice-test row is rejected.
2.2 `src/lib/sectionReviewRecord.ts` wraps the two functions.
2.3 Blind review correctness comes from the saved first answers and credited answers inside `save_section_blind_review_v1`, not from `EnhancedBlindReview`, which grades against the current bank. Test: the bank's key for a question changes between the sitting and the blind review.
2.4 `ScorePrediction.onPredict` calls `savePrediction`. A failed save shows a retry and does not block the student. The report shows "no prediction saved" rather than guessing.
2.5 `EnhancedBlindReview.onComplete` calls `saveBlindReview` with the history id. Failure shows an error with retry. "Skip to results" no longer ends blind review for an unsealed section: the report keeps a "Do blind review" action that works at any time. For a sealed section, completing blind review is what releases the report, and it is one write, so there is no half-released state.
2.6 Stop inserting BR rows into `attempts` and stop writing `blind_review_sessions` from the section flow. Keep `blind_review_sessions` for the type-drill blind review that still uses it and say so in the PR.
2.7 Historic BR attempt rows: do not delete. Per 0.2, every analytics reader excludes `br_selected = true` through one shared helper (`attemptsFilter.ts`) and a test fails if a reader skips it.
2.8 The report, history list and teacher panel pick the diagnosis with one selector: blind review diagnosis when `br_completed_at` and `br_analysis_json` are present, otherwise the first-pass `analysis_json`, and the label says which. A second teacher email after blind review needs an Edge Function change (Lovable agent, batched); that is decision 2. Until then the teacher panel shows the updated diagnosis.

Tests: save independence, failure and retry paths, merged reads for a row with old `br_*` only, a row with a prediction-only record over old and new history, and a row with a complete blind review record. No `attempts` insert carries `br_selected`.

## Phase 3: one report for both paths (F1, F7, F9, R6, R8)

3.1 Release rule. One pure function `sectionReleaseState(row, record, runState)` returns `sealed` or `released`: a row with a `practiceTestRunId` is sealed until its run is complete; a row with `release_requires_br` is sealed until the record has `br_completed_at`; every other row is released. Every reader of `section_history` and of the record applies it, per 0.12: `SectionHistoryList`, `listPracticeSectionAttempts`, `buildSectionReviewQueue`, `adaptLrSections`, `firstAnswerSources` (section part), `StudentWorkPanel`, the report route, the walk loader and the blind review entry. The journal and attempts keep today's behavior (Known limitation). Tests: close out an assigned section, stop before blind review, then assert no score, first answer or credited answer appears through each of those readers and a direct report link, including after a failed close-out; complete blind review and assert they all appear once.
3.2 New route `/review/section/:historyId` renders `SectionReport` from the merged saved data: score under the clock, saved prediction or an explicit "none saved", timeline, by-type table, diagnosis version, regulation versus overtime split, blind review result or a "Do blind review" action, and "Open review walk". A sealed row shows that the section is complete and the blind review action only.
3.3 Extract the display parts of `LRSectionResults` into `src/components/section-report/` so the immediate screen and the saved route are the same components. The in-session screen becomes `<SectionReport historyId={…} />` once Phase 1 supplies the id.
3.4 Walk adapter `sectionHistoryToWalkSession(row, record)` supplies qids, first answers, BR answers and the saved credited answer per question. `SectionReviewWalk` gets a prop to grade from the saved credited answer instead of the current bank (`question.correctAnswer`), and labels current wording as current. A question the bank no longer has shows the saved outcome with an explicit "question text is no longer available", never an indefinite loading state. The walk stays read-only.
3.5 Old result URLs. `/testing/attempts/section/lr/:id` resolves the id against `section_history` first, then against completed resume records. A history id redirects to the report. A resume-only id keeps the existing score-only page, relabeled "saved summary, question detail was not kept", and offers no review walk it cannot support. No existing result becomes unavailable. Protected "View section report" goes to the report route.
3.6 Student copy goes through the teaching voice and any correction is logged in `wiki/COPY-CORRECTIONS.md`.

Verification: open a legacy-path section and a protected-path section as a test student and confirm both land on the same report; screenshots at the full responsive matrix, light and dark.

## Phase 4: review queue and detail (F8, R5, R14)

4.1 The journal keeps its existing model of one episode per question, with notes and flags. After Phase 1, every miss from a legacy standalone section is journaled once at close-out, so the journal already carries missed and skipped questions. Section items add only what the journal does not hold: regret (right first, wrong in blind review) and changed-in-blind-review, built per history row from the saved record, so two sittings produce two such items.
4.2 Journal events from the new close-out carry the sitting id in their history item. `buildReviewQueue` preserves sitting ids on its aggregated item before it collapses events. Cross-source merge, which does not exist today because `ReviewQueuePage.tsx` concatenates sources, is a new `mergeSectionIntoJournal` in `reviewQueueModel.ts`: when a section item and a journal item share a question and the journal item carries that sitting id, they merge into the journal item (notes and flags kept, reasons added, `href` pointing at the report and the walk position). A journal event without a sitting id (historical, protected, or from another path) is never matched by question alone; the items stay separate and the section item shows only its regret or changed signal, so no identity is guessed.
4.3 The release rule applies: sealed sections contribute nothing.
4.4 `SectionReviewDetail` becomes a redirect to the report with the walk at that question, so old queue links keep working.
4.5 Tests: an answered miss from the new close-out appears once with a link to the report; the same question missed in two sittings is one journal episode plus separate regret items; a historical event without a sitting id does not merge by question; counts on the Review hub equal the queue; sealed rows are absent.

## Phase 5: converge the read paths and finish (F10)

5.1 `listPracticeSectionAttempts`: after Phase 1 every standalone legacy section has a `section_history` row at close-out, so `isCompletedLrMirror` only has to cover rows from before this change. Keep it for those. Remove nothing historic. The list also reads the caller's sittings (owner SELECT is allowed) and hides any old pool-derived record named as `adopted_from_record_id`, including a stale local copy uploaded by the local-to-account loop at lines 76-95, which must skip adopted ids rather than re-upload them. Sitting-keyed records are listed from sitting state (open: in progress with its resume link; closed: completed, linked to its history id), not from the mirror heuristic. Tests: the list and its resume links before adoption, after adoption, after completion, and with a stale local copy of the adopted record present; each shows exactly one entry for the section.
5.2 Add a conformance test: one legacy close-out and one protected close-out produce rows with the same `SectionQuestionStat` fields and a present `analysis_json`.
5.3 Update `src/pages/CONTEXT.md` and `src/components/drill/CONTEXT.md` with the new ownership (who writes the row, who writes the record, who reads both). Log the change in `wiki/log.md` of the vault.

## Decisions for Joshua, not part of this build

Decided by Joshua 2026-11-18.

1. Protected path rollout: staged, after this build ships. Turn it on for one or two current students first, watch about a week of real sittings, and if close-outs and reports match, turn it on for everyone and retire the legacy `full-section` runner for standalone sections. This plan flips no capability.
2. Second teacher email after blind review: no, for now. The report and teacher panel already show the blind review diagnosis. Revisit if checking for finished blind reviews becomes manual work.
3. Teacher release for a section whose blind review is never done: yes, as a small follow-up after this build, not inside it. It sits on the release rule this plan builds.
4. Existing journal and drill-history exposure before blind review: yes, close it, as its own separately reviewed plan after this rebuild ships.

## Out of scope

Drill and practice sets, Smart Drill, RC section internals, the practice-test sitting flow (only its report link and release rule change), the guided drill close-out, Lovable edge functions beyond decision 2, any change to the protected writer contract or to `commitSessionAttempts`, deferring journal or attempt writes.

## Risks and how the plan answers them

| Risk | Answer |
|---|---|
| A second tab with different answers disagrees with the saved row | One transaction, first writer wins on the sitting id; the second tab receives `conflict` and shows the saved result |
| Two tabs invent different sitting ids for an old in-flight section | The server owns the id: `open_section_sitting_v1` is serialized by a unique index and every tab receives the winner |
| A stale tab overwrites a newer sitting, or a restart races a close-out | One advisory lock per `(user, pool_key)` for open, restart and close-out; state rechecked under it; restart conditional on the expected generation; closed sittings return their saved history before any stale check |
| The sitting or review-record table is writable directly | RLS on, owner/admin SELECT only, all client writes revoked, tested directly (R24) |
| A retry duplicates attempts or journal items | Deterministic attempt ids, and journal items written only by the call that created the history row, in one transaction |
| A forged payload writes to another student or to a protected row | `user_id` and `class_id` are derived on the server, assignment ownership is checked, protected and practice-test markers are rejected, conflict lookups are scoped to the caller, explicit grants and a pinned search path |
| The row is visible before blind review on an assigned section | One release rule on every reader of `section_history` and the record; journal exposure that exists today is named and left to decision 4 |
| A BR writer cannot update protected rows | BR never touches `section_history`; it lives in `section_review_records`, written by a function |
| A student marks blind review complete without doing it | The table accepts writes only through the function, which sets `br_completed_at` itself |
| Late blind review is graded against a changed answer key | Graded from the saved credited answer inside the function, tested with a changed key |
| Historic BR attempt rows skew analytics | 2.7 filters, does not delete |
| Shared callers of `commitSessionAttempts` regress | They are not changed; regression tests assert their current blocking behavior |
| An old link stops working | 3.5 resolves history and resume ids and keeps a truthful fallback |
| `Drill.tsx` edits collide with other sessions | New modules and server functions; touch `Drill.tsx` only at the close-out call, section start and the post-section screens |
| Phase 0 finds the audit wrong | Stop and revise before Phase 1 |

## Definition of done

1. Phase 0 answers recorded.
2. Closing a standalone section writes exactly one `section_history` row, one attempt per answered question and one journal item per miss in one transaction before any post-section screen, and survives a failed first call, a lost acknowledgment, a reload, two tabs and a second tab with different answers.
3. The server owns the sitting id, user id and class id, and the forged-input tests in 1.1 pass.
4. Prediction and blind review are saved in `section_review_records` only through the two functions; blind review writes no `attempts` rows, is graded from the saved credited answer and can be done after the first results screen.
5. A protected-path section and a legacy-path section both open the same report, with the diagnosis version labeled and the review walk graded from the saved answer.
6. The review queue shows a section question once, with regret and BR-changed reasons added and no merge by question alone.
7. Every reader of `section_history` and the record hides an assigned section's outcome until blind review is complete, and practice-test legs stay sealed. The journal and attempts exposure that exists today is documented and unchanged.
8. Every old result URL still resolves.
9. Practice-test legs, practice sets, guided drills and Smart Drill behave as before, proved by regression tests.
10. `npm run typecheck`, `npm run test` pass, and the new tests are named in the PR.
11. Screenshots for both paths at the responsive matrix, light and dark.

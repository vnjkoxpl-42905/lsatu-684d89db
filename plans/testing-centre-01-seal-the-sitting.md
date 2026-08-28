# Testing Centre change 1: seal the sitting (no reveal until the whole test is over)

_Revised after Codex adversarial review round 1 (see plans/testing-centre-review-log.md)._

Priority: **do this first.** Highest leverage of the five Testing Centre changes:
smallest diff, and it repairs the one invariant the room is built on. It also fixes a
live scoring bug found in review: `section_history.user_id` is nullable with no
default and no trigger (confirmed in `supabase/migrations/20251020135043_*.sql` and
`20260406070119_*.sql:42`), and the current insert in LRSectionResults omits it,
while `readLrLegResult` filters `.eq('user_id', userId)` — so LR leg readback most
likely never matches in production today.

## Repo conventions that bind this work

- Repo root: `~/ai-os/projects/lsatu`. Package manager npm. TS strict mode is OFF; do not flip it.
- Before pushing: `npm run typecheck` and `npm run test` must pass. Push with `bash .claude/safe-push.sh`, never raw `git push`.
- Any change to `src/pages/` or `src/components/` is not done until viewed running in the browser (dev server `npm run dev` on port 8080 + browser tool, screenshot as evidence). This is a hard gate.

## The problem

The Testing Centre ([TestingCentre.tsx](src/pages/TestingCentre.tsx)) promises, in copy that
renders on screen: "Nothing is revealed until the whole sitting is over"
(TestingCentre.tsx ~line 148, PracticeTestRun.tsx ~line 322). The promise is broken on both leg types:

1. **LR legs.** A practice-test LR leg launches `/drill` in `full-section` mode
   (`lrLegLaunch` in [practiceTestRunner.ts](src/lib/practiceTestRunner.ts) ~line 52). When the student finishes
   the section, [Drill.tsx](src/pages/Drill.tsx) renders `<LRSectionResults>` (~line 2646-2659): full
   score, per-question-type accuracy, difficulty breakdown, and review affordances,
   mid-sitting. Worse, blind review is enabled for `full-section` mode
   (`brEnabled`, Drill.tsx ~line 345), so BR selection/flow screens can also appear
   between sections of a sitting.
2. **RC legs.** The RC leg launches `/rc` with `reveal=end_of_set` (correct: no
   feedback inside the set), but on submit [RcPlayer.tsx](src/features/rc/pages/RcPlayer.tsx) (~line 398)
   navigates to `/rc/results/:sessionId`, which shows the score. Legs run in
   published section order (`buildPracticeTests` sorts by section number,
   [practiceTest.ts](src/lib/practiceTest.ts) ~line 167), and RC is frequently section 1 or 2 of a PrepTest,
   so this reveals a score with two sections still to sit.

Mid-sitting score knowledge changes how a student sits the remaining sections. It is
the difference between a practice test and three drills.

## The trap you must not fall into

`LRSectionResults` is not just a display component. Its mount effect
([LRSectionResults.tsx](src/components/drill/LRSectionResults.tsx) ~lines 152-232) is what **inserts the
`section_history` row** and logs wrong answers into the Wrong Answer Journal
(via `logWrongAnswer` from `@/lib/wajService`). The sitting's scorer
(`readLrLegResult` in practiceTestRunner.ts ~line 113) reads that exact row back.
If you simply skip rendering `LRSectionResults` inside a sitting, the leg result is
never written and every LR leg reads back as "not finished".

RC does not have this trap: `completeSession(sessionId)` is called in RcPlayer's
submit handler **before** navigating to the results page, so the row exists whether
or not the results page renders.

## The change

### Step 1 — extract LR result persistence out of the results screen

Create `src/lib/sectionHistorySave.ts`:

- Move the body of the save effect from LRSectionResults.tsx (~lines 152-232) into an
  exported async function, e.g.
  `persistSectionResults(args: { session, brResults, classId, userId, stats, questionBank })`.
  Keep the insert payload (`class_id`, `pt`, `section`, `mode`, `initial_*`,
  `br_*`, `total_time_ms`, `avg_time_ms`, `unanswered_count`, `by_qtype_json`,
  `by_difficulty_json`, `br_used`) with one addition: **set `user_id: userId`
  explicitly.** The column is nullable with no DB default and no trigger, and the
  sitting's readback matches on it. Do NOT rely on a claimed default — there is none.
  (`completed_at` does have a `now()` default; leave it to the DB.)
- The `stats` computation currently lives inside LRSectionResults (a `useMemo`
  over `session.attempts`). Extract that computation too (a pure
  `buildSectionStats(session, questionBank)` in the same lib file) so both the
  component and Drill.tsx can produce identical rows.
- **Do NOT move the WAJ logging into `persistSectionResults`, and delete it from
  LRSectionResults — but preserve the unanswered-question behaviour.**
  `commitSessionAttempts` (Drill.tsx ~line 1251 region) already journals every
  ANSWERED miss, and the LRSectionResults loop (~lines 203-229) journals every
  non-correct stat again — including UNANSWERED questions, which
  `commitSessionAttempts` skips (no `selectedAnswer`). So the deletion alone would
  both fix the duplicate and silently stop journaling unanswered questions. Decision:
  unanswered questions in a timed section stay in the journal (they are misses the
  student needs to see). In the finalization path, after `commitSessionAttempts`, log
  ONLY the unanswered questions to WAJ (the entries commitSessionAttempts skipped) —
  answered misses exactly once, unanswered exactly once, standalone behaviour
  preserved minus the duplicates. Before deleting the component's loop, confirm every
  route that mounts LRSectionResults runs the finish path first.
- Refactor LRSectionResults to call `persistSectionResults` from its effect (guarded by
  its existing `savedRef`) so the standalone full-section path is behaviourally
  unchanged apart from the two fixes above (user_id set, WAJ logged once).

### Step 2 — route a sitting's LR leg straight back to the invigilator

**Step 2a — carry run and leg identity in launch state (prerequisite, do it first).**
The closeout key below is `...:<runId>:<legIndex>`, but today `LrLegLaunch.state`
([practiceTestRunner.ts](src/lib/practiceTestRunner.ts) ~line 42) carries only
`mode`, `config`, `returnTo`, and `practicingLabel` — Drill has no run id and no leg
index, so the key cannot be constructed. Parsing them back out of `returnTo` is not
acceptable: change 4 must stop trusting that string entirely (see below). So, in THIS
change:

- Extend `LrLegLaunch.state` with an explicit `ptRun: { runId: string; legIndex: number }`
  and populate it in `lrLegLaunch(run, leg)` from the run and the leg's index in
  `run.legs`. Give `lrLegLaunch` the leg index as an argument rather than re-deriving
  it by search — `legs` can contain two legs of the same section.
- Read it in Drill.tsx alongside the other route state. Treat it as optional at the
  type level (a standalone drill has none) but REQUIRED whenever `inSitting` is true;
  if `inSitting` and `ptRun` is missing, that is a bug, not a fallback — log it and
  take the `noResult` path rather than inventing a key.
- Do the same for the RC leg's launch state so change 4 has persisted attribution to
  read (change 2 is what mirrors both into URL parameters and the server row; this
  step only guarantees the identity exists in memory from the first leg onward).

In Drill.tsx:

- Derive one flag near where `drillReturnTo` is computed (~line 150):
  `const inSitting = !!drillReturnTo?.startsWith('/testing/test/');`
  This flag decides ROUTING only (where to navigate, whether to show score UI).
  It must never be the basis of a clock or integrity decision — change 4 derives
  those from persisted attribution instead.
- Gate blind review off inside a sitting: change `brEnabled` (~line 345) to
  `(sessionMode === 'full-section' || sessionMode === 'type-drill') && !inSitting`.
- On section finish, when `inSitting`: await `persistSectionResults(...)` and then
  navigate to `drillReturnTo`, never rendering `LRSectionResults`, BR selection, or
  any score UI. The cleanest seam is `handleFinishSection` (~lines 2121-2201), which
  already supports `options.returnToAfterFinish` — persist first, then reuse that
  navigation. The ORDER is load-bearing: **persist, then navigate.**
- **The whole sitting closeout must be failure-proof, not just the last call.**
  `handleFinishSection` runs `commitSessionAttempts` (~line 2156) before your persist
  call, and it can throw. Wrap the entire in-sitting closeout so that ANY throw —
  attempts commit or history persist — is caught, and navigation back to the
  invigilator happens in a `finally`. Add a one-shot guard (a ref) so the closeout
  cannot run twice from a double-click or a re-render. The invigilator's existing
  `noResult` branch (PracticeTestRun.tsx ~lines 280-305) handles a missing row
  honestly ("go back" / "mark unfinished"); a thrown error trapping the student on a
  dead drill screen is worse.
- **Closeout ordering and retryability.** Two review-confirmed constraints:
  1. `handleFinishSection` calls `finalizeDrillResumeSession` (marks the resumable
     session complete) on its way to the results screen. In the sitting closeout,
     the resume record must be finalized ONLY AFTER the `section_history` insert
     succeeds — otherwise a failed persist plus the `finally` navigation leaves a
     completed resume row that re-entry rejects, and the leg can never be scored.
     Reorder: attempts → history persist → finalize resume → navigate.
  2. A retried closeout must not double-write the earlier phases, and phase-level
     flags are too coarse: `commitSessionAttempts` can save SOME attempts and then
     throw, so a boolean `attemptsCommitted` would re-insert the ones that succeeded.
     Persist closeout progress under its OWN localStorage key
     (`lsatu:pt-closeout:<userId>:<runId>:<legIndex>` — do NOT try to graft fields
     onto the existing drill resume record; its persisted schema parses only known
     fields and extending it is surgery this change does not need):
     `{ savedQids: string[], wajQids: string[], historySaved: boolean }`, updated as
     each write lands. Retry skips qids already in the lists and skips the history
     insert when `historySaved` (the change-2 unique index backstops that one
     anyway). Delete the key once the whole closeout succeeds. No server-side
     transaction machinery — per-question bookkeeping is enough at this scale.
  3. **A WAJ failure is unfinished closeout work, not a warning.**
     `commitSessionAttempts` (Drill.tsx ~line 1251) counts WAJ failures into
     `wajFailed` and logs them, but only `attemptErrors` throws — so today it can
     return normally having journaled nothing. If the sitting closeout treats that
     return as success, it finalizes the resume record and deletes the closeout key
     while `wajQids` is still short, and those misses are gone for good. Therefore:
     compute the EXPECTED WAJ set for the leg (every non-correct attempt, plus the
     unanswered questions this change now journals) and require `wajQids` to cover it
     before finalizing the resume record or deleting the key. Have
     `commitSessionAttempts` return the qids it actually journaled (not just a count)
     so the closeout can record them precisely.

     **WAJ coverage gates the `section_history` write — it does not follow it.** The
     obvious ordering (save history, let the journal catch up later) makes the retry
     unreachable: `PracticeTestRunPage` treats the presence of a `section_history` row
     as "this leg is finished" and advances to the next leg, so the student can never
     re-enter this leg to retry the missing entries. The final order is therefore:
     **attempts -> WAJ coverage complete -> history persist -> finalize resume ->
     navigate.** If WAJ coverage is incomplete, do NOT write the history row: keep the
     closeout key, still navigate back to the invigilator in the `finally` (never trap
     the student), and let re-entry resume the closeout and retry only the missing
     qids. The leg reads as unfinished until then, which the invigilator's existing
     `noResult` branch already renders honestly ("go back" / "mark unfinished"). An
     unscored-but-recoverable leg is strictly better than a scored leg with misses
     silently missing from the journal forever.

### Step 3 — route a sitting's RC leg straight back

In RcPlayer.tsx submit handler (~line 398): when `returnTo` starts with
`/testing/test/`, `navigate(returnTo)` instead of `/rc/results/:sessionId`.
The session is already completed in the DB by that point. Leave the non-sitting
path exactly as is (results page, with returnTo carried in the query string).

### Step 4 — do not let the score report leak early either

Verify (and fix if needed) that `PracticeTestRunPage` shows running per-leg scores
nowhere before `status === 'complete'`. Today the leg rows print `correct/questionCount`
for completed legs mid-sitting (PracticeTestRun.tsx ~lines 264-268) and the resume
list prints "`X/Y so far`" (TestingCentre.tsx ~line 195). Change both to show
progress without score: completed legs read "finished" (no numbers) until the whole
run is `complete`; the resume list drops the `correct/total` fragment. The full
numbers appear only in `ScoreReport`.

## Tests

- New: `src/lib/sectionHistorySave.test.ts` — `buildSectionStats` produces the same
  aggregate shape the old inline code did (feed a small fake session with 3 attempts,
  assert by_qtype/by_difficulty/score fields of the row builder).
- New or extended: a Drill-level test is impractical (Drill.tsx is huge); instead add
  `src/lib/practiceTestRunner.test.ts` coverage for a tiny exported helper
  `isSittingReturn(path: string | null | undefined): boolean` — add that helper and use
  it in Drill.tsx, RcPlayer.tsx, and anywhere else the `/testing/test/` prefix is
  checked, so the prefix lives in exactly one place.
- Update `src/pages/TestingCentre.test.tsx` if the resume-list copy change breaks it.
- Run the full suite: `npm run test`. Then `npm run typecheck`.

## Browser verification (mandatory)

Sit a real mini-run in dev: begin a practice test, finish section 1 (answer a few,
submit), and capture screenshots proving (a) no score/results screen appears between
sections, (b) the invigilator shows the leg as finished without a number, (c) after the
final leg the ScoreReport shows the full breakdown, (d) an RC leg submit lands back on
the invigilator. Also verify a STANDALONE full section (Testing Centre door 1, and the
drill hub path) still shows LRSectionResults and still writes section_history.

## Out of scope here

Post-sitting review of individual questions (change 3), server persistence (change 2),
clock behaviour on re-entry (change 4).

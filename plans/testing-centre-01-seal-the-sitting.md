# Testing Centre change 1: seal the sitting (no reveal until the whole test is over)

Priority: **do this first.** Highest leverage of the five Testing Centre changes:
smallest diff, and it repairs the one invariant the room is built on.

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
  `persistSectionResults(args: { session, brResults, classId, stats, questionBank, extra? })`.
  Keep the exact insert payload (`class_id`, `pt`, `section`, `mode`, `initial_*`,
  `br_*`, `total_time_ms`, `avg_time_ms`, `unanswered_count`, `by_qtype_json`,
  `by_difficulty_json`, `br_used`) byte-for-byte — the readback and analytics
  widgets depend on these columns. `user_id`/`completed_at` are set by DB
  defaults today; do not start setting them client-side.
- The `stats` computation currently lives inside LRSectionResults (a `useMemo`
  over `session.attempts`). Extract that computation too (a pure
  `buildSectionStats(session, questionBank)` in the same lib file) so both the
  component and Drill.tsx can produce identical rows.
- Keep WAJ logging inside `persistSectionResults` — wrong answers from a sitting
  SHOULD land in the journal; that is data capture, not reveal.
- Refactor LRSectionResults to call these functions from its effect (guarded by its
  existing `savedRef`) so the standalone full-section path is behaviourally unchanged.

### Step 2 — route a sitting's LR leg straight back to the invigilator

In Drill.tsx:

- Derive one flag near where `drillReturnTo` is computed (~line 150):
  `const inSitting = !!drillReturnTo?.startsWith('/testing/test/');`
- Gate blind review off inside a sitting: change `brEnabled` (~line 345) to
  `(sessionMode === 'full-section' || sessionMode === 'type-drill') && !inSitting`.
- On section finish, when `inSitting`: await `persistSectionResults(...)` and then
  navigate to `drillReturnTo`, never rendering `LRSectionResults`, BR selection, or
  any score UI. The cleanest seam is `handleFinishSection` (~lines 2121-2201), which
  already supports `options.returnToAfterFinish` — persist first, then reuse that
  navigation. Whatever seam you use, the ORDER is load-bearing: **persist, then
  navigate.** The invigilator (`PracticeTestRunPage`) reads the row the moment the
  route changes back.
- If the persist call throws (network), still navigate back. The invigilator's
  existing `noResult` branch (PracticeTestRun.tsx ~lines 280-305) handles a missing
  row honestly ("go back" / "mark unfinished"); a thrown error trapping the student
  on a dead drill screen is worse.

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

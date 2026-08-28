# Testing Centre change 4: the clock is real — no resets, no pauses, hard stops

Priority: fourth. Independent of changes 2/3; do after change 1 (it touches the same
Drill/RcPlayer seams and will conflict if done in parallel).

## Repo conventions that bind this work

- Repo root: `~/ai-os/projects/lsatu`. npm; TS strict OFF. `npm run typecheck` +
  `npm run test` before push; push via `bash .claude/safe-push.sh`. Browser verification
  of page/component changes is a hard gate.

## The problem

A sitting's clock is currently advisory, three different ways:

1. **Leaving an LR leg resets its 35:00.** `lrLegLaunch`
   ([practiceTestRunner.ts](src/lib/practiceTestRunner.ts) ~lines 52-71) builds the timer with
   `elapsedMs: 0, startedAt: Date.now()` at every launch, and `begin()` in
   [PracticeTestRun.tsx](src/pages/PracticeTestRun.tsx) (~lines 194-215) re-stamps `leg.startedAt`
   unconditionally on every press, including "Return to section N". Leave a section at
   30:00 elapsed, come back, and you have a fresh 35:00. That is a scoring exploit and a
   fidelity failure in one.
2. **The LR runner allows pausing.** Drill's timer UI has pause/resume (Drill.tsx
   ~line 3607 renders a resume button). Inside a sitting there is no pause on the
   real test.
3. **The RC clock resets on reload and never enforces.** RcPlayer holds `elapsed` in
   `useState(0)` ([RcPlayer.tsx](src/features/rc/pages/RcPlayer.tsx) ~line 278) — a reload zeroes
   it — and the budget is soft: `overBudget` (~line 293) only flips the display into
   `+m:ss` overtime. Under test conditions the section ends when the clock does.

The break clock, by contrast, is already right: `breakStartedAt` is an ISO stamp in the
run, so it survives reloads (PracticeTestRun.tsx BreakScreen). Use it as the model.

## Design principle

Inside a sitting, **wall clock is the truth**. The section's clock starts when the leg
starts (`leg.startedAt`, already an ISO stamp saved before navigation) and runs whether
or not the tab is open. Remaining time is always
`paceSeconds - (now - Parse(leg.startedAt))`. No stored elapsed counters to drift, no
pause state to reconcile. Untimed pace is exempt from all of this.

## The change

### Step 1 — startedAt becomes stamp-once

In PracticeTestRun.tsx `begin()`: only stamp `startedAt` when the leg does not already
have one. On re-entry ("Return to section N"), reuse the existing stamp.

### Step 2 — LR leg resumes with the wall-clock remainder

- In `lrLegLaunch`, compute from the leg: if `leg.startedAt` exists, set the timer's
  `elapsedMs` to `Date.now() - Date.parse(leg.startedAt)` (clamped to
  `[0, paceSeconds*1000]`) instead of 0. First entry (fresh stamp) still yields ~0.
- Add `practiceTest` sitting context to the launch state if change 1/2 have not already
  (`isSittingReturn(drillReturnTo)` is the flag inside Drill).
- In Drill.tsx, when in a sitting: hide/disable the pause control for the section timer
  (find where the timer pause UI renders near the ~3607 resume button and gate it), and
  do not honour a paused state from navigation.

### Step 3 — LR hard stop

Investigate how full-section mode currently behaves at 0:00 (search Drill.tsx and
`src/hooks/useTimer.ts` for expiry handling; a grep for `expire`/`timeUp` finds nothing
today, so expect "clock shows 0, student keeps answering"). Inside a sitting at a timed
pace: when remaining hits 0, force-finish the section through the exact same finish path
change 1 built (persist results, then navigate back to the invigilator). Unanswered
questions count wrong via the existing unanswered accounting. Show a brief
non-interactive "Time is up on this section" state (a simple full-screen card for ~2s or
a confirm-free transition) rather than silently teleporting. Outside a sitting, change
nothing.

### Step 4 — RC leg: persistent clock and hard stop

- Persist the RC clock against the wall: the sitting's RC leg also has `leg.startedAt`.
  Pass the deadline into the player: when `returnTo` is a sitting (use the shared
  `isSittingReturn` helper), derive remaining from `startedAt` + the section budget
  rather than the in-memory `elapsed`. Concretely: add an optional
  `startedAt=<iso>` query param in `rcLegHref` (practiceTestRunner.ts ~line 78), and in
  RcPlayer compute `elapsed` seeded from it. Reloads then cost time instead of
  refunding it.
- Hard stop: in a sitting, when the pooled budget reaches 0, auto-submit the set through
  the existing submit handler (the one at ~line 380-400 that calls `completeSession` and,
  after change 1, navigates back to the invigilator). Unanswered questions are simply
  unanswered. Outside a sitting, keep the soft overtime display unchanged.

### Step 5 — the invigilator tells the truth about an expired leg

In PracticeTestRunPage, when a leg has a `startedAt` older than its full budget and no
result row was found (`noResult`), the copy currently implies the student can "go back
and finish it". With hard stops, re-entering an expired timed leg would immediately
force-finish, which is correct but should be said: adjust the noResult copy for that case
to offer "Submit it as it stands" as the primary action.

## Tests

- Unit-test the remaining-time math as a pure function (put
  `legRemainingSeconds(leg, pace, now)` in practiceTest.ts or practiceTestRunner.ts):
  fresh leg ≈ full budget; re-entry after 10 minutes at standard = 25:00; past-deadline
  clamps to 0; untimed returns null.
- Unit-test stamp-once `begin` behaviour if it is extractable; otherwise cover via the
  launch builder: `lrLegLaunch` with a pre-stamped leg yields nonzero `elapsedMs`.
- `npm run test`, `npm run typecheck`.

## Browser verification (mandatory)

In dev: start a sitting leg, note the clock, reload the tab — the clock must come back
lower, not reset. Leave to the invigilator and return — same. Set a short artificial
budget (temporarily, or use double-time and dev-tools time travel if impractical) to
watch a hard stop fire and land back on the invigilator with the leg scored. Confirm a
standalone (non-sitting) full section still pauses and still runs soft overtime.
Screenshots of each.

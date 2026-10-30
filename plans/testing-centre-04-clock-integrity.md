# Testing Centre change 4: the clock is real — no resets, no pauses, hard stops

_Revised after Codex adversarial review round 1 (see plans/testing-centre-review-log.md)._

Priority: **third — swapped ahead of the conversion-tables change in review round 3**,
so that no permanent official score snapshot is ever minted from a sitting whose clock
could still be paused or reset. **Hard dependency: change 2** — review round 2 resolved the circular
ordering by moving the pure deadline math (`legRemainingSeconds`, `remainingMs` in the
timer config, `getTimerConfigForDrillRoute` support) INTO change 2, along with the
URL-param reload reconstruction and the RC session attribution this plan's clock reads.
This plan builds on top of those: stamp-once, pause removal, hard stops, RC wall-clock
derivation, expiry copy. Do after changes 1 and 2.

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
   unconditionally on every press, including "Return to section N".
2. **The LR runner allows pausing.** Drill's timer UI has pause/resume (Drill.tsx
   ~line 3607 renders a resume button).
3. **The RC clock resets on reload and never enforces.** RcPlayer holds `elapsed` in
   `useState(0)` ([RcPlayer.tsx](src/features/rc/pages/RcPlayer.tsx) ~line 278) driven by a
   `setInterval` increment — a reload zeroes it, and background-tab throttling loses
   time — and the budget is soft: `overBudget` (~line 293) only flips the display into
   overtime.

The break clock, by contrast, is already right: `breakStartedAt` is an ISO stamp in the
run. Use it as the model.

## Two facts the review established — build around them

- **The live timer ignores `elapsedMs`.** `getTimerConfigForDrillRoute`
  ([drillRouteState.ts](src/lib/drillRouteState.ts) ~lines 91-117) derives the countdown purely from
  `config.timer.mode` → a fixed `durationMs`; the timer then starts fresh from
  `performance.now()` on mount. Writing a nonzero `elapsedMs` into the launch config
  changes nothing. The fix must flow through the config derivation, not the launch
  payload.
- **`begin()` re-stamps and then launches with the STALE leg object.** Even with a
  stamp-once fix, `begin()` builds `next` and then must call
  `lrLegLaunch(next, next.legs[next.currentLeg])` / `rcLegHref(next, ...)` — passing the
  old `leg` variable hands the builders an unstamped leg and the remaining-time math a
  fresh clock.

## Design principle

Inside a sitting, **wall clock is the truth**. The section's clock starts at
`leg.startedAt` (ISO, saved before navigation) and runs whether or not the tab is open.
Remaining time is always `paceSeconds - (now - Parse(leg.startedAt))`, recomputed from
`Date.now()` — never accumulated by an interval counter. Untimed pace is exempt from
all of this. The `startedAt` the runners trust is the one in the persisted run (server-
backed after change 2), not a user-editable query param: a param is a hint for the
fast path, the run row is the authority the runner re-reads.

## The change

### Step 1 — startedAt becomes stamp-once, and the stamped leg is what launches

In PracticeTestRun.tsx `begin()`: stamp `startedAt` only when absent; after building
`next`, resolve `const stampedLeg = next.legs[next.currentLeg]` and pass THAT to
`lrLegLaunch` / `rcLegHref`.

**Call arity:** change 1 gives `lrLegLaunch` a required leg index (it stamps
`ptRun: {runId, legIndex}` into launch state). Every call site in this plan that still
reads `lrLegLaunch(run, leg)` / `rcLegHref(run, leg)` must pass the index —
`next.currentLeg` at the sites that advance the run. Check each one; the two-argument
form no longer type-checks.

### Step 1b — sitting status comes from persisted attribution, never from `returnTo`

**This governs every enforcement decision in this plan.** `isSittingReturn(returnTo)`
is a routing helper over `location.state` / a query string — mutable, student-visible,
and trivially removable. If it decides whether the hard stop applies, then clearing or
editing `returnTo` turns an attributed practice-test leg back into a standalone drill
with soft overtime and a pause button, while the leg still writes into the sitting and
still receives an official score. That is the whole integrity guarantee, defeated by
editing a URL.

The plan already refuses to trust a query param for `startedAtMs`. Apply the same
standard one level up, to the question of whether this is a sitting at all:

- Derive **sitting status, run id, leg index, and the leg deadline** from the persisted
  attribution — the `practice_test_runs` row plus the attribution columns change 2
  stores on `rc_drill_sessions` (RC) and the validated `ptRun`/`ptLeg` the change-2
  bootstrap resolves against the store (LR). If the persisted record says this session
  belongs to an in-progress run, it is a sitting, whatever the URL says.
- Derive the **canonical return path** from the run id too, rather than echoing back
  whatever `returnTo` contained.
- `isSittingReturn(returnTo)` keeps exactly one job: a cheap synchronous hint for
  ROUTING and score-UI suppression in change 1, on the fast path where launch state is
  present. It is never sufficient on its own to grant standalone behaviour.
- **Fail closed, and never invent a deadline.** If attribution is present but the run
  cannot be loaded, treat the leg as a sitting and enforce; do not fall back to
  standalone. The only sessions that get standalone treatment are those with no
  attribution at all. Critically, "enforce" must not mean "clamp the missing
  `startedAt` to now" — that hands out a fresh full-length clock and is more generous
  than the bug it replaces. With no authoritative deadline: **lock answering
  immediately** (the same frozen, reveal-nothing state the hard stop uses), show a
  plain "we could not load this sitting" message with a retry, and resolve the clock
  only once the run loads. The existing "clamp a future or absurdly old `startedAt`"
  rule applies ONLY to a value that is present and malformed; a valid old timestamp
  means the leg is EXPIRED, not garbage, and must run the hard stop rather than be
  clamped forward.

### Step 2 — LR remaining time (math shipped in change 2; this plan wires the behaviour)

`legRemainingSeconds`, the `remainingMs` timer-config field, and
`getTimerConfigForDrillRoute` support all land in change 2 (its Step 4). Here:

- Verify `lrLegLaunch` computes `remainingMs` from the STAMPED leg (Step 1's fix).
- In Drill.tsx, when in a sitting (**resolved per Step 1b from the validated run, not
  from `drillReturnTo`**): hide/disable the pause control and ignore any paused state
  from navigation.
- `remainingMs === 0` at launch means the leg is already expired: skip straight to the
  hard-stop path below rather than mounting a dead runner.

### Step 3 — LR hard stop

Full-section mode today has no expiry action (no `expire`/`timeUp` handling exists —
the countdown reaches 0 and the student keeps answering). Inside a sitting at a timed
pace: when the countdown reaches 0, force-finish through the exact closeout path change
1 built (one-shot guard, persist, navigate back to the invigilator). The closeout's
existing one-shot ref is the submission mutex — expiry firing while a manual finish is
in flight must be a no-op, and the DB-side partial unique index from change 2 makes a
duplicate row impossible even if both slip through. Show a brief "Time is up on this
section" state rather than silently teleporting. Outside a sitting, change nothing.

### Step 4 — RC leg: wall-clock, visibility-proof, hard stop

- In RcPlayer, for a sitting (**resolved per Step 1b from the session's persisted
  attribution, not from `returnTo`**): derive the clock as
  `Date.now() - startedAtMs` **on every tick and on every `visibilitychange`**, where
  `startedAtMs` comes from the session's persisted run/leg attribution (change 2 stores
  it on the `rc_drill_sessions` row and returns it through the session-load path —
  never trust a query param for the authoritative clock; clamp any fallback value that
  is in the future or absurdly old to "now"). Do not seed the existing
  interval-increment counter — replace the elapsed source for sitting sessions.
- Hard stop with a recoverable failure path (review round 2): at budget 0 in a sitting,
  **immediately lock answering** — a frozen, reveal-nothing state; the student can no
  longer change or enter answers regardless of what happens next — then run the submit
  handler (the ~line 380-400 path that calls `completeSession` and, after change 1,
  navigates back to the invigilator). The handler can fail (`saveError` return): the
  one-shot mutex must protect against DOUBLE submission, not against RETRY — keep
  answering locked, show the existing save-error surface with a retry action, and
  release the mutex only for that controlled retry. A permanently stuck player and a
  student answering past expiry are both failures. Outside a sitting, keep the soft
  overtime display unchanged.

### Step 5 — the invigilator tells the truth about an expired leg

When a leg's `startedAt` is older than its full budget and no result row was found
(`noResult`), the current copy implies the student can "go back and finish it". With
hard stops, re-entering immediately force-finishes. Adjust the noResult copy for the
expired case: primary action "Submit it as it stands" (which triggers the same
force-finish), secondary "Mark it unfinished and continue".

## Tests

- `legRemainingSeconds` and `drillRouteState` tests ship with change 2; extend them
  here only if this plan changes their behaviour.
- `lrLegLaunch` with a pre-stamped leg yields a reduced `remainingMs`; `begin()`
  stamp-once covered via the run-transition function if extractable.
- `npm run test`, `npm run typecheck`.

## Browser verification (mandatory)

In dev: start a sitting leg, note the clock, reload the tab — the clock must come back
lower, not reset (with change 2 in place; without it, verify re-entry from the
invigilator instead). Leave to the invigilator and return — same. Background the tab
for a minute mid-RC and confirm the clock caught up on return. Trigger a hard stop
(double-time pace with a temporarily shortened budget constant if needed) and confirm it
lands back on the invigilator with the leg scored exactly once. Confirm a standalone
full section still pauses and still runs soft overtime. Screenshots of each.

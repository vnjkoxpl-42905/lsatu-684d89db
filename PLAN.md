# Plan: rebuild the Read, Recall, Colour section launch surface
_Round 4 — revised by Claude after four Codex rounds_

Approved mockup: `docs/design-previews/rrc-section-launch-chamber.html`
(measured 1203px product surface with the drawer open, versus 2778px for the
page it replaces).

## Goal

A student opening a Read, Recall, Colour **section** currently lands on
`ActivityIntro`, a 2778px editorial page built for the typed Activities: two orb
circles, a rules list, a six-section briefing, and a Start button below the fold
that needs a sticky dock to compensate. The approved redesign replaces it with a
single ~1200px card that fits a laptop without scrolling: a stat strip of four
derived numbers, the four method steps as a segmented control that opens one at
a time, a run-history table with per-stimulus tick rows, and Start in the
top-right where it never needs a dock.

Scoped to **section mode only**. The eight typed Activities and the
section-library door keep the page they have.

## Release prerequisite (blocking)

Multi-run history depends on `20260903190000_a_report_card_per_attempt.sql`,
which drops the single-row primary key and adds `attempt_no`. If that column is
absent in prod, `listMyRecentSectionGrades`'s select fails, `isUnknownColumn`
swallows it and the helper returns `[]` — so there is **no graceful degradation
available**; the page would simply look like a student who has never run
anything. Round 1's "show the single most recent run and say so" was not
implementable. Confirm the migration is applied in production **before** this
ships. If it is not, applying it is part of this work, not a follow-up.

## Approach

### Structure

1. **Split `ActivityIntro`, do not early-return inside it.** The component calls
   `useReducedMotion`, `useRef`, two `useState`s and a `useEffect` near the top;
   a `mode === "section"` return placed before them would be a conditional hook
   and would break the moment mode changes without a remount. Instead:
   `ActivityIntro` becomes a hook-free wrapper that picks between
   `ActivityEditorialIntro` (today's body, moved verbatim, hooks intact) and the
   new `SectionLaunch`. Existing `ActivityIntro.*.test.tsx` assertions keep
   passing because they render through the wrapper.

2. **Do not use the name "Chamber" in code.** `worlds/chamber/` already exists as
   a different concept, and ADR 0009 says RRC is explicitly not a world. The
   nickname stays in `docs/design-previews/`; the identifier is `SectionLaunch`,
   the CSS namespace `.sl-`.

### Data

3. **Extend `listMyRecentSectionGrades` with a section filter, applied before the
   limit.** As it stands the helper orders and limits across *every* section, so
   filtering client-side can return zero runs for this section while real history
   exists just outside the window. Add an optional `sourceSection` argument
   applied as `.eq("source_section", …)` **before** `.order().limit(3)`. The
   existing no-argument callers are unaffected.

4. **Make failure distinguishable from emptiness.** The helper currently catches
   query errors and returns `[]`, which makes the "failed" state promised below
   unreachable. Give it a discriminated result (or a `throwOnError` option) so
   `SectionLaunch` can tell "nothing yet" from "we could not load this". Existing
   callers keep today's degrade-to-empty behaviour explicitly.

5. **`created_at` for ordering AND for the date shown.** `graded_at` is refreshed
   by a regrade, so a regraded old attempt overtakes a newer one and becomes
   "Last run", corrupting the trend. Tie-breaking cannot repair that. Add
   `created_at` to the select, order by it and then `(assignment_id, attempt_no desc)`,
   add it to the widened `Run` type, and render the history table's date column
   from it — otherwise ordering is stable while the dates beside it still move.

6. **Scope history by student id, not by which surface is rendering.** Admin RLS
   returns every student's rows, so no combination of surface flags is sufficient:
   an admin opening an assignment that happens to be their own would still get a
   source-filtered read across everybody. Two changes together:
   - the helper takes an optional `studentId`, set to `assignment.student_id`, so
     the query itself can never span students regardless of the caller's role;
   - `ActivityRunner` passes `showHistory={!preview && !viewingSomeoneElse}` so a
     teacher reading a student's page sees no history block at all.

   When `showHistory` is false, the block is omitted and no fetch is made.

### What the numbers mean

7. **Define "Recalled" precisely, so tests can pin it.** Recalled counts
   **saved stimulus rows over known authored slots**. An `ungraded` row *counts
   as recalled* — she did the work; the judge is what failed. A run whose slot
   count cannot be established is **excluded from the aggregate entirely**, not
   given a smaller denominator.

8. **Three tick states, named without colliding with the schema.**
   `SectionStimulusGrade.carried` already means the number of details retained,
   so the visual states are **`recorded`** (a row exists and was judged),
   **`not judged`** (`ungraded` set — a distinct state, never a gap), and
   **`missing`** (no row at that slot). The row label reads "stimulus by
   stimulus" and never "correct".

9. **Slot count and positions.** Prefer `stimuli_in_section`. Where it is absent,
   derive the slot count from the maximum `item_order` present rather than
   falling back to `stimuli_graded`, which knowingly undercounts a partial grade.
   Where neither is reliable, omit that run's tick row and exclude it from the
   Recalled aggregate. Place each tick at its `item_order`, never at its array
   index.

10. **Trend sign, and the right property path.** Elapsed time lives at
    `run.section.total_seconds`, not `run.total_seconds` — `Run` extends
    `SectionGradeStub`, whose timing sits inside `section` (`types.ts:493`, and
    `SectionRunHistory.tsx:165` reads it that way today). Runs are newest-first,
    so the delta is
    `runs[0].section.total_seconds − runs[runs.length-1].section.total_seconds`.
    Faster is negative, matching the mockup's `−6:52`. Test both directions.

11. **Target comes from the assignment**, using its `time_goal_minutes` and
    resolved accommodation, passed as a prop. Reading `goal_minutes` off the last
    grade would show a stale target to a student whose accommodation has changed.

### Content

12. **The four beats are `sections[1].steps`, not `sections[]`.** Verified against
    `read-recall-colour-section.instructions.json`: the briefing has **six**
    sections, and Read it / Say it back / Colour it / The Recall are the four
    `steps` inside "What you actually do." The strip renders the first section
    that has `steps`; "The full briefing" tab renders all six as prose; and the
    mockup's **"why this beat" panel is cut**, because no beat-to-rationale
    mapping is authored anywhere and the mockup was borrowing an unrelated
    section heading. The drawer shows the step's own body and nothing invented.

13. **Fix the literal-asterisk leak.** `renderInlineMarks` covers `briefing.lede`,
    `briefing.closer` and `section.body[]` but not `section.heading`, `step.label`,
    `step.body` or `demo.beats[].text` (`ActivityIntro.tsx:294–318`). Route all
    four through it, in both components.

### Surface

14. **States, explicitly.** Loading (skeleton — an empty flash reads as "you have
    never run this"), loaded-with-runs, loaded-with-none, and failed (a short
    line, never a silent zero). No fetch when there is no student identity or
    `showHistory` is false. Cancel in flight on unmount; ignore stale resolutions.

15. **Accessibility — both switches, not just the strip.** The page has two
    panel-swapping controls: the four-beat segmented strip, and the inner
    "This beat / The full briefing" switch. Both get the complete tabs pattern —
    `role="tablist"` / `role="tab"` / `role="tabpanel"`, arrow-key roving focus,
    `aria-selected`, visible `:focus-visible` ring — with independent tablists, or
    the inner one becomes a plainly labelled disclosure button. Keyboard traversal
    is tested for whichever is chosen.

16. **Teal accent** behind the `.sl-` wrapper per `DESIGN.md` — no inline hex, no
    change to the global token set, no change to `recall/section.css`.

17. **Tests.** New `SectionLaunch.test.tsx`: stat cells derive from grades, not
    constants; trend sign correct in both directions; an `ungraded` stimulus
    renders as not-judged and *counts* as recalled; a run with no reliable slot
    count draws no tick row and is excluded from the aggregate; ticks place by
    `item_order`; the beat strip comes from `steps` and is absent when no section
    has any; history is not fetched when `showHistory` is false; a failed fetch
    renders the failure line rather than the empty state; arrow keys move between
    tabs; no em dash. Update the two `ActivityIntro.copy.test.tsx` cases asserting
    the `mode === "section"` how-line, since that branch moves.

18. **Verification gate.** Per `CLAUDE.md` this is not done on the diff: dev
    server, a real section loaded, screenshot, and the full matrix **before** the
    push. The matrix is three axes, not one: viewport (narrow / mid / wide /
    sidecar-docked), **theme (light and dark)**, and **`prefers-reduced-motion`**.
    The mockup carries dark-theme tokens and the component tree already honours
    `useReducedMotion`, so a surface approved in one state can ship broken in the
    other two.

## Rejected from Codex's critique, with reasons

- **"Start with the drawer closed; beat-1-open contradicts the mockup and may
  invalidate the no-scroll claim."** Wrong on both halves. The mockup's script
  ends in `open(2)` and the published page renders with beat 3 open; the 1203px
  measurement was taken in that state. Default stays open-on-first-beat.
- **"Write a new `student_id + source_section` query."** Superseded rather than
  adopted: the existing helper is extended with a section filter (step 3), which
  keeps one bounded, RLS-scoped read instead of two.

## Key decisions & tradeoffs

- **Wrapper split vs. rewrite.** `ActivityIntro` serves 9 Activities plus teacher
  preview. Moving today's body wholesale into `ActivityEditorialIntro` keeps every
  existing assertion valid and keeps hooks unconditional. Cost: one extra file.
- **Heavy-ish read on load.** The helper carries `stimuli` (per-stimulus
  judgements, no transcript). Justified because without real positions the ticks
  would be decorative, which the no-fake-data rule forbids. Bounded server-side;
  the stat strip renders from summary fields so it does not block on it.
- **Beats are content-driven, so an author can break the strip.** A section with
  seven steps makes a seven-cell strip. Accepted rather than hardcoding four; the
  strip scrolls horizontally above five.

## Risks / open questions

- The mockup's "Watch the briefing · 2:14" transport strip is a placeholder; the
  synchronized demonstration is deferred and no audio exists. Render it only when
  the content declares an audio asset — never a dead play button.
- First-visit behaviour (auto-open once, remember after) is unresolved. This pass:
  open the first beat, no persistence.

## Out of scope

- The RRC **run screen** (`recall/SectionRunner.tsx`, `recall/SectionStage.tsx`,
  `recall/section.css`). Unchanged, at Joshua's instruction.
- The synchronized Briefing demonstration.
- Restructuring the triplicated instructions JSON.
- The eight typed Activities' intro pages and the section-library door.
- Amending ADR 0009 and writing `CONTEXT.md` glossary entries — permission not
  granted.

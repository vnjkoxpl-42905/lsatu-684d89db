# Intro to LR Curriculum Order Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder and rebalance the Intro to LR bootcamp so each page teaches one progressive concept: stimulus first, then argument anatomy, then indicators, conclusion verification, structure patterns, layered arguments, answer matching, and practice.

**Architecture:** Keep the existing Intro to LR route family and note shell. Change content order and page responsibilities in the note files and `introToLrPath.ts`, with small helper extraction only if it reduces duplicated note-section markup.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind utility classes, existing Intro to LR `main-conclusion` bootcamp components.

---

## Audit Findings

- The current first note, `src/bootcamps/main-conclusion/modules/lessons/notes/argument-basics.tsx`, is overloaded. It teaches stimulus triad, flaw example, logical gap simulation, premises, conclusions, indicators, reading sequence, 2-point conclusion check, peripheral information, concessions, valid/invalid, and an executive summary in one page.
- The first page title says `Argument Anatomy`, but the first conceptual need is simpler: what a stimulus is, how to read it, and why it is the source of the work.
- `Valid vs. Invalid` currently appears before the curriculum has given students a stable argument model. This is backwards: validity depends on knowing what premises and conclusions are.
- The current first page introduces full flaw/EXCEPT analysis too early. Flaws make sense after students know how the conclusion is supported.
- Indicator words are introduced before the student has a clean premise/conclusion map. Indicators should reinforce structure, not substitute for it.
- `Peripheral Information` and `Concessions in Action` belong after core argument anatomy and conclusion placement, not inside the opening lesson.
- `Where Conclusions Hide` repeats indicator/pivot ideas that should be sequenced after a dedicated argument-anatomy page and after the core indicator reference.
- `Layered Arguments` is correctly later than basic argument anatomy, but it currently also includes opposing view/concession ideas that should be introduced in a dedicated rebuttal/context lesson before layered chains.
- `PracticePathNotes` references drills that are not all in the current guided path (`3.5`, `3.8`, `3.9`), so it risks sending students toward unavailable or de-emphasized work.

## Target Learning Sequence

1. `Stimulus First`: what a stimulus is, what it can contain, and how to read it before looking at answer choices.
2. `Argument Anatomy`: what an argument is, how claims become conclusions, how premises support conclusions, and how non-argument stimulus text differs from argument text.
3. `Core Indicator Words`: FABS and conclusion indicators as clues after the structure is understood.
4. `2-Part Conclusion Check`: verify a conclusion candidate by checking opinion plus support.
5. `Structure Reading Drill`: sentence role practice after the anatomy and indicator concepts are established.
6. `Where Conclusions Hide`: first sentence, pivots, setup/evidence placement, and conclusion-location patterns.
7. `Rebuttal / Context`: opposing views, concessions, and author-response structure.
8. `Layered Arguments`: intermediate conclusions and premise stacks.
9. `Matching the Answer`: restatement, referent replacement, scope/force/direction preservation.
10. `Practice Path`: only list drills and practice sets that are actually available in the current path.

## File Responsibilities

- Modify `src/bootcamps/main-conclusion/modules/lessons/notes/argument-basics.tsx`: convert it into a focused `Stimulus First` page.
- Create `src/bootcamps/main-conclusion/modules/lessons/notes/argument-anatomy.tsx`: move premise/conclusion/anatomy content here and keep it progressive.
- Modify `src/bootcamps/main-conclusion/modules/lessons/notes/where-conclusions-hide.tsx`: remove duplicated basic indicator teaching and keep it focused on conclusion placement.
- Modify `src/bootcamps/main-conclusion/modules/lessons/notes/layered-arguments.tsx`: keep it focused on intermediate conclusions and support chains; move opposing/concession material out.
- Modify `src/bootcamps/main-conclusion/modules/lessons/notes/practice-path.tsx`: align listed drills with actual available guided path routes.
- Modify `src/bootcamps/main-conclusion/routes.tsx`: register `argument-anatomy` in `NoteLoader`.
- Modify `src/bootcamps/main-conclusion/content/introToLrPath.ts`: reorder the guided path and update titles/descriptions.
- Add or update tests near `src/bootcamps/main-conclusion/lib/__tests__/runner.test.ts` or create `src/bootcamps/main-conclusion/content/__tests__/introToLrPath.test.ts` to lock the new order.

## Task 1: Lock The New Path Order With Tests

**Files:**
- Create: `src/bootcamps/main-conclusion/content/__tests__/introToLrPath.test.ts`
- Modify: none

- [ ] Write a failing test that asserts the first five path IDs are `stimulus-first`, `argument-anatomy`, `core-indicators`, `two-part-check`, `structure-reading`.
- [ ] Add a test that asserts `valid`, `invalid`, `gap`, and `flaw` language does not appear in the first path item metadata.
- [ ] Run `npm run test -- src/bootcamps/main-conclusion/content/__tests__/introToLrPath.test.ts` and confirm failure.

Expected initial failure: the current first path ID is `argument-basics`, and no `argument-anatomy` path item exists.

## Task 2: Refocus The First Page On The Stimulus Only

**Files:**
- Modify: `src/bootcamps/main-conclusion/modules/lessons/notes/argument-basics.tsx`

- [ ] Rename the visible lesson title/subtitle to focus on stimulus reading, while keeping the route stable at `/lessons/notes/argument-basics`.
- [ ] Keep only these concepts on the page:
  - what the stimulus is
  - why the stimulus comes before answer choices
  - the three LR question parts: stimulus, question stem, answer choices
  - passive vs active stimulus reading
  - a short, non-flaw example that asks what the stimulus is saying
- [ ] Remove from this first page:
  - `Valid Argument vs. Gap`
  - `Premises: Statements of Fact`
  - `Conclusions: The Author's Claim`
  - `Indicator Drill`
  - `Main Conclusion: 2-Point Check`
  - `Peripheral Information`
  - `Concessions in Action`
  - `Valid vs. Invalid`
- [ ] Update the page summary to end with the student knowing: “The stimulus is the passage; read it first; identify whether it is merely information or an argument.”

## Task 3: Create The Argument Anatomy Page

**Files:**
- Create: `src/bootcamps/main-conclusion/modules/lessons/notes/argument-anatomy.tsx`
- Modify: `src/bootcamps/main-conclusion/routes.tsx`

- [ ] Build a new page using `IntroNotesShell`.
- [ ] Teach in this order:
  - what an argument is: a claim supported by reasons
  - not every stimulus is an argument
  - premises as support
  - conclusions as the author’s claim
  - `ARE / ARE NOT` premise and conclusion cards
  - a simple anatomy example with the conclusion and premises labeled
- [ ] Do not include validity, invalidity, flaws, concessions, or answer-choice matching on this page.
- [ ] Register `argument-anatomy` in `NoteLoader`.

## Task 4: Move Validity And Gap Later

**Files:**
- Modify: `src/bootcamps/main-conclusion/modules/lessons/notes/layered-arguments.tsx`
- Optional Modify: create a new note file only if the content becomes too large

- [ ] Move `Valid Argument vs. Gap` and `Valid vs. Invalid` out of the first note.
- [ ] Place them after the student has learned premise/conclusion anatomy and conclusion verification.
- [ ] Rename the language for LSAT clarity if needed:
  - prefer `Supported vs. Not Fully Supported` for beginner-facing pages
  - reserve strict `valid/invalid` language for a later explanation that explicitly says LR often tests whether support proves or merely suggests
- [ ] Keep the gap simulator only after premise/conclusion definitions have already appeared.

## Task 5: Rebalance Indicator And Conclusion Verification Pages

**Files:**
- Modify: `src/bootcamps/main-conclusion/modules/lessons/notes/where-conclusions-hide.tsx`
- Modify: `src/bootcamps/main-conclusion/content/introToLrPath.ts`

- [ ] Keep `Core Indicator Words` after `Argument Anatomy`.
- [ ] Keep `2-Part Conclusion Check` after indicator words.
- [ ] Remove repeated basic indicator explanations from `WhereConclusionsHideNotes`; let that page assume students already know indicators.
- [ ] Keep `Where Conclusions Hide` focused on placement patterns:
  - first sentence
  - after a pivot
  - between setup and evidence
  - after concession/rebuttal context, once that has been introduced

## Task 6: Create Or Reassign Rebuttal / Context Content

**Files:**
- Modify: `src/bootcamps/main-conclusion/modules/lessons/notes/where-conclusions-hide.tsx`
- Modify: `src/bootcamps/main-conclusion/modules/lessons/notes/layered-arguments.tsx`
- Modify: `src/bootcamps/main-conclusion/content/introToLrPath.ts`

- [ ] Move opposing view and concession teaching out of `LayeredArgumentsNotes`.
- [ ] Use existing references `rebuttal-structure` and `opposing-concession` as the main source for this phase.
- [ ] Make the sequence: placement basics first, then rebuttal/context, then layered arguments.

## Task 7: Align Practice Path With Real Available Work

**Files:**
- Modify: `src/bootcamps/main-conclusion/modules/lessons/notes/practice-path.tsx`
- Modify: `src/bootcamps/main-conclusion/content/introToLrPath.ts`

- [ ] Remove or relabel drills that are not in the current guided path, especially `3.5`, `3.8`, and `3.9`, unless those routes are confirmed live.
- [ ] Group practice by actual progression:
  - stimulus and sentence roles
  - indicators and conclusion candidates
  - first-sentence and rebuttal patterns
  - matching and pronoun replacement
  - capstone question bank
- [ ] Keep the practice page as a launchpad, not a new curriculum branch.

## Task 8: Update The Guided Path Source Of Truth

**Files:**
- Modify: `src/bootcamps/main-conclusion/content/introToLrPath.ts`

- [ ] Rename the existing first action to `Stimulus First` while preserving the current route if deep-link stability is preferred.
- [ ] Add the new `argument-anatomy` action immediately after stimulus-first.
- [ ] Reorder the early path to:
  - stimulus-first
  - argument-anatomy
  - core-indicators
  - two-part-check
  - indicator-recognition
  - structure-reading
- [ ] Keep existing route aliases intact for deep links.
- [ ] Update descriptions so each path item says one job only.

## Task 9: Visual Balance Pass

**Files:**
- Modify note files touched above
- Optional Modify: `src/bootcamps/main-conclusion/modules/lessons/notes/IntroNotesShell.tsx` only if repeated layout fixes are needed

- [ ] Keep each note page to 4-6 sections unless the page is explicitly a reference page.
- [ ] Ensure every section has one teaching job.
- [ ] Avoid giant interactive examples before the concept has been defined.
- [ ] Keep dense concept cards after explanatory prose, not before.
- [ ] Check mobile spacing for all cards and section headings.

## Task 10: Verification

**Files:**
- No new source edits unless tests reveal failures

- [ ] Run `npm run test -- src/bootcamps/main-conclusion/content/__tests__/introToLrPath.test.ts`.
- [ ] Run `npx tsc --noEmit -p tsconfig.app.json`.
- [ ] Run `npm run build`.
- [ ] Browser-smoke these routes:
  - `/bootcamp/intro-to-lr/lessons/notes/argument-basics`
  - `/bootcamp/intro-to-lr/lessons/notes/argument-anatomy`
  - `/bootcamp/intro-to-lr/reference/indicators-core`
  - `/bootcamp/intro-to-lr/reference/2-part-check`
  - `/bootcamp/intro-to-lr/lessons/notes/where-conclusions-hide`
- [ ] Confirm the integrated rail highlights the correct path item for every changed route.

## Acceptance Criteria

- The first page focuses only on the stimulus and does not teach validity, flaws, premise/conclusion anatomy, indicators, concessions, or answer matching.
- The second page explains what an argument is and introduces premises/conclusions in a clean order.
- Validity/gap language appears only after premise/conclusion anatomy and conclusion verification.
- Indicator words are taught as clues after argument anatomy, not as the foundation.
- Every guided-path item builds on the prior item.
- The practice path lists only live or intentionally retained drills.
- Existing deep links continue to resolve.

## Goal

Make every place a real LSAT-style question (stimulus + question stem + 5 choices A–E) is presented inside a bootcamp pop up in the **same shell as LR Smart Drill** (`OfficialQuestionPane` look — white paper card, A/E choices with eliminate dots, header strip, footer Submit/Next). Today, only Principle & Flaw uses that format (via `InlineQuestionViewer`); Main Conclusion's Capstone and Simulator Question Bank, plus any other bootcamp MCQ surfaces, render with their own card styles.

> Scope: **only standard 5-choice LSAT MCQ surfaces** are unified. Specialty drills that aren't 5-choice LR questions (X-Ray Scan, Role Labeler, Conclusion Picker, Pronoun Unpacker, Sleight-of-Hand yes/no, Drag-Drop Flaw, Calibration self-grade) are intentionally **left as-is** — they're not "LSAT questions being acted on."

## Plan

### 1. Promote the inline viewer to a shared component

Move/rename `src/bootcamps/principle-flaw/components/InlineQuestionViewer.tsx` → `src/components/drill/shared/LRQuestionModal.tsx` and broaden its prop API so it can drive either:

- **Bank-backed mode** (current behavior): `{ initialQid, queue, onClose }` — pulls from `questionBank`, logs `attempts` row with `mode: "bootcamp-pf"` (param now: `attemptMode`).
- **Inline mode** (new): `{ inline: { stimulus, questionStem, choices: {A..E}, correctAnswer, explanations? }, onClose, attemptMode? }` — for bootcamp content that isn't in the LSAT U bank (Capstone items, Simulator stimuli with authored choices).

Both modes render through the same body: `OfficialQuestionPane` for the stimulus + 5 choices, the same submitted/explanation panel, the same header (PT·S·Q chip when bank-backed, or `eyebrow + Qn` when inline), and the same footer Submit / Next.

Re-export shim: `src/bootcamps/principle-flaw/components/InlineQuestionViewer.tsx` becomes a thin re-export so existing imports (`Practice.tsx`) keep working.

### 2. Wire it into Main Conclusion surfaces

- **`modules/lessons/Capstone.tsx` → `CapstoneQuestionView`** (M5 cluster-decomposition, 5 authored choices): replace the bespoke `<Card>` + `<ol>` choice list with `<LRQuestionModal inline={{...}} attemptMode="bootcamp-mc-capstone" />`, opened from a "Open question" button on each item card. Keep the existing pick-tracking / persistence (`getPersistence().insert(TABLES.attempts, ...)`) — modal `onSubmit` callback feeds the existing `record(c)` handler so progress + explanations stay intact.
- **`modules/simulator/SimulatorShell.tsx` → `QuestionItem`**: when an item has `stimulus` + (future) authored choices, route the "Make your call, then reveal" CTA into the same modal in inline mode. For items that are stimulus-only (no choices), leave the existing reveal card untouched — there's no "question being acted on" yet.

### 3. Confirm Principle & Flaw still works

`Practice.tsx` continues importing from the same path; it just resolves to the shared component. No behavioral change.

### 4. Out of scope (no edits)

- Fallacy & Flaw `CalibrationDrill`, `SleightOfHandBossFight`, `FiveFastEliminators`, `DragDropFlawDrill` — none of these are 5-choice LSAT MCQs.
- Main Conclusion drills 3.x (`RoleLabeler`, `ConclusionPicker`, `PronounUnpacker`, `XRayScanToggle`, `Drill3_2..3_9`) — specialty interactions, not LSAT MCQs.
- The `/drill` runner itself, tutor toggle, highlight, answer-choice-shift, and Foyer dock work from earlier turns.

## Files touched

```text
NEW    src/components/drill/shared/LRQuestionModal.tsx
EDIT   src/bootcamps/principle-flaw/components/InlineQuestionViewer.tsx   (→ re-export)
EDIT   src/bootcamps/main-conclusion/modules/lessons/Capstone.tsx
EDIT   src/bootcamps/main-conclusion/modules/simulator/SimulatorShell.tsx
```

## Acceptance

- Open any P&F practice question → same modal as before (no regression).
- Open an M5 Capstone question → pops the LR Smart Drill–styled modal with stimulus, A–E choices, eliminate dots, Submit, then per-choice explanations. Picks still persist via existing capstone persistence.
- Open a Simulator Question Bank item that has authored choices → same modal. Stimulus-only items keep their current reveal card.
- Specialty drills (Role Labeler, X-Ray, Pronoun Unpacker, Sleight-of-Hand, Drag-Drop, Calibration) are visually unchanged.

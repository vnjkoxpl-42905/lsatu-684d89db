## Goal

Turn the uploaded LSAT Lab explanation Markdown files (PT157, PT158, PT159, and any future ones you send) into structured, per-question explanations that plug into the existing question bank so drills, review, and the tutor can display them. Report any explanation that can't be matched to a real question.

## Where things stand

- Questions live as static JSON at `public/data/PT<n>-S<k>-LR.json` (already includes PT157, PT158, PT159).
- `LRQuestion` in `src/lib/questionLoader.ts` already has optional `breakdown` and `answerChoiceExplanations` fields, currently authored for 0 / 3,964 questions. The Drill page and `LRQuestionModal` already read them.
- Uploaded MD files use LSAT Lab's format: `## S<k> · Q<n> — <QuestionType>` headings, then `### Stimulus`, `### Prompt`, `### Standard` / `### Brief` / `### Another Way` (each with `Argument breakdown` and per-choice `**A. text** — Tag (N%)` entries).

## Plan

### 1. Add an explanation sidecar format
- New folder `public/data/explanations/` with one file per preptest, e.g. `PT157-explanations.json`.
- Shape (keyed by `qid = "PT157-S2-Q1"`):
  ```
  {
    "PT157-S2-Q1": {
      "styles": {
        "standard":    { "breakdownMd": "...", "choices": { "A": {"tag": "...", "pct": 5, "text": "..."}, ... } },
        "brief":       { ... },
        "anotherWay":  { ... }
      },
      "correctChoice": "E"
    }
  }
  ```
  Verbatim prose preserved; three styles kept because LSAT Lab authors them differently.
- Also populate the existing typed `answerChoiceExplanations` on the question at load time from the `standard` style (verdict from `correctChoice`, `whyCorrect` / `whyIncorrect` from the choice text) so current UI immediately benefits with no component changes.

### 2. Parser + ingest script
- New `scripts/ingest-lsat-lab-explanations.mjs`:
  - Input: one or more MD paths (defaults to all files in `Explanations/PT*-explanations.md`).
  - Parse question headers to derive `pt`, `section`, `qnum`, `qid`.
  - Split each question into style blocks; capture breakdown block and each `**A. text** — Tag (Npct)` line + trailing paragraph.
  - Cross-check every parsed question against `public/data/PT<pt>-S<section>-LR.json`:
    - Verify the question exists.
    - Verify the correct answer letter matches the JSON's `correctAnswer` (LSAT Lab marks the correct choice with `Correct` tag).
    - Verify all 5 choices are present.
  - Write `public/data/explanations/PT<pt>-explanations.json` (merging when multiple sections belong to one PT).
  - Emit `scripts/out/explanation-ingest-report.md` listing:
    - files processed, questions matched
    - mismatches (missing question, wrong correct answer, missing choice, unparseable block) with file + line references

### 3. Loader wiring (minimal)
- Extend `src/lib/questionLoader.ts` so that when a `PT<n>-S<k>-LR.json` is loaded, the loader also fetches `public/data/explanations/PT<n>-explanations.json` (once, cached) and, per question:
  - populates `answerChoiceExplanations` from the standard style if absent.
  - attaches raw `explanations` (all three styles) under a new optional field `LRQuestion.explanations` for future UI surfaces (e.g. "Show another way" toggle in the review modal).
- No UI changes in this pass beyond that automatic wiring — existing modal will start showing per-choice explanations for PT157/158/159 immediately.

### 4. Run on the three uploaded files
- Copy `user-uploads://PT157-explanations.md`, `PT158-explanations.md`, `PT159-explanations.md` into `Explanations/` (overwriting the existing copies), run the script, and share the report so you can see any mismatches before I move on to further PTs.

## Out of scope for this pass
- Storing explanations in Supabase or the LSAT knowledge index (these are per-question review content, not shared LR methodology).
- New UI surfaces for the "Brief" / "Another Way" styles — data will be present, surfacing comes later.
- Editing question stems, choices, or `correctAnswer` — the script will only report conflicts, never rewrite question data.

## Deliverables
- `scripts/ingest-lsat-lab-explanations.mjs`
- `public/data/explanations/PT157-explanations.json`, `PT158-...`, `PT159-...`
- Small edit to `src/lib/questionLoader.ts` to merge explanations at load time
- `scripts/out/explanation-ingest-report.md` with match/mismatch counts and per-item details

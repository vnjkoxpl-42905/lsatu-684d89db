## Goal

Introduce a new metadata category — **Question Features** — that is separate from `questionType` and `reasoningType`. First feature to populate: **Conditional Diagramming** (222 questions from the uploaded metadata file).

## Data model change

Add an optional `questionFeatures: string[]` field to each question JSON object. Array (not single string) so a question can carry multiple features in the future (e.g., `["Conditional Diagramming", "EXCEPT"]`).

- New field on raw JSON: `"questionFeatures": ["Conditional Diagramming"]`
- New field on `LRQuestion` interface in `src/lib/questionLoader.ts`: `questionFeatures?: string[]`
- Loader passes it through unchanged into the in-memory bank.
- `QuestionManifest` gets a `byFeature: Record<string, number>` aggregate.

No change to `questionType` or `reasoningType` for any question — features live alongside them.

## Tagging script (one-off)

Write `scripts/apply-question-features.mjs`:

1. Parse the uploaded markdown table → list of `{pt, section, qnum, feature: "Conditional Diagramming"}` (222 rows).
2. For each row, locate the matching question across `public/data/PT*-S*-LR.json` (by `practiceTest === "PT###"`, `sectionNumber`, `questionNumber`).
3. Add `"Conditional Diagramming"` into the question's `questionFeatures` array (create the array if missing, dedupe if already present). Do not touch any other field.
4. Write a report:
   - matched count (expect 222)
   - unmatched rows (PT/section/qnum not in bank — likely PTs whose JSON files don't exist yet, e.g. PT129–PT158)
   - already-tagged count
5. Save JSON files in place with stable formatting (2-space indent, preserve key order).

## Coverage check (informational, no code change yet)

The metadata covers PTs 101–158. The bank's `JSON_FILES` only includes a subset (e.g. PT101–PT156-ish, missing many). The script will report unmatched rows so we know exactly how many of the 222 land. Surfacing the feature in UI (filters, badges, drill mode) is **out of scope for this task** — purely a data layer change.

## Files touched

- `src/lib/questionLoader.ts` — add `questionFeatures?: string[]` to `LRQuestion`, pass through in mapping, add `byFeature` to manifest.
- `public/data/PT*-S*-LR.json` — only the rows that match the 222 entries get a new `questionFeatures` key added.
- `scripts/apply-question-features.mjs` — new one-off tagger.

## Out of scope

- UI surfacing (filters, badges, drill-by-feature mode).
- Adding additional features beyond Conditional Diagramming.
- Backfilling JSON files for PTs not yet in the bank.

## Verification

- Run the script; confirm matched count + report unmatched.
- `npx tsc --noEmit -p tsconfig.app.json` clean.
- Spot-check 2–3 tagged JSON files to confirm `questionFeatures: ["Conditional Diagramming"]` is present and nothing else changed.

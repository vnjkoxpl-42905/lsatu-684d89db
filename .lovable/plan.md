## What's already in the bank vs. what you uploaded

| File | Sections in markdown | Already in bank | Missing |
|---|---|---|---|
| PT102 | S2, S3, S4 | S2, S3 | **S4** |
| PT103 | S1, S2, S3 | S1, S2 | **S3** |
| PT105 | S1, S2, S4 | S1, S2 | **S4** |

So nothing in PT102-S2/S3, PT103-S1/S2, or PT105-S1/S2 needs to be re-added — they're already there. Three new sections to ingest: **PT102-S4, PT103-S3, PT105-S4** (~75 new questions total).

## Plan

1. **Parse the three markdown files** with a one-off Node script. Extract for each `### Question PT###-S#-Q#`:
   - pt, section, qnum, qtype (Question Type), reasoningType (left empty if not given), difficulty, correctAnswer, stimulus, questionStem, answerChoices A–E
2. **Generate JSON files** matching the existing schema (`public/data/PT102-S4-LR.json`, `PT103-S3-LR.json`, `PT105-S4-LR.json`).
3. **De-dupe guard** — script will skip any qid already present in any existing `public/data/*.json` so no duplicates land.
4. **Register the three new files** in `src/lib/questionLoader.ts`'s `JSON_FILES` array. Once registered, every mode (Drill, WAJ, bootcamps, type-drills, full-section practice) automatically picks them up — they all read from the same `questionBank`.
5. **Verify**: run a quick count + sample check, and confirm `questionBank.load()` total grows by the expected number.
6. **Report any malformed/skipped questions** so you know if anything didn't ingest cleanly.

## Notes / non-goals
- Existing per-question explanations and BR breakdowns aren't in your markdown — new questions will load without them, same as most existing ones (the app already handles that gracefully).
- Section III of PT103 is marked "unscored" in the answer key but is still useful practice; ingesting it.
- "EXCEPT" / fill-in-the-blank features in your markdown will be appended into the question type label so they remain searchable (e.g., `Strengthen EXCEPT`).

# Practice tests: complete, and how they got there

Audited and repaired 2026-08-27. Re-check any time:

```
npm run audit:practice-tests          # per-test report, exits 1 if any test is short
npm run audit:practice-tests:gaps     # regenerates scripts/practice-test-gaps.generated.json
```

## Where it landed

| | before | after |
|---|---|---|
| PrepTests offered as a full sitting | 58 | **59** |
| Complete from beginning to end | 8 | **59** |
| Questions missing across offered tests | 321 | **0** |
| RC questions absent from the bank | 548 of 2,150 | **0** |
| RC sections carrying a real 26-28 questions | 8 of 80 | **80 of 80** |

PT159 could not be sat at all and is now the 59th sitting. PT156 S3, PT159 S2 and
PT159 S4 shipped with zero, zero and two questions across four full passages;
all three are complete sections now.

## What was actually wrong

Not the build, and not the assembly logic. Both were correct throughout.

`scripts/rc-source/` is the LSAT Lab RC extract the bank is built from. Its
`questions.csv` listed all 2,150 RC questions with their real section positions,
but `answer_choices.csv` held exactly 8,010 rows, which is 1,602 questions times
five. The split was total and exact: every question with a written explanation
had choices, and **not one of the other 548 had a single choice**. The original
pull had fetched answer choices only for questions carrying authored prose. A
question with no choices cannot be rendered, `build-rc-bank.mjs` correctly
refused to publish it, and the section arrived short.

So the questions were never missing from the LSAT. They were missing from our
copy of it.

## The fix

All 548 were pulled back from the same authenticated API that produced the
bundle, landing in `scripts/rc-source/recovered/questions.ndjson`: prompt, five
answer choices, credited answer, and response counts per choice. Zero failures,
and the recovered set matched the audit's predicted work list exactly — 548
wanted, 548 returned, none missing and none unexpected.

`build-rc-bank.mjs` merges that file when it is present and is a byte-identical
no-op when it is not. The count assertions scale with it rather than being
edited by hand.

One historical Logical Reasoning question was recovered at PT118 S3 Q22 during
that numeric-completeness repair. The modern official PT118 marks this position
"Item Removed From Scoring," so it is now a removed marker, not an active
question. PT118 S1 Q5 is likewise officially removed. Neither counts as a
missing-data defect or as a question to answer or score.

The modern PT118 labels S3 as an unscored section. Its scored sitting therefore
offers S1 LR, S2 RC, and S4 LR (77 answerable questions). S3 remains available
in the bank for reference, with its removed Q22 marker, but is not a scored leg.

Pre-repair student history can contain Section I IDs attached to the shifted
content. `plans/pt118-history-migration-draft.sql` records a proposed repair,
but must not run until live row provenance and uniqueness collisions are checked.
The application preserves existing sittings and blocks inaccurate legacy scores.

## They carry no written explanation, and that is fine

All 548 are questions LSAT Lab never wrote a walkthrough for — that is precisely
why they were dropped. They ship as `hasWrittenExplanation: false` with no
explanation blocks, which is what they are. A quarter of RC questions in the bank
are now in that state.

The player already handled this and needed no changes: `RcReviewLayer` shows the
verdict, the credited answer, and the tutor fallback ("No written walkthrough for
this one yet") with a link into the inbox, rather than an empty shell. Nothing
gates on `hasWrittenExplanation` or `explainedCount` at runtime.
`RcReviewLayer.recovered.test.tsx` renders a real recovered question off disk and
pins that behaviour.

## What is still missing, and cannot be recovered

Three questions, none of which affects a sitting's completeness, because LSAT
Lab's own question table has no record of them:

- **PT119 S1 Q9** and **PT136 S3 Q15** — absent from the RC source table, so
  those sections top out at 26 of a real 27. The audit counts them complete
  because it measures against the roster that exists.
- **PT138 S4 Q19** — absent from the LR bank (its positions run 1-18, 20-25).
  PT138's sitting uses S2 and S3, so no offered test is short because of it.

## What guards this now

- `scripts/audit-practice-tests.mjs` exits non-zero while any offered test is
  short. RC rosters come from the source question table, so a missing tail is
  caught, not just an interior gap; LR rosters are the highest number present and
  are marked with a dagger as the lower bound they are. The PT118 LR removed
  positions are explicit exceptions, checked against the official modern PDF.
  The audit also catches duplicate LR numbers and duplicate question content.
- `practiceTest.audit.test.ts` pins the audit's offer rules to the app's real
  `buildPracticeTests`, so the two cannot drift apart.
- `practiceTest.bank.test.ts` asserts every sitting has a full-length RC section.
  That is the assertion that fails first if `recovered/questions.ndjson` ever goes
  missing and someone rebuilds the bank.

## The three that stay missing, and why (verified against LSAT Lab, 2026-08-27)

All three are absent from LSAT Lab's own bank, not lost by our import. Each was
checked against the live authenticated API rather than inferred, and the three
fail in three different ways:

| Question | Evidence | Reading |
|---|---|---|
| PT119 S1 Q9 | ids run 6560 (pos 8), **6561 → HTTP 404**, 6562 (pos 10) | An id was allocated and the record later removed. A tombstone: it existed once. |
| PT136 S3 Q15 | ids 2911 (pos 14) and 2912 (pos 16) are **consecutive** | No id was ever allocated. Their bank simply skips position 15. |
| PT138 S4 Q19 | `/api/questions/filter?type=LR` returns sec4 = 24 questions, max position 25, missing 19 | Absent upstream. Our transcription did not drop it; there was nothing to drop. |

For contrast, PT138's other two LR sections come back whole from the same call
(sec2 26 of 26, sec3 25 of 25), which is what makes the sec4 hole a fact about
their bank rather than about the query.

None of the three is recoverable by any amount of scraping, and none costs an
offered test its completeness: PT119 S1 and PT136 S3 top out at 26 of a real 27,
and PT138 S4 at 24 of 25. Do not re-open this without new evidence from LSAT Lab.

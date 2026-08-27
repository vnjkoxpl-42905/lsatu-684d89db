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

One Logical Reasoning question was recovered the same way: PT118 S3 Q22, which
PT118's sitting depends on.

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
  are marked with a dagger as the lower bound they are.
- `practiceTest.audit.test.ts` pins the audit's offer rules to the app's real
  `buildPracticeTests`, so the two cannot drift apart.
- `practiceTest.bank.test.ts` asserts every sitting has a full-length RC section.
  That is the assertion that fails first if `recovered/questions.ndjson` ever goes
  missing and someone rebuilds the bank.

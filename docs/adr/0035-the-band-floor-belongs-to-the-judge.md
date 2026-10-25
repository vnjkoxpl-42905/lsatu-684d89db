# 0035 — The band floor belongs to the judge, and is re-measured when the judge moves

Date: 2026-09-08
Status: accepted
Amends [0018](./0018-full-coverage-is-not-a-hundred-percent.md).

## Context

ADR 0018 set the top Coverage band at 86%: the 10th percentile of Joshua's own
71 recordings scored Detail by Detail, so that nine correct runs in ten clear
it. It then validated the live judge, `gemini-2.5-flash`, against those same
runs and found it 1.6 points harsher than the hand census with four decoy
failures in 71.

On 2026-09-08 every model call on the platform was moved to `gemini-3.8-flash`.
The same student recording, re-graded on the new model, moved from 89 to 86
mean Coverage; one stimulus fell from 82% to 59%, and six coloured lines became
none. Nothing about the recording had changed. The floor had been measured on
one judge and was being applied by another.

There was no way to re-measure it. The shaped transcripts and the key the
validation used lived on a laptop this machine is not, and the judge is
reachable only from inside the edge function.

## Decision

**The census runs inside the grader, on demand.** `grade-rrc-section` accepts an
admin-only `{ census: { sourceSection, items } }` call: it fetches the model
runs' own transcripts for that section, cuts the verbatim reads exactly as it
does for a student, judges each stimulus with no walkthrough and no line split
(the conditions the 0018 census was scored under), and returns one row per
stimulus without writing anything. `scripts/rrc-census.ts` sends the three
sections and prints the distribution. Same prompt, same model, same key as a
student's grade, by construction.

**Measured on `gemini-3.8-flash`, build `2026-09-08e`, 71 of 71 stimuli:**

| | Hand census (0018) | 2.5-flash (0018) | 3.8-flash (this ADR) |
|---|---|---|---|
| Mean | 94.7 | 93.1 | 91.7 |
| Median | 95 | 94 | 93 |
| 10th percentile | 86 | 85 | **82** |
| Minimum | 68 | | 68 |
| Runs at 100 | 22 | | 20 |
| Decoy failures | | 4 | **0** |
| Reads matched | | | 68 of 71 |

The new judge is about three points harsher than the hand census and about
one and a half harsher than the old judge, and it is cleaner: it never
credited a Detail from another stimulus, where the old one did four times.
Of the two runs at 68, PT134.S3.Q1 is the fill-in-the-blank conclusion ADR
0018 already explained; PT105.S2.Q25 is new to the tail and worth a listen.
The recording that starts mid-sentence, PT134.S3.Q16, now sits at 82.

**The floor moves to 82.** By 0018's own rule, the 10th percentile of the
census on the judge that is live. The two provisional cutoffs keep their
widths below it: nearly there from 68, thin from 51. They are still
provisional for the reason 0018 gave.

**The floor is re-measured whenever the judge's model changes**, before any
grade written by the new model is shown to a student. `BAND_FLOOR` in
`rrcGrading.ts` names the ADR that measured it and the model it was measured
on. A floor without a census behind it on the current model is a guess, and
the Report Card must not print a guess as a band.

**Two fairness gaps closed in the same prompt.** The line verdicts (strong,
partial, thin, skipped) had names and no definitions, so the same run could
land differently on different days; the prompt now defines each one by what
survived. And the prompt says outright that only a change of meaning counts
against her: her words, her order and a plainer phrasing all count in full.

**Every stimulus carries `next_time`.** One or two sentences to her, written
from her run: what to say out loud on purpose, which kind of word she keeps
losing, what her Read should have named. Empty when there is nothing to fix,
and the Report Card then says so rather than going quiet. The grade row also
carries the passage and the authored Read, so the card can show the standard
beside her words without a query it cannot make.

## Consequences

**Every grade written before 2026-09-08 on 3.8-flash and banded at 86 was
under-banded by four points.** Two student runs exist: one graded on
2.5-flash under the old floor, one on 3.8-flash under it. Both are re-graded
on the live build so they sit on the same judge and the same floor.

**The census costs about 100 seconds and 71 judge calls.** It is run by hand,
after a model change, and its rows are saved under `docs/adr/` beside the ADR
that cites them.

**0018's other claims stand.** The band, not the percentage, leads; numbers
above the floor are not ranked; a recital wears no band.

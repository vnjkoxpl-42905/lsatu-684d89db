# 0022 — Reciting is a share, not a streak

Date: 2026-09-03
Status: accepted
Amended: 2026-09-04 (see "Amendment: the backstop was firing on the standard")
Extends [0017](./0017-the-grader-hears-the-run-through-the-same-ear-as-the-standard.md).

## Context

Reciting is the drill's named failure: saying a stimulus back close to
word-for-word rather than in her own words. Coverage looks perfect and nothing
was understood. The grader decides it in code rather than asking the model,
because it is a measurement.

It was measured as `longestSharedRun >= 12 || bigramOverlap >= 0.50`. Neither
number was measured or written down. Both were wrong, and the first trial and
the model-run corpus say so in the same direction.

Three populations, all real, all on PT102.S3:

|                                       | longest run | bigram share |
| ------------------------------------- | ----------- | ------------ |
| Joshua, reading aloud then recalling   | 19 – 43     | 0.180 – 0.404 |
| a student, done correctly              | 3 – 18      | 0.145 – 0.652 |
| one deliberate recite                  | 48          | 0.989        |

At 12 and 0.50 that check flagged **all 22 of Joshua's own model runs** — the
recordings that define a correct performance — and **4 of the 21 correct
stimuli** in the trial. One deliberate recite was planted and five stimuli came
back flagged.

The prior finding proposed windowing the measure to `recalling` only, described
as a two-line fix. Measured on the trial it changes which stimuli are flagged
and not how many: five before, five after. It is not the fix.

## Decision

**The bigram share is the test. The longest run is a backstop.**

`RECITING_RUN = 45` and `RECITING_BIGRAM = 0.80`, in `_shared/rrcOverlap.ts`
beside the measures themselves, with the table above beside them.

The two measures behave differently in a way the old thresholds ignored. Joshua
reads each chunk aloud before recalling it, so a single read sentence pins the
longest run no matter how well he retells around it — 19 to 43 while doing the
drill perfectly. The bigram share is a proportion of everything said, so the
same reading aloud dilutes it rather than inflating it, and never carries him
past 0.404. A share measures "in her own words"; a streak measures whether any
sentence was ever read out loud.

So the run threshold sits **above the entire reading-aloud population** rather
than below it, where it can no longer confuse reading the text with reciting it
from memory. Those are different acts and only one is a failure.

**The thresholds are set to avoid false positives, not to catch every marginal
case.** A Reciting flag tells a student something about herself that the Report
Card gives her no way to argue with. A missed flag only fails to.

**Every stimulus now records `reciting_run` and `reciting_bigram`.** The verdict
was stored and the reading was not, so recalibrating meant reconstructing the
numbers from a scratchpad and re-measuring the model runs. The next calibration
reads real student runs out of the grade table.

**The measure stays over the whole window, matching the glossary.** Reciting is
defined as a failure of the Reading Recall, which happens while the text is on
screen, so windowing to The Recall would measure a different step. Whether that
definition is the right one is a question for the curriculum and not for the
grader; the thresholds above hold either way, because they were calibrated
against runs that include the reading.

## Consequences

**Nobody is told they recited for reading the text aloud.** Which is what the
old check would have done to any student who did what the seeded rules
ambiguously invite.

**The upper bound rests on one deliberate recite.** That is thin, and it is the
side where being wrong is cheap. The recorded readings are what fixes it.

**ADR 0017's asymmetry is narrowed but not closed.** The standard was produced
by `student_shaped.py`, which cuts the verbatim reads out before scoring; the
grader still has no equivalent step. This makes the thresholds tolerant of a
run that contains reading rather than making the two ears identical. Porting the
read detection is a separate change and remains the real answer.

## Alternatives considered

**Window the measure to `recalling` only.** The proposed two-line fix. Rejected
on measurement: it moves which stimuli are flagged without reducing how many,
and it contradicts the glossary, where Reciting is a failure of the Reading
Recall rather than of The Recall.

**Drop the longest run and keep only the share.** Clean, and very nearly right:
the share alone separates all three populations. Rejected because a student who
recites one long passage inside an otherwise original retelling is exactly the
case a share is weakest at, and a backstop set above the reading-aloud
population costs nothing.

**Ask the judge to decide Reciting.** Rejected before this ADR and still
rejected. It is a measurement, it is cheap, and a model's opinion of it would
vary between two runs of the same recording.

---

## Amendment: the backstop was firing on the standard

Date: 2026-09-04

The decision above is unchanged in principle and was wrong in one detail: the
run was written as an independent trigger, `run >= RECITING_RUN || bigram >=
RECITING_BIGRAM`. An OR is not a backstop. It is a second, weaker test with a
veto.

The table this ADR rests on was measured on PT102.S3 alone, where Joshua's runs
top out at 43. PT134.S3 contains a 46-word read, and the 2026-09-03 audit caught
the consequence: his own stimulus in the standard flagged as "said back close to
word for word" at run 46, share 0.258. A share of 0.258 says plainly that this
was not a recital. The run arm overrode it.

So the calibration was redone across every captured section rather than one.
274 model runs, twelve sections, measured by the functions themselves from
`model_runs.transcript_text` against each stimulus's own chunks, and kept as a
fixture beside the test rather than transcribed into it.

|                                        | longest run | bigram share  |
| -------------------------------------- | ----------- | ------------- |
| Joshua, reading aloud + recall (274)    | 9 – 60      | 0.066 – 0.462 |
| a student, done correctly (21)          | 3 – 18      | 0.145 – 0.652 |
| a deliberate recite (2)                 | 48, 57      | 0.952, 0.989  |

The wider corpus makes the asymmetry stark rather than merely visible. The share
still separates completely, with an empty band from 0.652 to 0.952 around the
0.80 threshold. The run does not separate at all: it reaches **60** on an honest
read, and **four of the 274 already sit at or above 45**, with shares of 0.279,
0.353, 0.357 and 0.366. The old rule flagged the standard four times over.

### Decision

The run is now what this ADR's title always said it was:

```
reciting = bigram >= RECITING_BIGRAM || (run >= RECITING_RUN && bigram >= RECITING_RUN_SHARE)
```

`RECITING_RUN_SHARE = 0.70`, set above 0.652 — the highest share ever measured
in either honest population, which is a student's rather than Joshua's. Between
0.70 and 0.80 is the band the "Drop the longest run" alternative was rejected
for: a long recited passage inside an otherwise original retelling, still caught,
now without the veto.

`RECITING_RUN` stays 45 and `RECITING_BIGRAM` stays 0.80. Neither was the defect.

### Consequences

**Zero of the 274 model runs flag, and both deliberate recites still do.** The
assertion is derived from the fixture rather than written beside it, so a
section captured later cannot quietly fall outside the population the numbers
were chosen against.

**Report Cards already graded keep the old verdict.** `reciting` is stored, not
recomputed on read, so a run graded before this lands still shows the false
positive until it is graded again.

**A third calibration should not be needed, and the reason the first two were is
now fixed.** Both previous attempts generalised from too little: the first from
nothing measured, the second from one section. This one is every section there
is, and the fixture makes the next one an append rather than a re-derivation.

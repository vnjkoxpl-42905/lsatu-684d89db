# 0024 — The reads are cut before anything is judged

Date: 2026-09-03
Status: accepted
Extends [0017](./0017-the-grader-hears-the-run-through-the-same-ear-as-the-standard.md).

## Context

ADR 0017 closed one asymmetry between the run and the standard: the grader
transcribes with Deepgram Nova-3, the same engine that read the runs the 1,294
Details were calibrated against, so a student is never graded on a weaker
transcript than the reference.

There is a second asymmetry in the same comparison and it was left open.

The reference transcripts do not go into the calibration raw. They go through
`system/scripts/activity-centre/student_shaped.py` first, which removes the
verbatim reads, and the script says exactly why:

> Joshua reads each chunk aloud before recalling it. The student never does: she
> reads silently, so her recording holds only Reading Recall, Colouring In and
> The Recall. Scoring Coverage against his raw transcript therefore measures the
> wrong thing — the source text is in it, so every Detail is trivially present.

The grader had no equivalent step, and "the student never does" is an
assumption about behaviour rather than a rule the app enforces. Nothing stops a
student reading aloud, plenty do, and it is the natural thing to do with a text
you are about to be tested on. The trial run measured 34 words of it across two
chunks from a synthetic reader that was not even trying.

When she does read aloud, the source text lands in the only evidence the judge
is shown and every Detail in that chunk becomes trivially present. So the
student who reads aloud is scored HIGHER for doing less — on the same recording
that also gets her flagged for Reciting. Two measures on one run, pointing
opposite ways, both wrong.

## Decision

**The verbatim reads are cut out of what she said before the judge sees it**,
by the same rule and on the same side of the same comparison as the corpus.

**Only inside the `working` window.** She reads while the text is up. The Recall
is from memory by definition, so a word-for-word passage there is a recital and
has to survive in order to be caught as one by ADR 0022's measure.

**A cut requires a long run that also covers most of a chunk.** At least eight
consecutive words, and at least 60% of the chunk's length. A chunk shorter than
eight words is never cut at all. This errs deliberately: leaving a short read in
costs a little accuracy on one Detail, and cutting a short paraphrase costs her
the Detail outright.

**Chunks are taken in order, each cut advancing a cursor**, because she reads
them in order. Without that, a phrase repeated across two chunks could be cut
twice, and the second cut would land on her recall of the first.

**How much was cut is recorded on the grade** — `read_aloud_words` and
`chunks_read_aloud` — and shown to her as an observation rather than a mark.

## Consequences

**Coverage moves, slightly, and in the right direction.** Re-grading the trial
run took it from 91% to 92%, with 34 words cut. A student who reads the whole
section aloud would move much further, which is the point.

**Reciting gets more accurate for free.** The measure now runs on the same
stripped text, so a genuine recital during The Recall still shows and reading
aloud during `working` no longer inflates the overlap. The 45 / 0.80 thresholds
from ADR 0022 were calibrated on unstripped text, so on stripped text they are
strictly more conservative.

**Reading aloud becomes visible.** It was invisible before and it is worth
knowing: a student who reads the whole section out loud is doing a different
drill from the one she thinks she is doing, and nothing else in the product
would ever have said so.

**It is a heuristic, and it is bounded in the safe direction.** It can miss a
read; it can hardly ever invent one.

## Alternatives considered

**Port `transcript_align` wholesale.** The corpus tool locates every read
precisely and is the right tool for a batch job with a human checking it. In an
edge function on a student's live grade, its failure mode is silently cutting
her own words, and it needs the whole alignment machinery to do what one
constrained longest-common-run does at this threshold.

**Tell her not to read aloud and leave the grader alone.** The briefing already
says to read silently. A grader that is only correct when the student follows
instructions is not a grader, and this particular instruction is the hardest one
in the drill to keep.

**Grade only the `recalling` window.** Clean, and it throws away the
say-it-back and the colouring, which are two of the drill's four beats and carry
Details she genuinely produced.

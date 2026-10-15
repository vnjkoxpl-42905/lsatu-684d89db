# 0024 — The reads are cut before anything is judged

Date: 2026-09-03
Status: accepted
Amended: 2026-09-04 (see "Amendment: the ear was matching two different tokenisations")
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

---

## Amendment: the ear was matching two different tokenisations

Date: 2026-09-04

The decision above is unchanged in principle. Both mechanisms it chose were
wrong, and the smaller of the two was the one this ADR argued about.

The 2026-09-03 audit measured the deployed stripper against the standard's own
PT134.S3 run. It cut **582 of 8,148 words, 7%, and found 38 of the 87 chunks**.
Joshua reads every chunk aloud, so the honest number is 87, and the corpus
aligner these Details were calibrated against finds 86 of them and cuts 19%.
"At the standard" was therefore a statement about the stripper.

### What was actually wrong

Two things, and the first was not the heuristic at all.

**The two sides of the comparison were tokenised differently.** The grader
passes Deepgram's `punctuated_word` into the stripper — `Thus,` and `Hot` and
`don't`, capitalised and punctuated — and the stripper compared those tokens
against `rrcOverlap.words(chunk)`, which is lowercase and strips everything
outside `[a-z0-9]`. `Thus,` can never equal `thus`. Only a word that was already
lowercase and unpunctuated could match at all, so the "eight consecutive words"
requirement was really "eight consecutive words that happen to carry no capital
and no comma between them".

The scale of it is measurable on the corpus, whose transcripts can be fed
through either tokenisation. Across the twelve captured sections, 956 chunks:

|                                        | chunks found | words cut |
| -------------------------------------- | ------------ | --------- |
| as deployed (mismatched tokenisation)   | 463 (48%)    | 7.8%      |
| both sides normalised, same heuristic   | 800 (84%)    | 15.1%     |
| the corpus aligner, for reference       | 949 (99%)    | 19.5%     |

Simulating the deployed tokenisation on PT134.S3 gives 39 of 87 chunks and 7.4%
of words, against the audit's field measurement of 38 and 7% on a different
recording of the same section. That is the defect, reproduced.

**The exact run is the smaller half.** Even with the tokenisation fixed it
leaves 16% of the reads in, because a recording that opens mid-sentence, a
hesitation inside a chunk, or one misheard word in seven all break a run.

### Decision

**The reads are located by fuzzy alignment, `transcript_align.locate` ported.**
Every chunk is scored against every window of the working text at its own length
and at a third longer, by `difflib.SequenceMatcher(autojunk=False).ratio()`
ported rather than approximated — the calibration band was set on that
function's output, and a different similarity measure with a re-tuned threshold
would be a second ear again, which is the whole defect.

**Chunks are located independently and the ordering is resolved afterwards**,
highest-confidence first, admitting a match only where it does not cross one
already accepted. A single advancing cursor is what the original decision chose
and it starves every chunk after one whose read is missing or truncated:
PT134.S3.Q16 opens mid-sentence, and its chunk 1 matched badly enough to lose
chunks 2 to 5, all of which had been read aloud.

**The alignment has its own tokeniser**, `readWords`, which keeps contractions
whole and folds the curly apostrophe the stimulus text uses in 18 of the
corpus's 990 chunks and no engine emits. `rrcOverlap.words` was not widened
instead: ADR 0022's reciting thresholds were recalibrated on its output the same
day, and moving it would move them.

**The cut is made on the original tokens.** The normalising is for the
comparison only, so the evidence the judge reads and the transcript she is shown
on the expanded row keep their capitals and full stops.

**The tolerance is 0.80, and it is not the corpus aligner's 0.55.** This is the
one place the port deliberately departs, because the two tools are answering
different questions. `student_shaped.py` asks *where in this transcript is the
read*, of a corpus where every chunk is known to have been read aloud. The
grader asks *was this chunk read aloud at all*, of a window that very often
holds no read — and the wrong answer there is not a missed read, it is her own
recall silently deleted, which is exactly the failure this ADR rejected the
wholesale port for.

So the threshold was measured rather than inherited. `model-run-reads.json`
holds the best ratio for all 956 chunks scored twice: against the transcript
holding the read, and against the same transcript with the read already removed
by the corpus aligner, which leaves his retelling and colouring and nothing else
— the shape a student's recording has. Chunks under the eight-word floor are
excluded, since the floor is part of the policy.

| tolerance | reads found | her own words cut by mistake |
| --------- | ----------- | ---------------------------- |
| 0.55 (the corpus aligner's) | 100% | 27% |
| 0.70      | 98.1%       | 6.6%                         |
| **0.80**  | **96.1%**   | **1.7%**                     |
| 0.85      | 92.2%       | 0.7%                         |

The eight-word floor stays, and matters more to a fuzzy measure than it did to
an exact one: at 0.80 the false cuts that survive it are short chunks whose
words recur in her own retelling.

### Consequences

**On PT134.S3, the section the audit measured: 39 chunks to 74, and 7.4% of
words to 17.9%**, against the corpus aligner's 86 and 19.5%. Across all twelve
sections, 463 to 880 chunks and 7.8% to 18.6%. The word fraction is the number
that decides how much source text reaches the judge, and it is now within a
point of the reference the Details were calibrated against.

**Coverage will fall, and that is the point.** The audit's section mean was
grader 97%, census 94%, model-validated census 93.1%, with all 26 stimuli at
the standard where the census had two below it. How far it actually moves is
one measurement and it cannot be made from a development machine: it needs this
deployed and one `force` re-grade of the standard's run. Until that is run and
recorded here, this ADR claims a stripper that matches the corpus, not a mean
that does.

**A chunk she only half read is still not cut.** Half a chunk scores near 0.60
however it is measured, because the half she did not read is still in the
needle, and 0.60 is also roughly what a close paraphrase scores. Half of one
chunk's source text stays in the evidence. Closing it needs a second measure,
not a lower tolerance.

**The cut is window-shaped.** The span is the chunk's length or a third longer,
whichever scores better, and neither is a sentence boundary, so a read that is
interrupted can leave its last two words behind and one that starts late can
take her first two with it. The corpus aligner cuts the same way, so both ears
are wrong by the same couple of words.

**It costs about 20 ms per stimulus**, worst case 21 ms across the 274 captured
runs, against a judge call that costs seconds.

**"It can hardly ever invent a read" is no longer free.** The original decision
could say that because an exact eight-word run is nearly impossible to hit by
accident. This one buys its recall with a measured 1.7%, and that number is a
test rather than a claim: `reads.fuzzy.test.ts` re-derives it from the fixture,
so a section captured later cannot quietly fall outside the population the
threshold was chosen against.

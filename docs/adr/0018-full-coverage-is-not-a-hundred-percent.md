# 0018 — Full Coverage is not 100%

Date: 2026-09-01
Status: accepted
Amended: 2026-09-04 (see "Amendment: a recital wore the top band anyway")
Extends [0012](./0012-the-recall-is-a-recap-from-memory.md).

## Context

ADR 0012 made Coverage the score: how many of a stimulus's authored Details she
carried, as one number per stimulus. It did not say what number is good, and the
obvious reading of a percentage is that 100 is the target.

That reading is measurably false. Joshua's own recordings are the drill done
correctly, and they are the standard the Details were calibrated against. Put
through `student_shaped.py`, which removes the verbatim reads a student never
speaks, **all 71 stimuli of the three built sections were scored Detail by
Detail** — a census, not a sample, of 1,294 judgements:

| | Coverage |
|---|---|
| Mean | 94.7% |
| Median | 95% |
| 10th percentile | 86% |
| Minimum | 68% |
| Maximum | 100% |
| Runs at 100% | 22 of 71 |

He reaches a clean sweep on fewer than a third of them, and the distribution has
a real left tail: two runs below 83%, and one at 68%.

The two lowest are both explained rather than mysterious. PT134.S3.Q16's
recording starts mid-sentence, so part of the stimulus was never spoken at all;
it measures the recording. PT134.S3.Q1 ends in a fill-in-the-blank conclusion
("it would be reasonable for organizations… to _______"), which he answers in
four words, so a whole chunk's Details go uncarried. Excluding those two, the
range is 79 to 100 with a median of 96.

He is not sloppy and the key is not wrong. The calibration method already
settled this: "his own recall drops details, and that is not a defect… his run
is not a ceiling on the key." What is new is the shape of the distribution and
what sits in the misses. Across the census they are, in order of frequency:
**a small specific** — an adjective, a place, a time, a material ("the water is
seawater", "the stalagmites are numerous", "the announcement was earlier
today"); **a quantifier or hedge** ("the devices would go in all cars", "it is
generally so", "this is stated with certainty"); and **a speaker role or
discourse marker** ("Tom is the first speaker", "a lawyer is speaking").

Those are the exact words the drill exists to train. Coverage is measuring the
right thing; the scale is what is wrong.

A second measurement bears on how the judgement is asked. Classifying all 1,294
Details by what they actually assert
(`system/scripts/activity-centre/classify_details.py`) splits them three ways,
not two:

| Kind | Count | Share | Example |
|---|---|---|---|
| content | 1,133 | 87.6% | "The commitment is long-standing." |
| structure | 137 | 10.6% | "This is the conclusion." · "This is a contrast." · "An archaeologist is speaking." |
| modality | 24 | 1.9% | "This is hedged as probable." · "This is an average." · "This is almost always so." |

A **structure** Detail is carried by how she says the stimulus back, not by which
words she uses. Joshua carries "This is a contrast." by saying "Glass is
different from steel, though"; he carries "This is the conclusion." with a "so".
A judge asked *did she say this?* marks both missed. A judge asked *is this
relationship present in her retelling?* marks both carried.

A **modality** Detail is neither a fact nor a relationship but the strength of a
claim, and it is the class his runs drop most.

The three-way split is itself the finding. A two-way content/structure cut looks
sufficient until it is run: "This is about Sweden." and "This is the conclusion."
share an opening and are opposites, and a classifier keying on that opening puts
a topic fact in with the discourse roles. 12.4% of every score turns on asking
the right question of the right kind.

## Decision

**Coverage is reported against a band calibrated on the standard, never as a
raw percentage against an implied 100.**

| Band | Coverage | What it means |
|---|---|---|
| At the standard | 86% and above | The run the drill is asking for |
| Nearly there | 72–85% | Holding the argument, losing the detail |
| Thin | 55–71% | The shape survived and the content did not |
| Lost it | below 55% | Read it again |

**Only the top boundary is evidenced, and it is the 10th percentile of the
census** — nine correct runs in ten clear it. It is deliberately not the minimum:
the minimum of any sample is the most fragile statistic available, and here it is
a stimulus whose recording is broken.

**The three lower cutoffs are provisional and are marked as such.** The corpus
contains only correct runs, so it can calibrate where good ends and nothing else.
Where "nearly there" stops being nearly and starts being thin is unknown until
student runs exist, and inventing precision there would be dressing a guess as a
measurement.

**Each kind is judged by its own question.** Details are classified `content`,
`structure` or `modality` at build time, and the judge is asked: for content,
whether she stated the fact; for structure, whether the relationship is present
in how she told it; for modality, whether her qualifier survived. The
classification lives with the build, so a section carries it and the grader
never has to guess.

**The classifier is a closed set plus a residue detector, not a heuristic.**
`structure` and `modality` are matched against authored phrasings that are
enumerated, and anything opening like a discourse role that falls through to
`content` is reported rather than silently accepted. On the three built sections
the closed set leaves 4 residue lines out of 1,294, and all four are correctly
content. A new section's residue is read before it ships; a growing residue
means the authoring vocabulary has drifted, which is worth knowing on its own.

**Numbers above the top band are not ranked.** 100% and 88% are the same
outcome. The Report Card says a run is at the standard and moves on to what she
missed; it does not put her in a race against an unreachable maximum, and it
does not congratulate a difference the measurement cannot support.

## Consequences

**ADR 0012's estimate of the grading job is corrected.** It records "roughly 92
Detail judgements per section". The three built sections carry **426, 419 and
449** Details. 92 is approximately the *chunk* count (80, 82, 87), which is what
the number was when Coverage was still conceived per chunk; ADR 0013 moved
Coverage to the stimulus and the estimate did not follow. The job is about five
times the recorded size. It stays about 25 model calls, because the Details of
one stimulus are judged together.

**Reciting and Listing become load-bearing, not decorative.** With the top band
starting at 86%, a student who recites reaches it trivially. ADR 0012 already
names both failures and puts them in the tips rather than the number. That
division only holds if the tips actually fire, so Reciting is graded in code
against the chunk text and cannot be skipped as a nice-to-have.

**A student can be at the standard and still be told what she lost.** The band
answers "was this run good"; the missed Details answer "what did you drop". They
are different questions and the Report Card shows both, which is what stops the
top band from reading as nothing left to learn.

**The floor rests on 71 runs and should eventually rest on more.** The corpus
supports 713, and the remaining 642 are stimuli from sections that are not built
yet. Re-running the census is the natural first use of the regression suite in
[0017](./0017-the-grader-hears-the-run-through-the-same-ear-as-the-standard.md),
and the cutoff moves by measurement rather than by taste when it does.

**A fill-in-the-blank stimulus needs its own handling and does not have it.**
PT134.S3.Q1 is the census minimum because its final chunk is a blank the speaker
completes in four words, and its Details describe a conclusion that is not on the
page. Every section will have a few. Nothing in this ADR fixes that, and a
student will hit the same floor on the same stimuli.

## Validated against a real model, 2026-09-02

The bands above were drawn from judging done by hand and by agent. The grader
does not use either. `scripts/grade-census.ts` ran the actual judge -- the real
prompt, `gemini-2.5-flash` at temperature 0 -- over all 71 census stimuli:

| | min | p10 | median | mean |
|---|---|---|---|---|
| Census (hand + agent) | 68 | **86** | 95 | 94.7 |
| Judge (gemini-2.5-flash) | 59 | **85** | 94 | 93.1 |

**The floor holds.** Judge p10 is 85 against a census p10 of 86: the two agree
within a point, which is validation rather than discrepancy. Mean delta is
**-1.6 points**, so the model is very slightly stricter than a person, and 58 of
71 land within 5 points. The floor stays at 86; moving it one point on this
evidence would claim a precision the measurement does not have.

**87% of correct runs land at the standard**, 11% at "nearly there", one at
"thin". At section level the mean is 93%, comfortably inside the top band, so a
correct run reads as correct; the spread is per stimulus.

**Nothing failed to parse.** 71 replies, zero unreadable, zero Details left
unjudged.

**The decoys caught something, which is the point.** 4 of 71 stimuli had the
judge credit a Detail belonging to a different stimulus -- one decoy of two,
each time. That is the failure this ADR's judging rule exists to prevent, it is
invisible in a Coverage number, and without decoys we would not know it happens
at a 5.6% rate. It is recorded per grade so a run carrying one can be treated as
suspect rather than reported as fact.

**Cost is not a consideration.** ~1,750 tokens per stimulus; ~124,000 for the
whole census; roughly 41,000 to grade one student's section.

## Alternatives considered

**Normalise each stimulus against Joshua's own Coverage on it, so his run is
100.** Rejected. It makes the scale depend on how well he happened to do that
day, and on the 22 stimuli where he scored 100 it leaves her no headroom while
on the 68% one it hands her 32 points. The calibration method is explicit that his run
is one sample and not a ceiling; a per-stimulus normaliser treats it as both.

**Show the raw percentage and put the target in the copy.** Offered and
rejected. A number and a caption disagreeing is a number winning: 88% next to
"this is a good run" reads as consolation.

**Drop the structural Details from the key so Coverage is content only.**
Rejected. They are 10.6% of the key and they are the argument's skeleton, which
is the thing The Recall exists to test. The fix is to ask the judge the right
question, not to stop asking.

**Weight Details by importance so a proper noun counts less than a conclusion.**
Rejected for now. It needs a per-Detail authored weight over 1,294 rows, and the
band already absorbs the variance a weighting would model.

---

## Amendment: a recital wore the top band anyway

Date: 2026-09-04

"Reciting and Listing become load-bearing, not decorative" was written about the
grader and only about the grader. It was true there: Reciting is graded in code,
it fired, and the run that recited was flagged.

It was not true on the card. In the 2026-09-03 trial, stimulus 3 was read out
verbatim during The Recall, was correctly flagged, and its row still read
**"At the standard, 20 of 20" in green**. The recital sentence lived inside the
expanded row, which is the half a student has to go looking for. The band is the
half she reads.

So this ADR said coverage reached by reciting is a failure while the interface
said it was the best possible result, on the same stimulus, at the same moment.

### Decision

A stimulus flagged Reciting does not wear a band. Its collapsed row says
**"Said back word for word"** in neutral type, with no success colour and no
success dot.

Deliberately not a fifth band and deliberately not red. A recital is not a worse
score -- it can carry every Detail, and that is the whole problem. The row is
saying that the number beside it did not come from memory, which is a statement
about the method rather than a mark against her.

The count stays. "20 of 20" is a true reading and suppressing it would hide
evidence rather than correct a claim; what changes is that nothing beside it
calls that a success.

### Consequences

**The band and the tip can no longer disagree.** They were two renderings of one
judgement and only one of them was reachable without a click.

**This depends on the Reciting threshold being right**, which it was not: see
[0022](./0022-reciting-is-a-share-not-a-streak.md)'s 2026-09-04 amendment, where
four of Joshua's own 274 model runs were flagging. Suppressing the band on a
false positive would have turned honest rows grey, so the threshold was fixed
first.

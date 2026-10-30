# 0025 — The Read is the second number

Date: 2026-09-03
Status: accepted
Extends [0018](./0018-full-coverage-is-not-a-hundred-percent.md).

## Context

Every one of the 1,294 authored stimuli carries `the_read`: the analytical
takeaway a student should arrive at, plus `the_read_type` naming which of four
moves it is (13 Loophole, 4 Inference, 4 Conflict, 1 other on PT102.S3 alone).

Three places promise it is checked.

- The briefing tells her, in her own words, "This is the part that gets scored."
- The coach rubric authored on the Activity says "Score The Read against the
  captured key for that stimulus, not against a retelling. A different name for
  the same move is fine; missing the move is not."
- The section spec makes it the drill's accuracy criterion: "Accuracy: −5 or
  better on The Read."

Nothing measured it. Coverage was the only number: the memory half. The
reasoning half — the half the method is actually built around, and the half that
predicts an LSAT score — was authored, promised twice, and looked at by nobody.

On the trial run, re-graded, 15 of 22 stimuli got a Read at all and 12 of those
found the move. Seven had none. A card reporting 92% Coverage and nothing else
told that student she had a good night.

## Decision

**The Read is judged, per stimulus, in the same model call as Coverage.** The
key is put in the prompt; a stimulus with no authored Read simply omits the
whole block rather than asking about an empty one.

**Two flags, not one.** `read_given` — did she say anything analytical about
what the argument is DOING, as opposed to retelling what it says. `read_matches`
— was it the same move as the key. They fail differently and need different
things said to her: no Read at all is a habit that stopped at the retelling, a
Read that missed the move is comprehension.

**A Read that was never given cannot match.** Enforced in `gradeStimulus`
rather than trusted to the judge, so a model answering both true cannot invent
one.

**Absent is "no Read", never a pass.** Same rule as colour. A judge that forgets
the field must not be able to award it, and a grade written before The Read was
measured reports honestly as not having one rather than as a zero.

**The Report Card shows two numbers side by side**, Held and Understood. A card
showing only Coverage says the drill is about memory.

**And the goal now depends on it.** The spec says the goal counts "only if every
stimulus was recalled, coloured, AND given a Read", so `within_goal` requires
all three and `within_time` carries the raw clock separately. "Inside the time
but skipped the colouring on four" and "over the time" are different things to
be told.

## Consequences

**No extra model call and no extra cost.** It rides the judgement already being
made per stimulus.

**`within_goal` gets harder, correctly.** The trial run was inside 25 minutes at
21:34 and now does not make the goal, because four stimuli were uncoloured and
seven had no Read. Before today it was told it had made it.

**`the_read_type` is stored per stimulus and not yet used.** Four kinds of move,
recorded on every graded stimulus, waiting for enough runs to say whether a
student misses Loophole reads specifically. That is a report, not a decision.

**Older grades are legible as older.** `read_given_count` is absent rather than
zero on anything graded before today, and every surface that reads it says "not
asked" rather than drawing a nought.

## Alternatives considered

**A second, separate judgement call per stimulus.** 22 more calls per section,
for a judgement that needs the same transcript and the same context. Concurrency
already made the judging stage cheap; doubling it to keep two prompts tidy is
paying in latency for an aesthetic.

**Score The Read numerically, as the spec's "−5 or better" suggests.** That
scale belongs to a full section score and means nothing per stimulus. Given the
move / missed the move is the judgement the rubric actually describes, and it is
the one a student can act on.

**Fold The Read into Coverage as extra Details.** It would disappear into an
average of twenty other things, and it is the one that predicts a score. Two
numbers, and the second is the important one.

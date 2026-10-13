# 0013 — She chunks freely; the app does not track where she is

Date: 2026-09-01
Status: accepted
Extends [0012](./0012-the-recall-is-a-recap-from-memory.md).

## Context

The section runner carries a cursor that walks chunk by chunk through a
`read` then `speak` phase, and a rail that highlights the chunk she is on.
`chunkStates` exists to render it. The grain is ours: PT102.S3.Q1 is cut into
four chunks holding 8, 5, 4 and 4 Details.

Two things are wrong with holding her to that grain.

She may not chunk the way we cut. Taking the first two sentences together is a
legitimate way to work the drill, and a cursor that expects otherwise scores her
for disagreeing with our line breaks rather than for what she retained.

And the cursor cannot be driven without her telling it where she is. She is
silent through every Read, so silence carries no information — a pause while
reading and a pause after finishing are the same signal. That leaves tapping
once per chunk, which puts roughly 90 taps in a 25-minute section and desyncs
the whole recording if one is mistimed.

## Decision

**The app does not track which chunk she is on.** The full stimulus is on screen
throughout, she reads, recalls and colours in whatever units she likes, and the
recording runs unbroken. Which parts she covered is worked out afterwards from
what she said, not from where a cursor was pointing.

**Coverage is therefore a per-stimulus number.** All 21 of PT102.S3.Q1's Details,
counted across everything she said about that stimulus — her Reading Recalls,
her Colouring In and her Recall together — rather than per Chunk. A Chunk stays
the unit content is authored in and a guide for her eye; it is not a boundary
she is graded against.

**One key, pressed twice per stimulus.** She presses **Recall Full Stimulus**
when she is ready, and the text vanishes. She presses it again when her Recall
is finished, and the next stimulus loads. Those two moments are the only ones
not recoverable from the audio, and stimulus-level segmentation comes from
knowing what was on screen when.

**Nothing is revisitable.** A stimulus she has passed does not come back until
the Report Card at the end of the section.

## Consequences

**The chunk cursor and its rail come out.** `chunkStates`, the `read`/`speak`
phase pair and the per-chunk advance rules lose their purpose. What replaces
them is a stimulus-grained cursor with two states: working, and recalling.

**She loses her place marker.** The rail told her how much of the stimulus was
left against the clock, and nothing replaces it. Accepted: the stimulus is four
sentences on screen in front of her, which is its own marker.

**Grading gets harder and content gets easier.** Attributing an utterance to a
Detail is now the grader's problem rather than something the cursor answered for
free. In exchange, content no longer has to cut chunks at boundaries she will
agree with, because she is never held to them.

## Alternatives considered

**One tap per chunk to move the rail, ungraded.** Offered and declined. It keeps
a control on screen whose only job is to be ignored by the grader, and a
mistimed tap still desyncs the display from the recording.

**Advance on silence after the Recall instead of a second press.** Rejected once
the press existed anyway. A second press on the same key costs nothing and
removes a timeout that would cut her off mid-sentence if she paused to think.

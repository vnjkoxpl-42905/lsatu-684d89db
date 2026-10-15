# 0010 — A Read, Recall, Colour run is a section, not a stimulus

Date: 2026-08-31
Status: accepted
Supersedes nothing. Extends [0009](./0009-read-recall-colour-is-a-runner-not-a-world.md).

## Context

ADR 0009 gave RRC its own runner because its answering unit is smaller than an
Item: one Item is a whole stimulus worked as a sequence of chunks. That was
correct and is unchanged.

It was also incomplete. The Activity was built around a single stimulus because
the calibration fixture had one, and the v1 spec's content pipeline says
"stimuli come from the existing bank" without saying how many constitute a run.

The source method has an answer, and it is not one. Its drill card and its
foundation routine are written about **a section**:

- the time goal is 20 minutes, and it is a goal for a section
- the goal is valid only if *every* stimulus in the section was recalled,
  coloured and given a Read
- the recording is one file, started before the first stimulus and never paused
  or stopped until the last
- the prescribed volume is three or more consecutive sections a day
- review happens in a separate sitting, never between stimuli

Every one of those is a statement about a unit larger than the Item the runner
currently models. A run of one stimulus cannot be timed against a 20-minute
goal, cannot carry an unbroken recording that spans anything, and cannot be
reviewed "afterwards" in any meaningful sense.

There is a second forcing fact. Two questions frequently share one stimulus —
PT105.S2 has two such pairs, so 25 questions are 23 stimuli. If the unit were
the question, she would recall the same dialogue twice in one run.

## Decision

**The unit of an RRC run is one Logical Reasoning section.** An RRC Activity is
a section; its items are that section's distinct stimuli, collapsed so a shared
stimulus appears once; and the run's contract — timer, recording, completion,
scoring — belongs to the section rather than to any item inside it.

Three things follow, and each is a real change:

**The coach leaves the loop.** Nothing is judged or shown until the section
ends. This reverses the behaviour `useRecallCoach` implements today. It is not
a performance concession: a live verdict teaches her to vet an utterance before
speaking it, which is precisely the habit the colour stage exists to break, and
it cannot coexist with a recording that never pauses.

**`cumulative_after` and `credited_answers` go empty.** The drill has no
cumulative rounds; The Read at the end of each stimulus is the synthesis, and a
cumulative round would be a second one. `credited_answers` exists only to be the
cumulative round's reference, so with no round it references nothing. The Read
is scored against the captured key instead.

**Scoring The Read becomes possible.** v1 deferred it as "content work that
would block shipping." The key was captured on 2026-08-30: 5,015 typed Reads,
one per LR question. The blocker is gone, not worked around.

## Consequences

**A second content shape.** Section content carries `mode`, `time_goal_minutes`,
`source_section`, and per item `the_read`, `model_recording`, `questions[]`.
Single-stimulus RRC content stays valid, which matters because the existing
fixture is what the runner's tests are written against.

**Section mode is gated on recording coverage.** Each stimulus offers a model
recording in review, so a section missing one shows a dead play button. Only 5
captured sections have complete coverage, so those are the ones that ship. This
is a content constraint, not a code one, and it lifts as coverage grows.

**The dead-air check needs windowing.** She reads silently and speaks only the
recall and the colour, so silence during a read is correct behaviour. A naive
silence detector would fail every chunk. The windowing is not optional polish;
without it the check is worse than absent.

**Two runners' worth of surface, still one runner.** Section mode is the same
`spoken-recall` runner with a section-scoped session, not a third path. ADR 0009
warned that duplication was the accepted cost of a second runner; this decision
declines to pay it a second time.

## Alternatives considered

**Keep the stimulus as the unit and let a teacher assign 23 of them.** Rejected.
The timer, the unbroken recording and the "every stimulus" condition are all
section-scoped; 23 assignments would produce 23 recordings and 23 clocks, which
is the opposite of what the drill requires.

**Model the section in the Drill engine instead.** Rejected, and the glossary
rejects it first: a Drill is a timed run over multiple-choice questions pulled
by `qid`, and an Activity is not a Drill. This run shows no answer choices and
never asks her to pick one. Joshua was explicit that regular Drills and regular
sections stay untouched.

**Score The Read with an authored key per stimulus.** Rejected as unnecessary
now. It was the v1 plan only because no key existed; a captured key covering
every LR question is both cheaper and more faithful than anything we would
write.

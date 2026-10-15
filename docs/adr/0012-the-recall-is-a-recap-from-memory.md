# 0012 — The Recall is a recap from memory, not a takeaway

Date: 2026-09-01
Status: accepted
Extends [0010](./0010-rrc-section-is-the-unit-of-work.md).

## Context

ADR 0010 decided that scoring The Read had become possible, because the key was
captured on 2026-08-30: 5,015 typed analytical takeaways, one per LR question.
The runner was built to match. `SectionPhase` is `read | speak | the-read`, all
four chunks stay on screen through the final phase, and she says one sentence
against that key.

Working the drill through from the student's side says that is the wrong end of
a stimulus to test. Nothing in the run ever checks whether she still holds the
argument. She can see every chunk while she produces her takeaway, so the one
faculty the method is built to train — carrying a stimulus without the text in
front of her — is the one faculty the activity never exercises.

The source method has the missing step. Proto-Stimulus Rebound's step 2 is
"cover the stimulus and say the full Translation from memory," and its recap
standard is explicit: own words are fine, reordering is encouraged, and
"efficiency is never a licence to leave information out." Names, dates and lists
are never dropped.

## Decision

**At the end of a stimulus the text is removed and she says the whole argument
back from memory. That is The Recall, renamed here from The Read.** No analytical takeaway is spoken and none
is scored.

The stimulus does not return once she has recapped it, she is shown nothing
about how she did, and the next stimulus follows automatically.

The Recall is graded on **Coverage**: how many of the stimulus's authored Details
she carried. ([0013](./0013-she-chunks-freely-and-the-app-does-not-track-it.md)
later widened this to count everything she said about the stimulus, not the
recap alone.) PT102.S3.Q1 has 21 across its four chunks. Grading applies
the source's standard rather than a similarity threshold — the only failure is
omission — and names the two ways a full-Coverage recap can still be wrong:
**Reciting** it close to word-for-word, and **Listing** it as flat facts rather
than a story.

## Consequences

**The captured key goes unused.** 5,015 rows and `the_read` / `the_read_type` on
every item stay in the content and are read by nothing. They are the whole cost
of this decision, and they are why it is worth recording: a future reader will
find a fully captured answer key wired to nothing and assume it was an
oversight.

**The takeaway is deferred, not rejected.** Joshua was explicit that analysis is
a later level. Turning it on needs no content work and no new capture; the key
is already there and already typed.

**Step 4 is renamed.** "The Read" was named after the takeaway it no longer
contains, and it sat one definite article away from step 1's **Read**. Step 4 is
now **The Recall**, which says what it is and pairs with **Reading Recall**, the
per-chunk version of the same act. The `the-read` phase in `section.ts` and the
`the_read` content fields still carry the old name and are the rename's cost.

**Section goals move.** A ~15-second recap on every stimulus replaces a
~3-second sentence, so the standard goal rises from 20 to 25 minutes and scales
by the student's real accommodation multiplier (50% extra, double time) rather
than by a smaller bump of its own.

**Each stimulus yields one number.** With no takeaway there is no second score
to blend or show, so the Report Card carries a Coverage percentage per stimulus
plus tips.

**Grading is a post-section job.** Roughly 92 Detail judgements per section, all
of them after she finishes, run server-side once the section ends rather than in
her tab.

## Alternatives considered

**Keep the takeaway and score it against the key.** Rejected. The recap has a
checkable rule and the takeaway has a judgement call, and mixing them makes the
memory drill's score depend on an analysis verdict Joshua does not want yet.

**Keep the takeaway and capture it unscored.** Offered and declined. It would
have cost nothing to store, but it puts an ungraded artifact on the Report Card
in a version whose whole subject is memory.

**Do both acts: takeaway with the text up, then a recap with it hidden.**
Rejected. Two acts per stimulus pushes a 22-stimulus section past 30 minutes
before any thinking time, and the takeaway half is the half being deferred.

# 0023 — A section never resumes

Date: 2026-09-03
Status: accepted
Extends [0010](./0010-rrc-section-is-the-unit-of-work.md).

## Context

Every Activity in the Centre resumes, and should. `activity_item_responses` is
a complete log of where a student got to, `ActivityRunner` replays it on open,
and the intro is the front door exactly once: a student working an Activity over
five sittings should not read the rules five times.

Read, Recall, Colour in section mode inherited that, and it is wrong in both
directions.

**There is nothing to resume into.** The unit judged is the whole section
(ADR 0010) against one unbroken recording. A run rejoined at stimulus 12 is a
different sitting with a different recording, and the grader would score the
second sitting's audio against a mixture of both.

**And resuming it is dangerous rather than merely wrong.** The resume branch
lands on `running`, and for this player `running` means the microphone opens and
the clock starts with the briefing skipped. So once the link had been opened
once — including by accident — every later visit began a live, recording,
clocked run. That is how the trial run of 2026-09-03 began: by accident, from a
link, with no rules page and no start.

The state is sticky, which is what turns a one-off into a permanent condition.
A section abandoned halfway leaves `status = 'in_progress'` for ever, because
nothing marks an abandoned run as anything, so the dangerous path is the only
path the assignment ever takes again.

There is a third fault sitting on top of both. The rows an abandoned sitting
leaves behind are kept on purpose — they are what makes a crashed run
recoverable — and `reconstructProgress` read them as progress through this run,
so the briefing offered "Back to stimulus 6" over a button that correctly starts
a fresh Attempt at stimulus 1.

## Decision

**A section always opens on its briefing and a deliberate start.** Regardless of
`status`, regardless of how many stimulus rows are on record, on every device
and at any later date.

**The rows from an abandoned sitting stay where they are, and cost nothing.**
The next run takes the next `attempt_no` and the grader reads only the Attempt
it was asked for, defaulting to the newest.

**Between Start and the first stimulus there are three seconds.** The recorder
is already running through them, so the level indicator is live and a muted
microphone is visible before any of it counts; the section's own clock does not
start until the beat ends, so the three seconds are not charged to her goal.

A finished section is unaffected: it routes to its Report Card, which is the
only completion screen it has.

## Consequences

**A section cannot be continued, only re-run.** That is the honest position and
it was already true; what changes is that the product now says so instead of
pretending otherwise and producing a corrupt grade.

**Every open of a section costs the briefing.** For a student doing three a
night that is a page she skims. The alternative was a page she never saw again
after the first night, on the one drill whose rules she is most likely to have
misremembered.

**An abandoned run still leaves `in_progress` behind.** Not fixed here, and no
longer harmful: `status` is advisory (ADR 0019) and nothing now reads it as
"resume into a live recording". A run that is never finished is simply never
graded. (Superseded on this point by ADR 0027: starting again from the library
marked the old run `completed`, which is exactly what gets graded. It is now
marked `abandoned`, and the grader refuses a run that does not cover its
section.)

## Alternatives considered

**Resume only when the recording could be continued.** It cannot: a
`MediaRecorder` is per-tab and per-sitting, and appending a second file to the
first would break the offsets every Coverage score is cut against.

**Ask her whether to resume or start again.** A dialog on the way into a
twenty-five minute unrepeatable take, whose correct answer is always the same,
in front of a student who is about to concentrate. The correct answer being
always the same is the argument for not asking.

**Clear `in_progress` on abandonment.** Nothing observes the abandonment. The
tab is gone, which is the whole problem, and a server-side sweep would be a
second thing deciding what a run was.

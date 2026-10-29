# 0032 — A dispute is an event, with its own table

Date: 2026-09-04
Status: accepted
Completes [0030](./0030-the-card-says-one-thing-to-do-next.md), whose W7 shipped
its sentence and left its control unbuilt.

## Context

The 2026-09-03 audit found the failure this exists for. Stimulus 5's judge
reason quoted her as saying "clearly moral characters". The recording says
**immoral**. Deepgram dropped the prefix, and the card told her she had given
the wrong Read.

The v1 spec had already named transcription error as the top risk and named
showing her the transcript as the mitigation. The transcript was shown. Nothing
said what it was *for*, and nothing let her say the marking was wrong. ADR 0030
shipped the sentence — the marking is done from these words, and if they are
not what you said the marking is wrong, not you — and deliberately stopped
there, because where a dispute is stored is a product decision and nobody had
made it.

Joshua made it on 2026-09-04: its own table.

## Decision

**`public.activity_grade_disputes`, one row per disputed stimulus per sitting.**

It is not a column on `activity_section_grades`, and the session that asked the
question had just proved why by accident. A `force` re-grade of assignment
`f8684334` attempt 2 ran that morning and **replaced the whole grade row**. A
dispute living on that row would have been destroyed by precisely the operation
it was about.

That is the same shape as the mistake [0028](./0028-a-failed-response-row-is-retried-and-named.md)'s
sibling order avoided in W17: a stash that shares a lifetime with the thing it
protects against gets deleted by the event it exists for. Here the event is a
re-grade, and a re-grade is the most likely consequence of a dispute being
right.

Two further reasons the column was wrong:

- **There can be several.** She may dispute four stimuli in one section, at
  different moments. A column holds one; a table holds what happens.
- **It has to outlive its subject.** `source_section`, the band and the judge's
  reason are denormalised onto the row on purpose, so the dispute stays legible
  after a re-grade has rewritten everything it referred to.

**It is deliberately not a workflow.** No status, no assignee, no resolution
state. The order asked for a stored flag and a place Joshua can see it, and a
triage state machine would be answering a question nobody asked. Visibility is
an admin `select` policy, so he reads them the way he reads everything else in
this project.

**She may raise and read; she may not edit or withdraw.** A dispute is an
event, and an event that can be unsaid is not evidence of anything. One row per
`(assignment, attempt, stimulus)`, so a second tap is a student checking it
registered rather than a second complaint.

**A dispute that did not save never looks like one that did.** Every read path
in this feature treats a missing table as an empty result, which is right for a
read and exactly wrong here. `raiseDispute` returns `not-configured` and
`failed` distinctly from success, and the control says something true in both
cases. Telling a student "Noted" while the row went nowhere would be a lie told
on the one screen whose entire subject is the app getting her wrong.

## Consequences

- The control is on the expanded row, not the card head: it is about one
  stimulus's verdict, and the clip and the transcript are beside it, so she can
  check before she claims.
- It is a quiet text button rather than a call to action. The card must not
  invite a student to dispute every band she dislikes.
- Nothing reads the table yet beyond the admin policy. A teacher surface is a
  follow-up if Joshua wants one, and is explicitly not part of this decision.
- The table is applied to production as of 2026-09-04, with RLS on and all
  three policies live. The migration is
  `20260904140000_a_verdict_resting_on_a_mishearing_can_be_disputed.sql`.

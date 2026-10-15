# 0021 — A partial grade is written, and says so

Date: 2026-09-03
Status: accepted
Extends [0019](./0019-a-grade-the-student-can-write-is-not-a-grade.md).

## Context

The first end-to-end trial of a Read, Recall, Colour section ran on 2026-09-03:
PT102.S3, 22 stimuli, 21m34s against a 25-minute goal, driven through the real
product. Everything up to the grade worked. The recording was one unbroken
21.5-minute file, the upload landed, the clock proof held to within 1 ms, and all
22 response rows were written with their phase boundaries.

`grade-rrc-section` then returned 504, and `activity_section_grades` was empty --
not for this run, for its whole life. The production grader had never
successfully written a row.

The cause is in the shape of the function rather than in any of its logic. It
judged the 22 stimuli in a `for` loop, one model call after another, and 22 round
trips do not fit inside an edge function's wall clock. Judged all at once against
the same saved transcript, the same calls take about 20 seconds.

Two further things follow from that loop, and both are worse than the timeout.
A single failed judge call threw out of the loop, past the write, and lost the
whole section -- including the transcription already paid for. And because the
client `await`ed a request it documents as fire-and-forget, the student sat on
"Section finished" for the entire 150 seconds before the 504, with a Report Card
screen already built and polling on the other side of it.

## Decision

**The stimuli are judged concurrently, at a fixed bound.** Eight at a time,
through one helper in the shared grading module. Bounded rather than unbounded
because the judge is a rate-limited API and an unbounded fan-out trades a timeout
for a wall of 429s. Results come back in section order, not completion order,
because the Report Card is read top to bottom.

**A stimulus that cannot be judged costs its own grade and not the section's.**
The failure is caught inside the per-stimulus work, and that stimulus is returned
carrying `ungraded` with the reason. The section is written with whatever landed.
A run that was recorded, uploaded and transcribed correctly is never discarded
because a model call failed.

**`ungraded` is not zero, and every count knows the difference.** An unjudged
stimulus is excluded from Coverage's denominator and from the Reciting, Listing,
uncoloured and decoy tallies. Counted as a zero it would deflate her Coverage;
counted as uncoloured or as a decoy pass it would report our outage as her habit.
On the trial data, two failed judge calls would have shown 82% instead of 91%,
and six uncoloured stimuli instead of four.

**`section.complete` says whether every stimulus actually got a judgement**, and
it is the one flag the sweeper reads. A partial grade must not pass for a
finished one, or the run that most needs re-driving is the one nothing will ever
look at again. A grade row written before this flag existed has no `complete` key
and is treated as complete: it is a real grade, and re-driving every one of them
would be a re-grade, not a sweep.

**A stored grade keeps the section's authored shape.** Every stimulus grade
carries its `item_order`, and the section summary carries `stimuli_in_section`
from the assignment snapshot. The Report Card labels a row with that stored
position rather than its array index. If response rows are absent, it names the
real saved count and the real section count, and says the missing rows are ours.
Grades written before these fields existed keep their array-order labels and do
not receive a missing-row claim that cannot be proved from their stored data.

**`sweep-rrc-grading` is the guarantee behind the client's ask.** It re-drives
sections that are ten minutes past finishing and have either no grade row or an
incomplete one, three per run, oldest first. It writes no booking heartbeat: an
ungraded section is not a booking outage.

> **Correction, 2026-09-04.** This paragraph said the sweeper "is scheduled
> externally on the pattern in `docs/ops/native-single-session-workers.md`". It
> is not scheduled anywhere, and was not when this was written. Checked three
> ways: `cron.job` in the project's own Postgres holds four jobs, all of them
> booking and calendar (`booking-gcal-reconcile`, `booking-gcal-sync-pull`,
> `booking-upload-cleanup`, and a disabled `gcal-sync-pull-every-5-min`); the
> 2026-09-03 audit found only three paused transcript jobs in Cloud Scheduler
> and no launchd agent on Joshua's machine. The doc that paragraph pointed at
> is a specification of what SHOULD be installed, headed "Install authenticated
> scheduler calls outside the migration", and nothing installed them.
>
> So the guarantee in the sentence above does not exist. A section whose
> client-side ask is lost is recovered by the 120-second retry or not at all,
> and since 2026-09-04 by ADR 0028's row recovery on the next entry, which
> covers a different failure and not this one. Scheduling it is one `cron.schedule`
> away and needs a decision about where the worker secret lives, so it is
> Joshua's to make rather than something to do quietly.
>
> **Decided, 2026-09-04: it stays unscheduled.** Joshua's reasoning is that a
> section grades itself on submit, which it does — the client fires the ask the
> moment the run ends. So the sweeper is not the grading path, it is the
> backstop for an ask that was lost, and he is content to carry that risk rather
> than install a cron whose worker secret would have to live inline in the
> command text the way the four booking jobs' does.
>
> **What that leaves uncovered, stated plainly so a later session does not have
> to rediscover it:** a run whose grading ask never left the browser — the tab
> closed on submit, the network dropped, the function was cold — has no second
> chance and produces no Report Card. The 120-second retry is the only cover.
> The evidence that would reopen this is a finished run with no grade, not an
> argument; `select` for `status = 'completed'` section assignments with no
> matching `activity_section_grades` row and it is visible immediately.

**The grader accepts the service role key as a trusted caller.** A sweep has no
user to present, and `getUser` returns no user for a service-role token, so the
ownership check had no answer for it. The key never leaves the server and already
grants everything the grader's own reads do, so naming it here widens nothing.
It is compared in constant time and checked before `getUser`.

## Consequences

**A section grades in about the time of its slowest single call.** The trial's
22 stimuli, re-run through the patched path against the same saved transcript,
scored the same 91% mean Coverage the serial run did.

**The absence of a row still means ungraded, so ADR 0019's pending signal is
intact.** There is exactly one write, at the end, and it is the completeness flag
inside it -- not a second, earlier row -- that carries partiality. A student
polling for her Report Card never sees an empty one appear and then fill in.

**A partial Report Card is now a state the screen can be handed.** Nothing reads
`ungraded` yet: a Detail she did not carry and a Detail nobody asked about look
identical in `missed` until it does. That is the next change, not this one.

**A gap no longer renumbers the rows after it.** A section with response rows 1
to 7 and 9 to 26 shows Stimulus 9 after Stimulus 7. Its headline says how many
of the stored section were marked, and a separate notice says how many response
rows did not save.

**The sweeper shares `BOOKING_WORKER_SECRET`.** A deployment has one worker
secret; splitting it is a rotation exercise, not a security one, and can happen
whenever the ops doc's rotation runs.

## Alternatives considered

**Write a row as soon as the transcript lands, then update it as stimuli
arrive.** This is true incremental persistence and it saves the Deepgram call on
a retry. Rejected: it breaks ADR 0019's contract that the absence of a row is the
pending signal, and hands the polling Report Card a real row with zero stimuli in
it. Resilience bought the same protection without touching that contract.

**Split the section across several function invocations, a few stimuli each.**
Rejected as premature. It is the answer if a section ever outgrows one wall clock
again, and at eight-wide the judging stage is now roughly one call long, so it
would be machinery for a problem that no longer exists.

**Let a failed judge call fail the section, and rely on the sweeper to retry.**
Rejected. It is simpler, and it means one flaky call throws away a transcription
and re-runs 21 judgements that already succeeded. It also leaves nothing on
record between the failure and the sweep, which is the state the student was in
for this entire trial.

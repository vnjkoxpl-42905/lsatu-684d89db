# 0028: A failed response row is retried and named

Date: 2026-09-03
Status: accepted
Extends [0027](./0027-a-run-is-graded-once-and-an-abandoned-one-never.md).

## Context

The section runner sends a response row whenever a stimulus finishes, then
re-sends every row when the section ends. The first save only logged a failure.
The final save put every response into one database statement, so one rejected
row could reject every good row beside it. The student saw neither failure.

The grader refuses a run whose response rows do not cover the assignment. A
lost row is therefore not a partial score. It is a finished recording that
cannot yet produce a Report Card.

## Decision

Each response is stored in its own idempotent upsert. A failed in-run save gets
three attempts with bounded exponential backoff while the student continues
working. The retry queue is naturally capped by the section's stimulus count.

When the section ends, pending timers are cancelled and in-flight saves are
allowed to settle. The backstop then submits every response again, one row per
statement. One rejected row cannot prevent another row from reaching storage.

If any response is still absent after the backstop, the finishing screen names
the real count. It says the recording reached us only when the upload actually
succeeded. The runner does not ask the grader to mark an incomplete attempt and
does not hand the student to a Report Card that can only wait. The assignment
is still closed because she did the work; the storage failure is ours.

## Consequences

A brief outage can recover during the reading time that remains in the section.
A permanent row-specific failure leaves the other responses stored. The
student is interrupted only after the one-take run is over.

An attempt with a permanently missing response stays on the finishing screen
with a route back to the Activity Centre. It needs an operational recovery
before grading. This is preferable to displaying a spinner for a grade the
server has correctly refused to invent.

## Alternatives considered

**Keep the multi-row backstop and retry the batch.** Rejected because a single
bad row would continue to poison every retry.

**Show a warning as soon as a save fails.** Rejected because a transient network
failure should not interrupt an unrepeatable spoken run, and most such failures
can recover before the student finishes.

**Ask the grader even when a row is missing.** Rejected because the grader's
coverage check returns 409 by design. Sending the request would create traffic,
not a Report Card.

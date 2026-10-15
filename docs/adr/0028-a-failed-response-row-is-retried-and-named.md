# 0028: A failed response row is retried and named

Date: 2026-09-03
Status: accepted
Amended: 2026-09-04 (see "Amendment: the missing row has a way back")
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

*(Superseded 2026-09-04 by the amendment below: the recovery is no longer
operational, and no longer a thing only Joshua can do.)*

## Alternatives considered

**Keep the multi-row backstop and retry the batch.** Rejected because a single
bad row would continue to poison every retry.

**Show a warning as soon as a save fails.** Rejected because a transient network
failure should not interrupt an unrepeatable spoken run, and most such failures
can recover before the student finishes.

**Ask the grader even when a row is missing.** Rejected because the grader's
coverage check returns 409 by design. Sending the request would create traffic,
not a Report Card.

---

## Amendment: the missing row has a way back

Date: 2026-09-04

The decision above is unchanged. What it left behind was a run that could say
what was wrong with it and could never become right.

The rows live in `records.current` — in memory, in a component about to
unmount. She leaves the finishing screen and the answers are gone, and ADR 0027
then refuses that run for ever, the sweeper included. The cruel version of it is
the common one: the recording uploaded perfectly, and there is nothing that will
ever mark it.

This was not a regression. Before this ADR the same run was equally ungradable;
it polled in silence instead of saying so. Naming the failure made it visible
and did not repair it.

### Decision

**A row that does not land is stashed on her own machine, beside the
recording,** in the same IndexedDB database `recall/recordingBackup.ts` already
keeps the audio in, and re-sent by `recoverPendingRows` on the next entry into
any section. This is the mechanism the other half of the same failure has had
since the backup existed; rows simply had no sibling.

**A separate store, not a field on the run record.** The obvious shared
lifetime is the wrong one. A run whose recording uploads is discarded the
instant it lands — that is what `discard` is for — and the missing-row case is
very often exactly that run. Hung off the run record, the rows would be deleted
by the success of the upload. They are bounded by their own age instead, on the
same seven days, by `purgeStaleRows`.

**The grade is asked for when the run's last stashed row lands, and at no other
point.** Asking on a partial recovery buys the certain 409 that this ADR's own
"Ask the grader even when a row is missing" alternative rejected.

**Silent and best-effort, like the recording pass.** It runs on the way into a
screen she asked for, and a failed recovery must never be the reason that
screen does not open.

**The finishing sentence names the repair**, in all three of its shapes — rows
lost, recording lost, both lost — rather than only for the audio.

### Consequences

**The finishing screen stops being a dead end.** It is still an interruption
after a one-take run, and it is now an interruption with an instruction that
works: open the section again from the same browser.

**Recovery no longer means Joshua.** The paragraph above that called for "an
operational recovery before grading" described the absence of this.

**It repairs the tab, not the machine.** IndexedDB is per browser profile, so a
student who finishes on a laptop and next opens the app on her phone still has
an unrecoverable run. The same limit the recording backup has always had, and
the same one the copy states plainly.

**A stash that cannot be written changes nothing.** Private windows and full
disks make IndexedDB throw, and the run is then exactly as ungradable as it was
before this existed, and no worse.

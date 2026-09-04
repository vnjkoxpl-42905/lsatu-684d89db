# 0027 — A run is graded once, and an abandoned one never

Date: 2026-09-03
Status: accepted
Extends [0023](./0023-a-section-never-resumes.md) and [0026](./0026-a-report-card-per-attempt.md).

## Context

The first end-to-end run of a section as a student (PT134.S3, 26 stimuli,
46 minutes, audited 2026-09-03) produced a Report Card, and four things on the
ordinary path lost or mis-scored her work.

**A stimulus with no browser transcript was never saved.** The runner wrote
`response_text: null` into a NOT NULL column. Postgres refuses an explicit null
even when the column has a default, so any stimulus Chrome's recogniser heard
nothing in vanished from the run, the end-of-run backstop failed as a whole
statement with it, and a browser with no `SpeechRecognition` at all (Safari,
Firefox) could not save a single row. ADR 0017 described the null as the
design; it was the bug.

**The grader ran twice.** The runner asks for a grade as she finishes; the
Report Card asks again after twenty seconds "in case the first ask was lost". A
grading takes one to three minutes and wrote nothing until it finished, so the
second ask found no grade and ran too. Two transcriptions, two sets of verdicts
on the same audio, and a card that showed the first while the database kept
the second. Temperature 0 is not determinism.

**A second tab discarded the live run's crash backup.** The local backup marks
a run as live in a module-level Set, which is per tab. Any other section page
opened mid-run ran recovery, found the live run pending with no claim it could
see, uploaded its first minutes over the run's own path and threw the backup
away.

**Starting again from the library graded the abandoned run.** The RPC that
opens a fresh Attempt marked the old, unfinished one `completed`, and
`completed` with rows is exactly what the grader and the sweeper grade. A run
abandoned at stimulus 3 came back as "0%, 2 stimuli, inside the time". A
recording recovered from a crash was graded with 44% of its words inside any
window because the clock proof refused only at zero.

## Decision

**`response_text` is a string, never null.** An empty string is a stimulus
with no words; `transcript_source: null` is what says the words were not
captured. The two were conflated and only one of them is a column constraint.

**A grading is claimed before it starts.** `activity_section_grading_claims`
holds one row per Attempt in flight. The grader inserts it before it downloads
audio and deletes it in `finally`; an insert that conflicts with a fresh claim
returns false and the grader answers `202 grading`, which the Report Card
treats like any other ask: it keeps polling for the row. A claim older than ten
minutes is stale and can be taken over, so a grader that died mid-run cannot
hold its Attempt for ever. The Report Card's repeat ask moves from twenty
seconds to two minutes, so the repeat is for a lost ask rather than a slow one.

**The backup record carries its own heartbeat.** `liveUntil` is written when
the run is announced and pushed forward by every piece stored, and recovery
skips any run whose heartbeat is in the future, from any tab. The in-memory
Set stays as the fast path for the recording tab itself.

**An abandoned run is `abandoned`.** A fourth `activity_assignments.status`,
advisory like the others (ADR 0019). `start_section_attempt` marks the old run
with it instead of `completed`; the sweeper only reads `completed`; the
library labels it "not finished" as it already did for `in_progress`. Its rows
are kept, because they are what makes its recording recoverable.

**Only a whole section is graded.** The grader refuses a run whose rows do not
cover every stimulus in the assignment's snapshot, with `409` and the counts.
This is distinct from ADR 0021's partial grade, which is the judge failing on a
complete recording. The sweeper checks the same thing before driving a run, so
a run that lost rows is reported as skipped rather than re-driven for ever.

**The clock proof is a share.** A run with fewer than half its transcribed
words inside any recorded window is refused, not graded against the wrong
words.

## Consequences

- Safari and Firefox students can now finish a section. Their rows carry no
  browser transcript, which was always the design; the grader hears Deepgram.
- A Report Card cannot disagree with itself across devices. There is one
  grading per Attempt and the row it writes is the row every read returns.
- A run abandoned yesterday no longer becomes a graded 0% today. A student who
  abandons and returns sees "not finished" and a fresh Attempt.
- A run that genuinely lost rows is now refused rather than mis-numbered. That
  is a visible failure where there was an invisible one; the sweeper's
  `skipped` list is where it shows.
- Applying the migration is a schema change: a new table, two functions, a
  widened status check, and a rebuilt partial unique index.

## Alternatives considered

**A Postgres advisory lock.** The obvious lock, and it does not survive
PostgREST: a transaction-level lock releases when the RPC returns, a
session-level lock is held by a pooled connection the function never sees
again. A row with a timestamp is the lock that fits the transport.

**Writing a placeholder grade row as the in-flight marker.** It would have
rendered as a Report Card, or needed every reader taught to skip it, and a
stale placeholder would have looked like a finished grade to the sweeper.

**Leaving the abandoned run `in_progress`.** The partial unique index allows
one live run per student and activity, so an old `in_progress` row blocks the
new one. Deleting it throws away the rows that make its recording recoverable.
A status that means what happened is the honest third option.

**Grading a partial run as partial.** ADR 0021's partial grade means "the
recording is whole, the judge lost some stimuli, re-drive it". A run that was
never finished is not that, and labelling it so would have put it in the
sweeper's re-drive queue for ever.

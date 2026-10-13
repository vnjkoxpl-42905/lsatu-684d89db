# 0034 — A recorder dies with its component, and recovery never overwrites

Date: 2026-09-08
Status: accepted

## Context

On 2026-09-07 a student opened PT1.S3 at 23:28 UTC, left it, and came back at
00:06 to run it properly. She finished at 01:12 and her recording uploaded. At
01:30 her Report Card still said "still being marked", and the grader, once it
could read the file at all, refused the run: 3,848 transcribed words, 1,637
inside a window, every window sitting 37 minutes before its speech.

The file in the bucket was 116 minutes long. Her run was 66. The first 37
minutes were room noise; her section sat from minute 37 to 102; then 14 more
quiet minutes. Storage showed the object created at 01:12:34 and **updated at
01:30:49**.

Two things had happened, each harmless on its own.

1. **The first sitting's recorder was never stopped.** `useSectionRecorder`
   closed the microphone in `stop`, which only the finish path called. Leaving a
   section, by the exit button or any route change, unmounted the runner and
   left both `MediaRecorder`s running on an open microphone for as long as the
   tab lived. That orphan recorded the next two hours, through her real sitting
   of the same section and past its end, and its backup copy kept landing in
   IndexedDB every ten seconds, each piece refreshing the run's `liveUntil`
   heartbeat.
2. **Recovery overwrote whatever was at the path.** When she reloaded after
   finishing, the orphan died, its heartbeat lapsed, and
   `recoverPendingRecordings` took it for a crashed run. Both sittings were
   Attempt 1, because the first wrote no rows, so both named the same path. The
   upload was `upsert: true`, and the orphan's 116-minute file replaced the
   66-minute recording the real run had stored eighteen minutes earlier.

The grader has since learned to find the window clock inside a file (`ebe0477`),
which is how the run was eventually graded. That is a repair, not a fix: the
recording of record for that Attempt is still the wrong file, and nothing
stopped the same two faults from meeting again.

## Decision

**A recorder does not outlive the component that started it.** The hook closes
both recorders and the microphone tracks in its own unmount cleanup. Nothing is
handed back: a section she left is thrown away by the drill's rule (ADR 0023),
and the finish path has already been through `stop` before the runner unmounts,
so there is nothing there to close twice.

**A run she leaves has no backup.** The runner discards the backup store's
record and pieces for its run id on any unmount that is not the finish path.
`discard` now takes its place in the per-run write chain and marks the run so
that a recorder's final piece, which arrives as an event after `stop`, cannot
file itself and put the run record back.

**Recovery never overwrites.** The recovered upload is `upsert: false`. A
conflict means the path already holds a recording, which can only have been
written by a sitting that finished, so the pending pieces are surplus and are
discarded. Any other failure keeps them for the next open, as before. Pending
runs are tried newest first, so where two crashed sittings name one path the
one she actually ran is the one that lands.

## Consequences

- The microphone indicator goes out when she leaves a section, which it did
  not before. This is visible and correct.
- A student who leaves mid-run and returns to the same assignment starts on a
  clean backup store. Nothing from the abandoned sitting can reach the bucket.
- Backups already sitting in students' browsers from sittings abandoned before
  this change will still be tried on their next open. They upload only where
  nothing is stored, at the path of an Attempt that never finished, and cost a
  file nobody reads; where a real recording exists they meet a conflict and
  are forgotten.
- The finish path still uploads with `upsert: true`, deliberately: it is the
  run's own file and must replace anything an earlier recovery left at its
  name.
- What is not fixed here: the orphan ran for two hours because nothing in the
  app tells the student a microphone is open outside a section. A page-level
  guard is a different decision.
- Regression tests: `SectionRunner.leave.test.tsx` (the recorder and the
  backup on unmount) and the "never overwrites" block in
  `recoverRecordings.test.ts`.

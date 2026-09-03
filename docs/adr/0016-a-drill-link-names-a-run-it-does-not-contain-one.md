# 0016 — A drill link names a run, it does not contain one

Date: 2026-09-01
Status: Accepted

## Context

Seventeen places start a drill. Nine build a URL; eight hand the drill to
`/drill` in `location.state` and put nothing in the address bar. Refresh one of
those eight and the drill is gone: a saved set, a Smart Drill, a Testing Centre
section. `ptRun` is worse than gone — it never went through the resolver at all
(`Drill.tsx:202`), so a refreshed practice-test leg loses the run id it needs to
write its close-out, and that section can never be marked finished.

`getResolvedDrillRouteState` reads both transports into one shape but only one
way. Nothing turns a launch back into a URL, so the URL grammar is whatever each
caller happened to build, and the two can disagree: several links carry an
assignment id *and* a copy of that assignment's question list.

The obvious fix is to put the questions in the URL. That is the wrong fix. There
is already a durable per-student Run Record holding the ordered question list,
every attempt, the position and the clock spent, and on resume the runner adopts
that stored queue whole rather than re-shuffling (`Drill.tsx:786`). Refresh
already returns the identical run. The only thing refresh destroys is the app's
ability to work out *which run the student was in*.

Separately, `mode` is not the kind. Six materially different things all launch as
`mode=type-drill`, told apart only by which extra flag rides along
(`guidedAssignmentId`, `assignmentId`, `guidedSetId`, `practiceSlug`, `present`).

## Decision

A **Drill Launch** is carried in the URL and nowhere else, and it carries the
*name* of a run, not its contents. `location.state` stops being a transport.

The launch is one discriminated union over nine kinds: Smart Drill, Section,
Saved set, Assignment, Guided drill, Practice set, Bootcamp day, Questions (an
ad-hoc list), and Filter. A practice-test leg is a **Section with a run
attached**, not its own kind: it runs, looks and closes out identically, and the
only difference is that something is waiting on the result.

Anything that has an id is named by that id alone. `?set=abc123` and not the six
qids inside it, so editing a set cannot leave an old link running last week's
questions. Only the ad-hoc list and the filter put a payload in the link, because
they have no row to point at. Guided drills and assignments already resolve their
own questions (`guidedDrills.ts:82`), so nothing is lost.

Switches are split rather than pooled: the cross-cutting ones (back link,
heading, which question to open on) sit alongside the kind, and the rest live
inside the kind that owns them (sealed and timing on a Section, duration on a
Guided drill). A switch that does not belong to its kind is **rejected** when it
would change what the student experiences, and ignored when it is decoration. A
sealed section that silently is not sealed is a broken measurement; a missing
heading is not.

`launchDrill()` and `parseDrillLaunch()` are a matched pair and round-trip.

## Consequences

- A dead link (deleted assignment, deleted set, another student's set) shows an
  error with a way back, rather than falling back to a generic drill. A student
  quietly drilling something nobody assigned is worse than a student reporting a
  broken link.
- An id-only link costs one row read before the drill can start, and it is the
  read that makes the link correct.
- The drill page is not rewritten. A small converter hands it the shape it
  already expects, so the fix lands as a diff that can be read in one sitting.
  The converter is temporary and says so.
- `/drill` canonicalizes its own URL on arrival, which covers any launch path
  missed here. Two buttons still change, because they discard identity the page
  cannot recover: saved sets throw away the set id (`SavedSets.tsx:39`), and the
  bootcamp day button hands over picked questions without saying it was Day 3
  homework (`TodayView.tsx:112`).
- Today's URL grammar is kept as an explicitly-marked legacy branch of the
  parser, and never written. Assigned sections go out as links that sit in a
  student's inbox for weeks; breaking one is a support message from a student.
  The branch is deletable once those links have aged out.
- Rejected: putting the resolved question list in every URL. It duplicates the
  Run Record, produces links too long to send, and would have made a filter
  drill's identity the questions it happened to draw rather than what the
  student asked for.

## When a kind can be named by its id

Found while building this, and it is the constraint that decides the remaining
work. Naming a run by an id is safe only when one of these holds:

1. **Re-resolving the id yields the same questions.** A saved set and a
   classroom assignment both store an explicit list, so re-reading the row on
   refresh returns what the student is part-way through.
2. **The Run Record is keyed by that id rather than by the question list.** A
   guided drill launched from an assignment is keyed `guided::<assignmentId>`,
   so even a different draw finds the right row and adopts its stored queue.

Where neither holds, an id-named link is actively worse than a long one: the
runner re-resolves, draws a different list, computes a different Run Record key
from that list, finds no row, and the student loses a drill they were half way
through. That rules out, for now:

- **A bootcamp day.** Its questions come through a per-student recently-seen
  filter, and its Run Record is keyed by the resulting list.
- **A guided drill with no assignment.** It resolves through a per-student level
  band, and without an assignment id it falls back to the same list-keyed Run
  Record.

Both become safe the moment their Run Record is keyed by the name in the link —
the day, or the drill — which is a separate change and the natural next one.

## Follow-up: generated runs are keyed by their name

Implemented 2026-09-03. A Bootcamp day now writes its Run Record under the day
and part, and an assignment-less Guided drill writes under its drill id. Reads
try that identity key first and consult the old question-list or guided-drill
slug key only when the identity-keyed row does not exist. A completed identity
row therefore cannot resurrect an older in-progress run. The next snapshot
writes only the identity key, so an old active run migrates forward without a
bulk data rewrite.

## Follow-up: the runner reads the launch

Implemented 2026-09-03. The temporary converter is gone, and with it the second
grammar. `drillRouteState` was a parallel reader of the same query string, and
it agreed with the codec only by inspection. The disagreements were latent
rather than live: `?mode=full-section&timer=70` kept its accommodated clock,
because the reader that read `timer` was the one the runner used and the reader
that dropped it was only ever asked about canonical links. Nothing was broken.
The point is that nothing would have told us when that stopped being true — and
switching the runner onto the other reader is exactly the change that would have
made it true. Every such disagreement was closed before the switch, which is
what the golden table of older links in `drillLaunch.test.ts` now holds in
place.

`DrillLaunchGate` now resolves the launch and hands `Drill.tsx` a **Drill Run
Spec** through context. The runner no longer reads the query string for anything
about the run: not the mode, not the assignment id, not the bootcamp day. There
is one reader (`parseDrillLaunch`) and one shape (`drillRunSpecFromLaunch`).

The visible change is that a short link stays short. Previously the gate
resolved `?drill=saved-set&set=…` and immediately replaced the address bar with
the expanded question list, which threw away the naming the whole ADR is about:
the first refresh was already replaying a frozen list. Now the link the student
was sent is the link they keep, and each refresh re-reads the row.

Older links are read but never rewritten, so everything one says has to be read
in `parseDrillLaunch` — there is no second reader left to pick up what it drops.
That is why the legacy branch grew: the timer mode, the practice-test leg, the
initial index, and the identity ids the runner used to read for itself.

An in-memory handover is still written into the address bar, now in the
canonical grammar. What such a handover carries beyond a bare question list —
the mode, whether it is guided, whether it is sealed — travels as a `RunCarry`
under its own params, so writing it out and reading it back cannot quietly turn
a `natural-drill` into a type-drill.

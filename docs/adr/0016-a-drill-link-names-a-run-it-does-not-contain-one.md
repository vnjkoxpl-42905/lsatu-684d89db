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

The launch is one discriminated union over eight kinds: Smart Drill, Section,
Saved set, Assignment, Guided drill, Practice set, Questions (an ad-hoc list),
and Filter. A practice-test leg is a **Section with a run attached**, not a ninth
kind: it runs, looks and closes out identically, and the only difference is that
something is waiting on the result.

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

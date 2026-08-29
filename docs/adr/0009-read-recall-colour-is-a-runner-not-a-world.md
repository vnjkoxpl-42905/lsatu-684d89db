# 0009 — Read, Recall, Colour is a runner, not a world

Date: 2026-08-29
Status: accepted

## Context

Read, Recall, Colour is an Activity: it has a slug, a bank, an `ACTIVITIES`
entry, a generated JSON and an `activities` row like the other eight. The
obvious place to put it is therefore the world registry, where every other
Activity gets its surface, and the spec said so
(`docs/specs/2026-08-29-read-recall-colour.md`, step 3: "the RRC world").

Reading the registry's own contract says otherwise. `registry.tsx` states what a
world is and is not:

> What a world replaces is the LEFT column of the running screen, the cover
> rail. The answer box, the Coach and the verdict loop on the right are
> untouched: a world is the surface an Activity is worked on, not a different
> way of working it.

`WorldBinding.render` takes one `ActivityItem` plus the response the student has
typed for it, and returns one element. `ActivityRunner` puts that beside
`ActivityQuestionStack`, which owns the textarea, the attempt counter, the Coach
call and the verdict.

RRC breaks every assumption in that sentence:

- **There is no typed answer.** She speaks. The textarea, its label, its
  placeholder and its draft persistence have nothing to hold.
- **The unit is not the item.** One RRC item is a whole stimulus, worked as a
  sequence of chunks, so a single item produces many captures, many Coach calls
  and many feedback moments. `render(item, response)` has no way to express
  "chunk 3 of 5, recall phase".
- **The screen is not two columns.** During Reading Recall the screen must carry
  nothing readable at all. A world that hid the answer column would be reaching
  outside itself to do it.
- **The run has phases the stack does not model**: read, hide, recall, feedback,
  colour, and periodic cumulative rounds over everything so far.
- **Advancing is gated on something other than a verdict.** Colouring In must
  happen and is never judged, which is not a state `Verdict` can carry.

Forcing this through `WorldBinding` would mean a `render` that ignores its
`response` argument, a question stack rendered and then hidden, and a phase
machine smuggled into a component whose contract says it draws a cover rail.

## Decision

**RRC gets its own runner.** `ActivityRunner` selects it on
`item_format === "spoken-recall"` and hands off the whole running screen. The
world registry is not touched and gains no RRC entry.

What is reused, deliberately:

- the assignment record, its snapshot, its RLS and its resume behaviour
- `activity_item_responses` for persistence, extended rather than replaced
- the `activity-coach` edge function and its `ideas`/`covered` checklist, which
  is already the per-detail mechanism RRC needs
- the Activity Centre's assignment-gated entry, so a teacher assigns RRC the
  same way as anything else

What is not reused: `ActivityQuestionStack`, `AnswerPanel`, the world registry,
and the item-grained attempt loop.

The session itself is modelled as a pure module (`recall/session.ts`) with no
React in it: the round sequence, the phase machine, the advance rules and the
union-of-details scoring for cumulative rounds are decided there and tested
there. The components render a session; they do not compute one.

## Consequences

**`item_format` becomes load-bearing.** It was a display string
(`TeacherActivities` prints it beside the item count) and is now the switch that
picks a runner. The column is a plain `string` in the database, so this is
additive, but a typo in a seed now shows a student the wrong player rather than
the wrong label.

**RRC stays out of the seed library until the runner exists.** Its slug is
deliberately absent from `ORDER` in `build_seed_migration.py` and from
`SEED_ACTIVITIES` in `content/index.ts`. An Activity in the teacher library can
be assigned, and an assignable Activity with no runner is a student stuck on a
blank screen.

**A second runner is now a real possibility rather than a hack.** Anything whose
answering unit is smaller than an item, or whose medium is not text, has a
precedent to follow instead of a world contract to bend.

**The cost is duplication.** Progress, exit, resume and the completion summary
exist once for the item-grained path and will need equivalents here. That is
accepted: the alternative was one component serving two genuinely different
shapes, which is how `AnswerPanel` came to ask Conditional Rephrase students for
a negation.

## Alternatives considered

**Make it a world and let it hide the answer column.** Rejected. A world would
have to reach outside its own frame to suppress a sibling, and `render`'s
signature still could not say which chunk the student is on.

**Widen `WorldBinding` to carry a phase and a sub-index.** Rejected. That widens
a contract eight working worlds depend on, to serve one Activity that shares
none of the rest of it.

**Ship RRC as a standalone route outside the Activity Centre.** Rejected. It
would lose assignment, the roster, the snapshot and the teacher's view of
results, which is most of the reason it lives in the platform at all.

# 0014 — The section goal is calibrated, and accommodations scale it

Date: 2026-09-01
Status: accepted
Extends [0010](./0010-rrc-section-is-the-unit-of-work.md).

## Context

The source method states its time goals precisely, and section mode shipped
exactly them: **20 minutes** standard, **25** at a 53-minute accommodation,
**30** at a 70-minute one. They are in the drill card, restated in the foundation
routine, and transcribed into the spec's "as captured" table.

Two problems have shown up now that whole sections are actually being run.

**20 minutes is not what a real section takes.** The recorded runs land nearer
25. A goal nobody reaches is not a goal; it is a clock that reads failure every
time, and the drill's own gate ("the goal is valid only if every stimulus was
recalled, coloured and given a Read") makes hitting it by cutting work
impossible on purpose. The number has to describe the work.

**The accommodated goals do not scale.** An accommodation is extra time on the
same 35-minute section: 53 minutes is 53/35 of one and 70 minutes is two of
them. The source's numbers move by a flat +5 and +10, so a student with double
the time is given a goal only half again as long. Her accommodation is scored as
slowness, which is the one thing three numbers exist to prevent.

## Decision

**The standard goal is 25 minutes**, calibrated to what a section actually takes
rather than inherited from the source's 20.

**The accommodated goals are derived, never authored.** Each is the standard goal
times that accommodation's own multiplier, rounded half up:

| Accommodation | Multiplier | Goal |
|---|---|---|
| none (35 min) | 1 | 25 |
| 53 min | 53/35 | 38 |
| 70 min | 70/35 | 50 |

`build_section_content.py` computes them from `STANDARD_GOAL_MINUTES` and stamps
them into every section it assembles, so a future change to the standard goal
carries the accommodated ones with it and cannot leave them stale.

## Consequences

**We have departed from the source method on a stated number.** Deliberately, and
this ADR is the record of it. The spec's §2 table still transcribes the source's
20 / 25 / 30, because that section documents what was captured rather than what
we ship; it now points here.

**Every built section is re-seeded.** The goal lives in `time_goal_minutes` on
each section's content JSON, so PT102.S3, PT105.S2 and PT134.S3 were rebuilt and
a fresh seed migration emitted. Sections built later inherit it from the script.

**Where the numbers are pinned is now split, on purpose.** The content fixture
test asserts the values and the multiplier. The machine's own test reads the goal
off the content instead of writing it out, since what it checks is that the right
key is picked and turned into seconds. Moving the goal again should touch one
script and one fixture test.

**A Report Card that scores time has a fair clock to score against.** It did not
before, for anyone with an accommodation.

## Alternatives considered

**Keep 20 and treat the gap as something to train down to.** The foundation
routine has its own mechanism for this: start at your real time, move to the
midpoint, tighten. That is a per-student schedule, not the section's goal, and
encoding it as one fixed number for everyone is what the routine specifically
does not do.

**Author all three numbers, corrected by hand.** Rejected. Three authored numbers
is three chances to drift, and the relationship between them is the part that
matters and is exactly what an authored list forgets.

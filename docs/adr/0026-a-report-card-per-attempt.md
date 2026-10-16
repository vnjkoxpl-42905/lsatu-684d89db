# 0026 — A Report Card per Attempt

Date: 2026-09-03
Status: accepted
Extends [0019](./0019-a-grade-the-student-can-write-is-not-a-grade.md).

## Context

The section module's own glossary states the rule: Attempt 1, 2 and 3 each keep
their own date and their own Report Card, "because the point of running a
section twice is seeing what changed."

Nothing in the product could show two.

`activity_section_grades` was keyed on `assignment_id` alone, so the grader's
upsert overwrote. Every other link in the chain already carried the Attempt:
`activity_item_responses` has `attempt_no` with a unique index over
(assignment_id, student_id, item_order, attempt_no), the runner reads the
highest on record and takes the next, and the audio path carries it so a second
recording cannot overwrite the first. The grade was the only place two sittings
became one, and the one destroyed was always the earlier run she wanted to
compare against.

The reachability half was worse than the storage half. `SectionReport` was
mounted only from `onComplete`, in the tab that produced the run — and grading
finishes minutes after she stops, so the Report Card is by construction
something she comes BACK to. Coming back was the one path that did not lead to
it: a completed section fell through to the generic free-text summary and
presented a 91% run as "Not scored · 0 correct · 0 almost". The Attempt list on
the section library rendered past runs as flat grey text.

## Decision

**The grade's key is (assignment_id, attempt_no).**

**The grader takes an optional attempt and defaults to the newest on record.**
Its already-graded short-circuit asks "is THIS sitting graded", not "has this
section ever been graded" — which is what used to report a second run as
already-graded and never mark it.

**The sweeper reads the latest Attempt per assignment.** Keyed on the assignment
it called a second run graded because the first one was, so the run nothing
would ever look at again was exactly the run it skipped.

**An Attempt is reachable at its assignment's own address.** A completed section
routes to its Report Card rather than to the generic summary, from any device at
any later date, and the library's Attempt list links to it and says what she
scored.

## Consequences

**Existing grades are Attempt 1**, which is what they were: the overwrite meant
only one ever survived per assignment. The migration is additive.

**Two Attempts of one section can be compared, and nothing yet does it.** The
data is now shaped for it and `SectionRunHistory` lists them; a side-by-side
diff of two Report Cards is a further step.

**Most Attempts are their own assignment anyway.** The section library creates a
fresh assignment per Attempt, so the collision this fixes is reachable mainly
through re-running a single assignment. That is exactly the path a crashed or
abandoned run leaves behind, which is the path least likely to be noticed and
most likely to matter.

## Alternatives considered

**Keep one grade and store a history array inside it.** One row that grows for
ever, no way to read the latest without parsing the lot, and a re-grade of an
old Attempt has to rewrite a document containing every other. The key is the
right place for the distinction the domain already makes.

**Let a second Attempt overwrite, and archive the first elsewhere.** Two places
holding grades, one of which nothing reads. That is the situation being fixed.

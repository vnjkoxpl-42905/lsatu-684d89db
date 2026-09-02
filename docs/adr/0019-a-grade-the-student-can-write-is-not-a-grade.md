# 0019 — A grade the student can write is not a grade

Date: 2026-09-01
Status: accepted
Extends [0015](./0015-the-model-run-is-not-content.md).

## Context

ADR 0015 found that students hold UPDATE on their own `activity_assignments`
row, and warned that a future playback gate must therefore not be derived from
`status`. Designing the grader meant reading those policies properly, and the
hole is wider than that warning.

`"Students update own activity assignments"` grants UPDATE to `authenticated`
with `USING (student_id = auth.uid())` and the identical WITH CHECK. The only
narrowing is the trigger `guard_activity_assignment_immutables`, and it lists
exactly ten columns: `activity_id`, `student_id`, `title`, `subtitle`,
`instructions`, `item_format`, `items`, `assigned_by`, `class_id`, `created_at`.

`score`, `score_numerator`, `score_judged`, `score_total`, `scoring_version`,
`status`, `started_at` and `completed_at` are not in that list. A student can
set their own score on any activity, today, and mark it complete. This is not
specific to Read, Recall, Colour; it is every Activity the Centre has ever
issued. The scores are honest in practice because nobody has tried, which is a
statement about the students rather than about the system.

`activity_item_responses` is the opposite shape and by accident the right one:
owner-or-admin SELECT, owner INSERT, and **no UPDATE or DELETE policy at all**.
Once she has written what she said, she cannot revise it.

There is a third fact that decides the mechanism. The absence of a service-role
key outside Lovable shaped ADR 0015, which is why `model_runs` takes admin
writes. That constraint is about this Mac and the CLI. **An edge function has
`SUPABASE_SERVICE_ROLE_KEY` in its environment**, so a server-side grader is not
subject to it and does not need an admin policy to write with.

## Decision

**The Coverage grade is never written to `activity_assignments`.** It goes to a
new table, `activity_section_grades`, one row per assignment, with student
SELECT and no student INSERT, UPDATE or DELETE. The grader writes it with the
service role from inside the edge function. She can read her Report Card and
cannot author it.

**Anything derived from the grade is derived on the server.** That includes
whatever eventually unlocks playback of Joshua's model run, which ADR 0015
flagged and which this ADR now gives a trustworthy input: not `status`, which
she can set, but the existence of a grade row, which she cannot.

**`activity_assignments.status` and `completed_at` are still written when a
section finishes, and they are advisory.** They are the Classroom's view of
whether work is done and they are read all over the app, but nothing may derive
trust from them: she holds UPDATE on her own row, so they are hers to set either
way. Who writes them is therefore a question of correctness, not of security.

The client writes them, in `completeSectionRun`, because the run is finished the
moment she stops and the grader may be minutes behind or may never arrive. It is
deliberately not `completeAssignment`: that writes `score`, `scoring_version` and
the judged/total breakdown, and passing a null score through those columns would
not be silence but a claim — "the v2 scorer ran over N items and reached no
verdict" — when the truth is that nothing has graded it yet. A finished section
is a completed assignment with no grade, which is exactly what it is.

Before this, an RRC section never reached `completed` at all: the section branch
of `ActivityRunner` returned before the completion the free-text path calls, so
every run ever done still read as `in_progress`.

**Closing the hole on the existing score columns is a separate change and is not
in this ADR's scope.** It is recorded here because it was found here, and
because the right fix is not obvious: adding those columns to the immutability
trigger would break `markAssignmentStarted`, which is a legitimate client write
to `status` and `started_at`.

## Consequences

**The grader needs no new credential to write.** The service role is already
present in the function environment. Nothing about this reaches the CLI or this
repository.

**The Report Card is a read of one table.** A student loading it selects her
grade row; there is no reconstruction from responses and no client-side scoring
that a devtools console could rewrite.

**A run with no grade row is ungraded, and says so.** The pending state is not a
special value in a column but the absence of a row, which cannot be faked into
existence and cannot be lost by a partial write.

**One integrity issue is now written down rather than latent.** Whoever picks up
the score columns has the policy, the trigger, the exact column list, and the
reason a naive fix breaks a working path.

## Alternatives considered

**Add the score columns to the immutability trigger and keep the grade on
`activity_assignments`.** Rejected for now. It is the smaller diff, but it
breaks `markAssignmentStarted`, so it needs the trigger to distinguish the
columns a client may advance from the ones only a grader may set — which is a
real change to a table every Activity depends on, made in the middle of building
something else.

**Write the grade into `activity_item_responses.rrc`, which the student cannot
update.** Genuinely secure, and rejected on shape. That table is append-only
*from the client*, so a grade written there is one more append the student's own
INSERT policy also permits: she cannot edit the row the grader wrote, but
nothing stops her inserting another. It is also per-stimulus, and the band, the
time verdict and the Reciting tips are per section.

**Recompute the grade on every read instead of storing one.** No storage and no
trust boundary to get right. Rejected: it is 25 model calls per view, it makes
the score non-deterministic across viewings, and Joshua and the student would
not reliably be looking at the same Report Card.

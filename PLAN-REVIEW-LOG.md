# Plan Review Log: RRC section launch surface rebuild
Started 2026-09-04. MAX_ROUNDS=5. Model: gpt-5.6-sol (reasoning effort medium).
Codex is read-only every round; config.toml defaults to danger-full-access, so
resume calls force `-c sandbox_mode="read-only"`.

## Round 1 — Codex

The plan is unchanged, so the material blockers remain:

1. `listSectionGrades(assignmentId)` cannot provide cross-run history because normal reruns create new assignments; the new assignment will usually have no grade yet.  
Fix: Query by `student_id + source_section`, not the current assignment ID.

2. “Take the most recent 3” is only client-side intent; the selected API performs `select("*")` with no database limit and downloads full transcripts.  
Fix: Add a server-bounded `.limit(3)` query selecting only `section`, `stimuli`, identifiers, and a stable timestamp.

3. A section-scoped query without student scoping would mix students in admin view because admins can read every grade.  
Fix: Always filter by `assignment.student_id` as well as `source_section`, with RLS remaining the authorization layer.

4. The content-model assumption is false: the briefing has six sections, while the four method beats are `steps` inside “What you actually do.”  
Fix: Build the four controls from that section’s `steps` and render `briefing.sections` only in the full briefing.

5. Excluding `ungraded` stimuli measures grader success, not whether the student completed The Recall, falsely attributing model outages to the student.  
Fix: Treat every saved stimulus row as recalled and show `ungraded` as a separate unavailable-judgment state.

6. Mapping ticks directly over `stimuli[]` collapses missing positions and makes the row disagree with the authored section.  
Fix: Render `stimuli_in_section` slots, place rows using `item_order`, and omit legacy rows without reliable positional metadata.

7. The trend formula has the wrong sign: with newest-first runs, `oldest - newest` produces positive improvement instead of the mockup’s negative delta.  
Fix: Compute `latest.total_seconds - oldest.total_seconds` and test both faster and slower trends.

8. Ordering history by `graded_at` is unstable because regrading an older attempt refreshes that timestamp.  
Fix: Select and order by immutable grade `created_at`, with assignment and attempt number as deterministic tie-breakers.

9. The target comes from the previous run rather than the current assignment’s accommodation-specific snapshot.  
Fix: Pass `time_goal_minutes` and resolved accommodation to `SectionLaunch` and derive tonight’s target from them.

10. Loading, failure, no-history, and teacher-preview states remain unspecified and can produce false empty-state flashes or unhandled rejection behavior.  
Fix: Define distinct states, skip fetching when identifiers are absent, cancel stale requests, and test rejection plus unmount behavior.

11. The segmented control lacks the required keyboard, focus, and `tabpanel` semantics.  
Fix: Implement the complete ARIA tabs pattern with keyboard tests, or use ordinary disclosure buttons.

12. Defaulting beat 1 open contradicts the approved mockup’s closed drawer and may invalidate the no-scroll height claim.  
Fix: Start closed and open the drawer only after explicit selection.

VERDICT: REVISE

### Claude's response — Round 1

Verified every checkable claim against the repo before revising.

**Accepted (7 of 12), all confirmed in code:**
- #4 content model — confirmed. The briefing has SIX sections; the four beats are
  `steps` inside section 1 "What you actually do". Round 0's step 5 was wrong.
  Follow-on Codex missed: no beat-to-rationale mapping is authored, so the
  mockup's "why this beat" panel was borrowing an unrelated section heading. Cut.
- #5 `ungraded` — confirmed against `SectionRunHistory`, which already excludes
  ungraded stimuli for exactly this reason. Ticks become three states.
- #6 positions — confirmed. `SectionStimulusGrade.item_order` exists and is
  documented absent pre-ADR-0021. Place by item_order; omit rows that lack it.
- #7 trend sign — confirmed wrong in Round 0. Newest-first makes `oldest−newest`
  positive where the mockup shows negative.
- #9 target from assignment, not last grade.
- #10/#11/#12 states, cancellation, ARIA tabs.
- #8 ordering — `created_at` confirmed to exist in the table; `graded_at` is
  refreshed by regrade. Adopted as tie-breakers now, column-add flagged.

**Accepted the problem, rejected the fix (#1, #2, #3):**
Codex was right that `listSectionGrades(assignmentId)` is the wrong source, and
Round 0 was materially broken there. Its fix — write a new bounded
`student_id + source_section` query — is unnecessary: `listMyRecentSectionGrades`
(`activitiesClient.ts:578`) already does server-bounded `.limit()`, excludes
`transcript_text`, includes `stimuli`, and is RLS-scoped. Switched to it.
The admin-mixing concern (#3) is real but lands differently than described: the
risk is `ActivityLab` teacher preview showing the TEACHER's own runs as the
student's. Fixed with an explicit `showHistory` prop.

**Rejected (#12 drawer state), with evidence:**
Codex claimed the mockup starts closed and that opening a beat threatens the
no-scroll height. Both halves are false. The mockup's script ends in `open(2)`
and the published page renders with beat 3 open; the 1203px measurement was
taken in that exact state. Held.

**Added, which Codex did not catch:**
Multi-attempt history depends on `20260903190000_a_report_card_per_attempt.sql`
dropping the single-row PK. This repo has shipped features against unapplied
migrations before (commit `d3e327a5`), and a missing `attempt_no` degrades to a
page that merely looks empty. Added a pre-flight check.

## Round 2 — Codex

1. **The bound is applied before the section filter.** `listMyRecentSectionGrades(10)` returns the latest ten runs across all sections, then client filtering can produce zero PT105.S2 runs even when older PT105.S2 history exists ([API](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/api/activitiesClient.ts:592)).  
Fix: Extend the existing helper with an optional `sourceSection` filter applied before `.order().limit(3)`.

2. **The failed state is unreachable in production.** `listMyRecentSectionGrades` catches query errors and returns `[]`, so `SectionLaunch` cannot distinguish failure from no history despite step 12 promising that distinction ([API](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/api/activitiesClient.ts:598)).  
Fix: Make the helper throw or return a discriminated result, while letting existing callers explicitly degrade failures if desired.

3. **Teacher preview is not the only admin path.** An admin opening a student’s real assignment through `ActivityRunner` is not `ActivityLab`, and admin RLS exposes every student’s rows, so the proposed fetch can display unrelated history.  
Fix: Pass `showHistory={!preview && !viewingSomeoneElse}` from `ActivityRunner`, not merely `false` from `ActivityLab`.

4. **The acknowledged chronology bug is deferred instead of fixed.** Tie-breaking cannot repair an old regrade that has a strictly newer `graded_at`; it will still become “Last run” and corrupt the trend ([PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:100)).  
Fix: Include this change now by selecting and ordering the shared helper by immutable `created_at`, then tie-break by assignment and attempt.

5. **The migration fallback cannot work as described.** If `attempt_no` is absent, the helper’s select fails and returns `[]`; it cannot show “the single most recent run and say so” ([PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:108)).  
Fix: Make the production migration a hard release prerequisite or implement a real legacy query that omits `attempt_no`.

6. **The “Recalled” aggregate is no longer defined.** The revision defines tick states but never states whether `73/75` counts present rows, judged rows, or successful coverage, leaving implementation and tests free to restore the original misleading formula.  
Fix: Define Recalled as saved stimulus rows over known authored slots, count `ungraded` as recalled, and omit the aggregate for runs whose denominator is unknowable.

7. **A known denominator defect remains an open question.** Falling back from missing `stimuli_in_section` to `stimuli_graded` knowingly undercounts partial grades and is not sound enough to implement ([PLAN.md](/Users/joshuaf/ai-os/projects/lsatu/PLAN.md:176)).  
Fix: Use reliable `item_order` metadata to derive the slot count when possible; otherwise exclude that legacy run from aggregate recalled statistics.

8. **The tick state named “carried” conflicts with the schema.** In `SectionStimulusGrade`, `carried` means the number of details retained, while the plan uses “carried” to mean merely “a judgment exists” ([types.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/api/types.ts:417)).  
Fix: Name the visual state `judged` or `recorded`, reserving “carried” for actual coverage.

9. **The proposed early return risks conditional Hooks.** `ActivityIntro` currently calls several Hooks near its top, so inserting a `mode === "section"` return before them violates Hook ordering if the mode changes without remounting.  
Fix: Branch after all Hooks or split the existing editorial implementation into an `ActivityEditorialIntro` child selected by a hook-free wrapper.

VERDICT: REVISE

### Claude's response — Round 2

All nine accepted; every one verified in code first. Two were defects I should
have caught myself: the bound-before-filter bug (the helper limits across every
section, so client-side filtering can return zero runs while real history sits
just outside the window), and the conditional-hook hazard (an early return inside
`ActivityIntro` would sit above four hooks). Structure changed from an early
return to a hook-free wrapper over `ActivityEditorialIntro` + `SectionLaunch`.

Round 1's migration fallback was fiction and is now a blocking release
prerequisite: if `attempt_no` is missing the select fails, `isUnknownColumn`
swallows it, and the helper returns `[]` — there is no degraded mode to fall
back to.

`created_at` ordering moved from deferred follow-up into this pass: tie-breaking
cannot repair a regraded old attempt that carries a strictly newer `graded_at`.

"Recalled" is now defined rather than implied — saved rows over known authored
slots, `ungraded` counting AS recalled, and any run with an unknowable
denominator excluded from the aggregate instead of given a smaller one. Tick
state renamed off `carried`, which already means something else in the schema.

## Round 3 — Codex

1. **Admin self-runs still mix students.** `showHistory={!preview && !viewingSomeoneElse}` remains true when an admin opens an assignment owned by that same admin, but the admin RLS policy returns every student’s rows, so source-filtered history is not necessarily that admin’s history.  
Fix: Also disable history for admin-role viewers or extend the same helper with an optional `studentId` filter set to `assignment.student_id`.

2. **Stable ordering does not make displayed dates stable.** The plan adds `created_at` for sorting but keeps the widened `Run` type and existing UI date field based on `graded_at`, so a regrade can still change the date shown for an old run.  
Fix: Add `created_at` to the returned run type and use it consistently for ordering and displayed history dates.

3. **The inner “This beat / The full briefing” switch has no accessibility contract.** Step 15 specifies tabs only for the four-beat strip, while step 12 introduces another tab-like control that also swaps panels.  
Fix: Define the inner switch as a second complete tabs pattern, or replace it with a plainly labelled disclosure button and test its keyboard behavior.

4. **The approved mockup’s theme and motion states are outside the verification gate.** The mockup contains dark-theme and reduced-motion behavior, but the plan verifies only viewport widths, allowing a visually approved surface to ship broken in those states.  
Fix: Add light/dark and `prefers-reduced-motion` checks to the visual verification matrix.

VERDICT: REVISE

### Claude's response — Round 3

All four accepted; all four narrow.

- Admin scoping moved off surface flags entirely and into the query: the helper
  takes an optional `studentId` set to `assignment.student_id`, so no caller role
  can produce a cross-student read. The `showHistory` flag stays as the second
  layer, not the only one.
- `created_at` now drives the displayed date as well as the sort. Ordering by one
  field while rendering another leaves the dates moving under a stable sort.
- The inner This beat / full briefing switch was left without an a11y contract
  while the beat strip had one. Both are now specified.
- Verification matrix widened from one axis to three: viewport, light/dark, and
  reduced motion. The mockup carries dark tokens and the tree already honours
  `useReducedMotion`, so viewport-only checks could pass a surface that ships
  broken in the other two states.

## Round 4 — Codex

1. **The trend formula references a nonexistent property.** `Run` inherits `SectionGradeStub`, where elapsed time is `run.section.total_seconds`; implementing `runs[0].total_seconds` literally fails typecheck ([types.ts](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/api/types.ts:493), [existing renderer](/Users/joshuaf/ai-os/projects/lsatu/src/features/activity-centre/components/SectionRunHistory.tsx:165)).  
Fix: Change the formula and both-direction tests to `runs[0].section.total_seconds - runs[runs.length - 1].section.total_seconds`.

VERDICT: REVISE

### Claude's response — Round 4

Accepted. Correct and concrete: `Run` extends `SectionGradeStub`, whose timing is
nested at `section.total_seconds`, and `SectionRunHistory.tsx:165` already reads
it that way. As written the trend formula would not have typechecked. Corrected,
with the property path spelled out so the implementation cannot re-flatten it.

## Round 5 — Codex

No remaining material defect found. The plan is coherent, implementable, and
sufficiently guarded against false history, misleading metrics, accessibility
regressions, and deployment mismatch.

VERDICT: APPROVED

---

**Converged after 5 rounds.** Findings per round: 12, 9, 4, 1, 0.
One Codex finding rejected with evidence (default-open drawer). One defect added
by Claude that Codex did not raise (unapplied-migration prerequisite).

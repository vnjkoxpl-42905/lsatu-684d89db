# LSAT U connected student and teacher experience: implementation spec

Date: 2026-09-28
Status: Ready for implementation planning
Decision source: [Wayfinder map #155](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/155) and its resolved child tickets
Design source: [platform adoption game plan](../implementation-plans/2026-09-27-platform-adoption.md), [student design](../design-briefs/2026-09-28-student-experience.md), [clickable prototype](../design-previews/2026-09-28-student-experience.html), and [audit coverage](2026-09-28-competitor-audit-coverage.md)

## Problem statement

Students currently find assigned work, recaps, practice, review, analytics, and history through too many rail entries and inconsistent records. Joshua needs the same student state inside his existing teacher workspace, with full teacher and admin controls and without his own practice changing a student's results. The redesign should let a student move from an assigned task to an answer, a useful review, and the next action through a short rail and truthful shared data.

## Solution

Use seven stable student destinations: **Home, My Work, Practice, Review, Progress, Library, Schedule**. Keep Inbox and question search as persistent shortcuts. Each destination owns URL-backed local tabs, concise next actions, and clear loading, empty, partial, error, and access states. Keep the teacher desk's four rooms, Today, Inbox, Library, Insights, and add a selected-student experience within the existing dossier. Teacher and student views use the same scoped work, attempt, review, and progress rules.

Ship student-first, usable vertical slices. Reconcile current `main` before implementation: full PrepTest account sync, owned run lists, and explicit takeover are already coded there, while timed LR/RC save acknowledgment and pause behavior remain incomplete. A local feature checkout is older and must not be used to infer missing features on `main`. Verify migrations and permissions on the target backend before claiming live parity.

## User stories and acceptance

### Navigation and permissions

1. As a student, I see exactly seven main rail destinations, with short labels and one content canvas, so I can locate work without scanning many unrelated links.
2. As a student, I can open a page or tab by URL and return to the same tab, filters, question, and source context after navigating away.
3. As a student, I retain access to old links for assignments, Journal, flagged questions, analytics, history, drills, and exams; each forwards to the corresponding new location and item.
4. As a student, I see every tab even if unavailable, with a lock and explanation; a direct URL enforces the same access restriction.
5. As a student, I can reach Inbox and Find question from any main page without making either an eighth rail destination.
6. As a student on a laptop or phone, I can read questions and explanations at a useful width with keyboard and touch controls; the rail never forces a permanently narrow question canvas.

### My Work and the coached loop

7. As a student, My Work has **To do, Completed, Notes & recaps** tabs with consistent counts and source labels.
8. As a student, I see every issued assignment, including two separate assignments of the same guided drill, with due date, state, and direct Continue or Open action.
9. As a student, opening an assignment alone does not mark it In progress; saved answer or response work does.
10. As a student, practice work becomes Completed only after a saved finish or submission; overdue unfinished work remains To do and can still be finished.
11. As a student, open-ended preparation may use an attributed Mark done action, while measurable practice cannot be manually completed without its finish record.
12. As a student, Notes & recaps shows teacher notes, session and smartboard recaps, and my notes with author and type labels; these reading records do not count as completed practice.
13. As Joshua, I see the same assignment rows and statuses in the selected student's dossier and can act on them using my teacher permissions.

### Practice and exam safety

14. As a student, Practice has **Drills** and **Practice Exams**. Drills offers Smart Drill, saved sets, and a manual builder with exact PT/section/question selection, available count, preview, time, freshness, and clear feedback mode.
15. As a student, opening a known question lets me choose Practice or Inspect; Inspect does not create a scored attempt or change accuracy.
16. As a student, answer selection and submission are distinct when the mode requires them; Selected, first answer, blind answer, and correct answer use words as well as color.
17. As a student, Practice Exams has **Overview, All Exams, Attempts**. Overview provides full PrepTest and timed-section starts and a single unfinished list; All Exams has PrepTest detail; Attempts holds owned in-progress and finished full and timed work with result links.
18. As a student, I confirm duration, accommodations, source, and access before a timed start; starting is never an accidental side effect of opening a card.
19. As a student, a new timed run saves answers, position, elapsed time, and result to my account, and I can resume an owned unfinished run on another device after explicitly taking over. The first device then loses its save lease.
20. As a student, leaving or closing the exam page pauses its clock, while changing tabs with the page still open does not.
21. As a student, if an account save fails during timed work, a temporary device backup is retained, the next question and clock pause, and a clear save problem remains until an acknowledged retry succeeds. A local write alone does not claim account safety.
22. As a student whose exam access changes, I retain owned run and result history, but cannot resume a question I can no longer access.
23. As a student, account Attempts never displays an older browser-only run without a trustworthy owner. Such copies are preserved without automatic claim or import; recovery design is deferred.

### Review and question understanding

24. As a student, Review has **To review, Wrong answers, Flagged** tabs with typed source labels and clear reasons such as missed, flagged, skipped, or from Joshua.
25. As a student, a Review task points to the source attempt and question even for RC, Activity, or bootcamp content, without assuming an LR bank ID.
26. As a student, my first answer, optional blind answer, written reasoning, flag, teacher note, and answer-choice explanations remain visible in their correct order; feedback reveal follows the chosen mode.
27. As a student, before marking a missed question reviewed, I record what made my wrong answer tempting and the exact proof for the right answer. A non-miss flag or skip may be marked reviewed without that required writing.
28. As a student, Mark reviewed finishes a review task but preserves the independent flag and all attempt history. A later miss creates a new task rather than rewriting the old review.
29. As Joshua, I can select a question for student review and see its reason and completion without altering the student's original answer.

### Progress and Home

30. As a student, Progress has **Overview, History, Topics**, and one 7/14/21/30/All control applies to each visible statistic and history set.
31. As a student, diagnostic LR and RC accuracy uses only my first saved, graded answer ever to each distinct question, and the timeframe filters that first answer by its graded date. A repeat inside the window cannot become eligible merely because the first answer predates it. Full-test and timed-section answers enter only after saved finish/submission makes them graded. Repeats appear in History and volume; Inspect, blind answers, and ungraded work do not enter accuracy.
32. As a student, each percentage shows its numerator, eligible-question denominator, source and mode coverage, and any missing sources. LR and RC remain separate. Fewer than three eligible questions shows insufficient evidence; three to nine is labeled an early signal.
33. As a student, a priority explains its evidence and links to a relevant Review queue or prefilled Practice drill. Assignment attribution appears only when the attempt stores an explicit assignment link.
34. As Joshua, I see the selected student's Progress from the same calculation and scope, with no discrepancy caused by a second analytics formula.
35. As a student, Home keeps the approved Home v3 structure and shows a reasoned first action, assigned work, conditional message from Joshua, and next seven days; completion updates the entry points without invented counts.

### Library, Schedule, and teacher workspace

36. As a student, Library groups written lessons, Activities, and bootcamps with named reasoning operation, instructions, item count, Continue, finish rule, and direct related practice.
37. As a student, Schedule links a coming one-to-one session to preparation, then recap and follow-up work, with the same records visible in My Work.
38. As Joshua, I keep the four existing teacher rooms and the selected-student dossier. In Teacher mode I can view the student's pages and use authorized teacher/admin actions with a persistent selected-student label.
39. As Joshua, my edits to a student's work are attributed to me. If I answer a question, the answer belongs to my teacher practice and never affects that student's attempts, score, History, completion, Review, or Progress.
40. As Joshua, Today and the dossier show overdue work, latest attempt, review due, and next session from the same data used on the student's pages.
41. As a student, Admissions stays visible but locked while unfinished; Joshua and admins retain authorized access, including by direct URL. The existing published lock is verified as a prerequisite, not rebuilt.
42. As a student, Practice Drills groups Create, In progress, Completed, and Saved setups. Continue, Results, and Review appear beside the relevant run; the actual launched question count and RC passage or question unit are clear.
43. As a student, a finished exam shows a compact result summary and an expandable question table with first and optional blind answer, time, source, notes, flags, and review state.
44. As a student or Joshua, I can open an advanced Review or History table with useful filters and return to the same filtered question without losing context. The default screen stays concise.
45. As a student, I can bookmark a question separately from a wrong answer or flag, use relevant passage find, highlighting, and answer elimination tools, and read a second attributed written explanation when Joshua provides one. These tools do not change the original answer.
46. As a student, I can scan Joshua's prescribed week with status, reliable estimated size, and finish rule. His endorsed priority remains visible ahead of automated suggestions; Home explains any recommendation.
47. As a student, study settings explain the effect of timing accommodations, feedback timing, review rules, analytics inclusion, contrast, and text size before I change them. Future attempts retain mode/source provenance and old results are not silently recalculated.

## Implementation decisions

- Define an explicit actor and subject scope for reads and writes. Student self-service uses the signed-in student; teacher access names a selected student but retains the teacher's authenticated identity. Server permissions enforce the scope and attribution.
- Use typed identifiers for content, assignment instance, attempt, review task, and source. Keep repeated assignment instances distinct. Keep flags, wrong answers, reviews, and notes as related but separate facts.
- Build a shared student work projection for Home, My Work, and teacher dossier. Build a shared paged attempt projection and pure first-answer reducer for Progress and teacher Insights. Disclose source gaps until all adapters are covered.
- Use the latest remote `main` as the integration base. Full PrepTest account store and explicit takeover exist in code; verify target backend schema, policies, and published behavior. Repair timed LR/RC cloud acknowledgment and all failed-save clock paths, including any timed break.
- Preserve ownerless legacy browser records untouched. Do not import, display in account Attempts, or ask students to claim them in this release. Track recovery only as a later evidence-backed question.
- Keep current curriculum and question engines where they meet the new contract. Adapt source-specific LR, RC, Activity, and bootcamp records into shared views rather than erasing their differences.
- Gate every destination and local tab at both navigation and direct route. Migrate saved rail preferences once, preserve old deep links, and never grant a locked child page through its parent.
- Save mode, timing condition, source, and assignment reference when an attempt is created. Preserve first and blind answers separately. Inspect does not create an attempt.
- Release working routes in slices. Shell and Home design may proceed while data projections are built, but Review and Progress counts cannot be published before source and permission checks pass.

## Testing decisions and release gates

- Use representative student and teacher accounts plus direct database checks to reconcile one unstarted, one started, one completed, and one repeated assignment; a teacher note, a recap, and a student note; LR, RC, Activity, and bootcamp review sources; first and repeat answers.
- Exercise permissions for student self, another student, Joshua/admin selected-student view, locked tabs, and direct URLs. Confirm teacher-owned practice never mutates a student record.
- Exercise full PrepTest and standalone timed LR/RC save success, network failure, retry, reload, second-device takeover, access revocation, and finish. Confirm the clock and navigation pause on failed account acknowledgment.
- Trace every Progress numerator and denominator to eligible attempt IDs for each timeframe; compare the student's view with the teacher's view. Verify missing coverage and sparse states explicitly.
- Walk six core tasks: find assignment, find recap, deliberately launch a timed section, revisit a flagged question, inspect without scoring, and open a selected student's experience from the teacher desk.
- Test the real app at narrow phone, ordinary laptop, wide desktop, and sidecar-docked widths. Verify keyboard focus, tab semantics, 44 px touch targets, text zoom, reduced motion, color-independent result labels, and question reading width.
- End the core rollout with Impeccable critique, audit, fixes, and recheck on all seven student destinations and teacher flows. Resolve all P0/P1 findings and record disposition of lesser findings. This gate follows functional data tests; a prototype screenshot is not evidence of correctness.
- Each slice must have a usable route, real data or honest empty state, relevant automated checks, and an observed browser task walk before it is marked done.

## Out of scope for this release

New video production; broad forum, group-class catalog, leaderboards, tutor marketplace, generic streak pressure; outside-result import; capacity-aware auto-planning; a 3D analytics hero; automatic ownership recovery for old browser-only runs; a required current-student prototype test before building; redesigning the teacher desk into new rooms. The viable question tools and study settings are now included in follow-on slices #179 and #180 rather than deferred.

## Further notes

- The Admissions student lock was published on 2026-09-28, but a live admin account was not used for its verification. Recheck admin access during the permission slice.
- On 2026-09-28, a read of latest `origin/main` found account-backed full PrepTest sync and owned run migration code. The dirty feature checkout lacks it. Neither source inspection nor migrations prove the target backend is deployed; verify live behavior before editing or closing a build ticket.
- Joshua chose not to wait for a current-student prototype walk. A later student test can inform refinement without blocking this spec.
- The detailed competitive evidence remains in [the four-platform audit](../audits/2026-09-27-competitor-ui-audit.md). This spec adopts patterns suited to LSAT U rather than copying competitors' visuals or claiming every observed feature is available in LSAT U.

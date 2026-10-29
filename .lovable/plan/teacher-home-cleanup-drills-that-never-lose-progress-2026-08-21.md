# Teacher Home cleanup + drills that never lose progress

Two problems, one plan.

## 1. Nothing should be "assigned to you" on a teacher account

Confirmed in the database: three rows exist in `classroom_items` with your own account as the student —
"Verification: unread notes" (a note, Aug 20), "Necessary Assumption - First Taste" (a drill mirror pointing at a guided
assignment, Aug 5) and "Welcome to your classroom" (Aug 5). They are test/verification leftovers created by your own
account, and the Classroom Home card reads exactly this list, so they show up as work assigned to you.

Fix:

- Archive those three self-targeted rows (and the matching self-assigned guided drill row) so they stop rendering.
  Nothing is deleted — they move to `archived`, which Home and the To Do lists already ignore.
- Make Home teacher-aware: on an admin account, the "Assigned to you" card and its NEW badge only render if there is
  genuinely something a teacher put on their own plate. With nothing self-assigned, the card is hidden entirely rather
  than showing "Nothing assigned right now."
- Stop the leak at the source: verification/test writes and note broadcasts must not target admin accounts. Any
  classroom item whose student is an admin is excluded from the student-facing Home feed.

Your calendar/schedule blocks are untouched — those stay the only thing that appears on your own Home.

## 2. A drill must never lose a student's answers

Today only two surfaces store a durable resume point: Intro-to-LR practice sets and guided drills. They write a
snapshot (question order, current index, every answered question) to the cloud on each answer and restore it on
return. Smart Drill, custom type drills and full sections do not — they only record "where you were" for the Resume
button, so reopening replays questions the student already answered.

Fix:

- Give every drill mode the same durable snapshot the guided drills already have, keyed by mode and question set,
  written on each answer and each question move, restored on load. Closing the browser, signing out, or switching
  device returns the student to the exact question with prior answers still marked.
- Answers already hit the `attempts` table per question; that stays. The snapshot is only the resume state.
- On finishing a drill, mark its snapshot `completed` so it never offers a stale resume, and mark the assignment
  behind it completed so it drops off Home and the To Do counts permanently and shows as done in Assigned work.
- Nothing is ever removed from the cloud: completed snapshots, attempts and journal rows all persist for review; only
  the "still to do" surfaces stop counting them.

## Technical notes

- Data cleanup: one `UPDATE` on `classroom_items` (and `guided_drill_assignments`) setting `status='archived'` /
  `visible_to_student=false` for rows whose `student_id` is your admin uuid. No schema change.
- `src/hooks/useAssignedTodoFeed.ts` / `src/components/classroom/home/useClassroomHome.ts`: skip the assigned +
  reading feeds when `permissions.is_admin` and the row was self-created; `ClassroomHomeView` hides the card when the
  model has no rows and the viewer is an admin.
- `src/pages/Drill.tsx`: generalise `drillResumeSnapshot` + the two save effects into one mode-agnostic resume key
  (reusing the existing `bootcamp_kv` practice-session store used by `loadPracticeSession` /
  `savePracticeSessionSnapshot`), and add the matching restore branch next to the existing guided/mc branches.
- Completion: call the existing `completeAssignedWork` path on drill finish so the source row and the
  `classroom_items` mirror both flip to `completed`.
- Verification: run the drill in the preview browser, answer two questions, reload, confirm the answers and index
  survive; then load `/classroom` on the admin account and confirm the assigned card is gone.

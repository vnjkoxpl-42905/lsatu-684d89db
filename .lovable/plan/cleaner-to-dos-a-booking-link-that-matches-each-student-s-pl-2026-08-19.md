# Cleaner to-dos + a booking link that matches each student's plan

Three fixes: stop assignments from cluttering your Start Here rail, make completed work disappear on both sides, and put the right scheduling link on the student Home page.

## 1. Teacher Start Here shows only what's relevant

Today the desk queue mixes three sources: Gmail, real calendar events, and "legacy" desk tasks — including `assign-<student>` suggestions generated whenever a student has mostly finished their work. Those assignment suggestions sit in the same rail as your actual sessions, which is why assigning something feels like it "saves to your calendar".

Changes:
- Assignment suggestions no longer enter the calendar-band rail. Only real sessions and time-bound items (email, upcoming session, student submission waiting on you) appear under Start Here.
- When you assign a resource to a student, the matching suggestion for that student is dismissed immediately, so it does not reappear on the next refresh.
- A suggestion also clears itself once the underlying condition is gone (the student now has open assigned work).

## 2. Completed work clears everywhere, for everyone

- Teacher side: once a task's underlying item is completed (assignment done, submission reviewed, session ended), it drops out of the rail permanently instead of re-generating. Dismissals are recorded per source item, not per render, so it never comes back for that item.
- Student side: an assigned item marked complete stops counting in the Home "To Do" list, the Start Here card, and the classroom list. The item stays visible in the completed/history view — nothing is deleted, it just stops nagging.
- Completion is read from a single source (the item's status in its own table plus the `classroom_items` mirror), so all surfaces agree instead of each computing its own version.

## 3. Home page scheduling link matches the student's plan

Home currently shows only "Nothing booked" with a generic link to `/booking`.

New behaviour, driven by the student's actual booking state:
- Has a package with credits left: Home shows "Book your next session — N of M left" and goes straight to the in-app time picker. No checkout, no buying prompt.
- Pay-per-session (no active pass): Home shows "Book a session" pointing at the single-session flow for their plan.
- Package fully used or expired: Home shows the renewal/purchase option for the package they were on.
- Already has an upcoming session: Home keeps showing that session first, with the book/manage link underneath.

## Technical notes

- Files: `src/pages/teacher/desk/deskTasks.ts`, `useTeacherTodoQueue.ts`, `useCalendarTodoSource.ts`, `teacherTodoDismissals.ts`, `AssignmentOfferCard.tsx`, `src/lib/teacherAssignResource.ts`.
- Student side: `src/components/classroom/home/useClassroomHome.ts` + `ClassroomHomeView.tsx`, `src/lib/completeAssignedWork.ts`, `src/components/classroom/OrientationCard.tsx`.
- Booking state comes from the existing `useStudentBooking` hook (`pass` + `bookings` from the `student-booking` function) plus the offer registry already used by `BookingOfferHub`; a small shared helper derives "which link should this student see" so Home, `/booking`, and the schedule panel stay consistent.
- No schema change and no edge function change required; dismissals already have a table (`teacher_todo_dismissals`).
- Verification: run the affected Vitest specs and check Home + Teacher Desk in the browser at narrow/mid/wide viewports before wrapping up.

## Why the bootcamp didn't show up

I checked the database for this student and the bootcamp **was** assigned successfully — but with `unlock_at = May 20, 2026` (today is May 6). Two things hide it:

1. **Database access rule**: students can only read classroom items where `unlock_at <= now()`. So the row exists but is invisible to the student until May 20.
2. **Classroom UI**: `BootcampsSection` filters out anything with a future unlock date, so even if the row were readable it would be hidden.

Result: nothing on the classroom page, no notification on home, no link.

## Fix

### 1. Make assigned bootcamps visible immediately (DB)
Update the student-side read policy on `classroom_items` to drop the `unlock_at` gate for `bootcamp_module` rows. Bootcamps are always visible the moment they're assigned; the start date stays informational/calendar-only.

### 2. Default the assignment start date to today
In `src/pages/teacher/TeacherBootcamps.tsx`, default the start date to **today** instead of leaving the previously chosen future date. Stops accidental future-dating.

### 3. Show bootcamps on classroom regardless of unlock date
In `src/components/classroom/BootcampsSection.tsx`, remove the `unlock_at > today` filter. Always render assigned/in-progress bootcamps.

### 4. Make new assignments BOLD on the classroom home
- Promote the Bootcamps section above "This Week" / "Assigned Work" on `Classroom.tsx` so it's the first thing the student sees.
- Add a bold **"NEW"** badge on a bootcamp card if it was assigned in the last 7 days and the student hasn't opened it yet (track `last_opened_at` in `metadata_json` via the existing `useBootcampProgress` hook; if absent and `created_at` is recent → show NEW).
- Use stronger visual weight: amber accent border, bigger title, larger "Open bootcamp" CTA.
- If "Do This Next" is empty AND a brand-new bootcamp exists, surface that bootcamp as the "Do This Next" item instead of "Nothing assigned yet."

### 5. Notification + inbox (already wired — verify)
The assignment flow already calls `notifyStudentOfClassroomItem`, which inserts a bell notification, posts an inbox message, and emails the student. I'll verify it's firing for bootcamp assignments and that the link points at `/bootcamp/principle-flaw`.

### 6. Backfill the existing assignment for this student
Update the active row (`1818dcf4…`) so `unlock_at = now()` so it shows up immediately on the next refresh — no need to re-assign manually.

## Files touched
- `supabase/migrations/<new>.sql` — relax student SELECT policy for bootcamp rows
- `src/pages/teacher/TeacherBootcamps.tsx` — default start = today
- `src/components/classroom/BootcampsSection.tsx` — remove unlock gate, add NEW badge + bold styling
- `src/pages/Classroom.tsx` — reorder so Bootcamps shows first; surface new bootcamp in "Do This Next"
- Data backfill via insert/update for the existing row

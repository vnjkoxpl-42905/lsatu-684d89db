## Why bootcamp toggles fail right now

The Teacher → Bootcamps toggle (`src/pages/teacher/TeacherBootcamps.tsx`) writes a `classroom_items` row, and the per-student gate (`src/components/hub/BootcampGate.tsx`, wrapping every `/bootcamp/*` route) reads from the same table. The frontend, hook (`useClassroomItems`), gate, and notification helper are all already correct — but the underlying table doesn't exist in the database.

Confirmed via psql: `relation "public.classroom_items" does not exist`. The migration `supabase/migrations/20260506000000_classroom_items.sql` was authored but never applied. The same is true of `notifications` (used by the bell + the assign-toast flow). Only `homework_*` tables from that batch made it through.

So:
- Toggling a bootcamp on Teacher → Bootcamps fails ("Update failed").
- Clicking a bootcamp as a student blows up `BootcampGate`'s query and the page never renders.
- The "notify student" step also fails because `notifications` is missing.

This is purely a missing-schema problem. No app code needs to change.

## Fix: one idempotent migration

Scope is intentionally narrow — only what the assign-and-gate flow needs. Other unapplied tables (weekly plans, AI TA drafts, smartboard, uploads, schedule templates) are out of scope.

### Migration contents

1. **`public.classroom_items`** — `id`, `student_id` (FK `auth.users`), `class_id`, `created_by`, `type` (check list: `drill, homework, bootcamp_module, note, session_recap, announcement, upload_summary, weekly_plan_task, smartboard_recap`), `title`, `description`, `content_markdown`, `content_html`, `source_table`, `source_id`, `status` (`draft, assigned, in_progress, completed, archived`), `unlock_at`, `due_at`, `completed_at`, `priority`, `visible_to_student`, `metadata_json` jsonb, `created_at`, `updated_at`. Indexes on (student_id, visible_to_student, unlock_at), (student_id, status), (student_id, type). `touch_classroom_items_updated_at()` BEFORE UPDATE trigger.

2. **RLS on `classroom_items`** — mirrors how `BootcampGate` queries:
   - Student SELECT: own row, `visible_to_student = true`, `unlock_at` null or past.
   - Student UPDATE: own row only (so they can mark in_progress/completed).
   - Admin: full ALL via `public.has_role(auth.uid(), 'admin')`.

3. **`public.notifications`** — `id`, `user_id` (FK `auth.users`), `type` (`assignment, message, reminder, streak`), `title`, `body`, `link`, `read` (default false), `created_at`. RLS:
   - User: SELECT / UPDATE / DELETE own rows. A guard trigger restricts non-admins so only the `read` flag can change, and only false → true.
   - Admin: full ALL.

All `create policy`, `create trigger`, and `create function` statements use `drop … if exists` first so the migration is safe to re-run.

## Verify after applying

- `/teacher/bootcamps?student=…` → flipping a bootcamp on toasts "Assigned and notified" (or "Assigned, but email failed" if Resend isn't configured — the assignment row still persists).
- A `classroom_items` row of `type = 'bootcamp_module'` with `metadata_json.bootcamp_id` matching the toggle exists for that student.
- Logged in as that student, `/bootcamp/principle-flaw` (or whichever was toggled) renders the bootcamp — `BootcampGate` passes.
- Flipping the switch off archives the row; that student then sees the calm "Not assigned yet" surface instead of the bootcamp content.
- A `notifications` row appears so the bell + inbox light up.

## Files

- New: `supabase/migrations/<timestamp>_classroom_items_and_notifications.sql`
- No application code changes.

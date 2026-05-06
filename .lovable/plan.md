## What's actually broken

I checked Meghan's data. When you assigned **Principle & Flaw**, the system did fire all three notifications:
- `classroom_items` row created (visible, May 20 → Jun 2)
- Inbox message sent ("New assignment: Principle & Flaw…")
- Bell notification inserted ("New assignment: Principle & Flaw")

**So the assign-flow works.** The problem is that the student's `/classroom` page never renders bootcamps. It has sections for Homework, TA assignments, Recaps, Announcements — but `bootcamp_module` items fall through the cracks. That's why Meghan sees nothing in her classroom even though the row exists.

The "schedule = LSAT U calendar" you described already exists at `/schedule` (Schedule.tsx) and it does show the bootcamp as a multi-day band — but Classroom doesn't link the two surfaces, and progress on the bootcamp isn't autosaved back to the assignment.

## Plan

### 1. Show assigned bootcamps in Classroom (the real fix)
- New `BootcampsSection` on `/classroom`, placed right under "Do this next".
- Lists every active `classroom_items` row of type `bootcamp_module` (visibility + unlock filter handled by RLS already).
- Each card shows: title, date range, day X of Y progress bar, status pill, and a primary **Open bootcamp** button that deep-links to `b.route` (e.g. `/bootcamp/principle-flaw`).
- Empty state hidden when there are none — no fake placeholder.
- Only show currently-unlocked items (per your answer).

### 2. Make the LSAT U calendar (Schedule) the single source of truth
- Add a small **"In your calendar"** strip at the top of each bootcamp card linking to `/schedule` so the student sees it lives there too.
- On the Schedule page, clicking a bootcamp day already opens a sheet — add an **Open bootcamp** CTA inside that sheet (currently it just shows the title).
- No external Google Calendar OAuth — per your direction, the LSAT U Schedule *is* their calendar.

### 3. Autosave progress back to the assignment
Currently the Principle & Flaw bootcamp stores per-day progress in `localStorage` (`pf:` keys). The teacher has no visibility, and the assignment never moves from `assigned` → `in_progress` → `completed`.

- Add a tiny `useBootcampProgress(itemId)` hook that:
  - On first interaction in any bootcamp day, flips the `classroom_items` row to `status: 'in_progress'` (one-shot).
  - On every day-complete event, writes `metadata_json.progress = { completedDays: [...], lastDayAt, percent }` (debounced, ~1s) and bumps `updated_at`.
  - When all days are complete, sets `status: 'completed'` and `completed_at = now()`.
- Wire this into the Principle & Flaw bootcamp's existing day-complete handler. Other bootcamps follow the same pattern when they're added.
- Teacher's `/teacher/bootcamps` already reads `classroom_items` for that student → progress shows up automatically.

### 4. Toast clarity on assign
The teacher already gets `"Assigned and notified"` / `"Assigned, but email failed"`. Keep — this is correct and truthful.

### 5. Confirm Meghan sees the existing P&F assignment
After step 1 deploys, her `/classroom` will show the Principle & Flaw card immediately (the row is already in the DB). No backfill needed.

---

## Out of scope (call out, don't build)
- **Google Calendar / Apple Calendar export** — you said the LSAT U calendar is the single source of truth, so I'm not adding `.ics` or per-user OAuth. Easy to add later if you change your mind.
- **Other bootcamps' progress autosave** — only Principle & Flaw has a real day-by-day flow today. Hook is generic; we'll wire each bootcamp as it's built out.

## Files I expect to touch
- `src/components/classroom/BootcampsSection.tsx` *(new)*
- `src/pages/Classroom.tsx` (mount the new section)
- `src/pages/Schedule.tsx` (Open-bootcamp CTA in the day sheet)
- `src/hooks/useBootcampProgress.ts` *(new)*
- `src/pages/PrincipleFlawBootcamp.tsx` (or wherever the day-complete handler lives — wire the hook)
- `src/lib/classroomItems.ts` (small helper to update status/metadata)
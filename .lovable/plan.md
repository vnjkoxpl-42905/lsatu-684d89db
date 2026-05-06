# Gate bootcamps & sync to Schedule

## Goals
1. `/bootcamps` shows **only** bootcamps the admin has assigned to that student. Direct URL hits to `/bootcamp/...` already gated by `BootcampGate` — keep as-is.
2. When admin assigns a bootcamp in Student Hub → Bootcamps, they pick a **start date** and **end date**. The classroom item gets `unlock_at` = start, `due_at` = end, so it shows up on the student's Schedule across that range.
3. Admin remains unrestricted (sees all bootcamps).

## Changes

### 1. `src/pages/Bootcamps.tsx` — gate the listing
- Pull `useUserPermissions()` for `is_admin` and `useStudentClassroomItems(user.id)` (or the existing student-side `useClassroomItems`) to fetch this user's `bootcamp_module` items.
- Build a `Set` of assigned bootcamp IDs from `metadata_json.bootcamp_id` (matches what `TeacherBootcamps.tsx` writes).
- If `is_admin` → render full `BOOTCAMPS` list (current behavior).
- Else → filter `BOOTCAMPS` to only those with id in the assigned set.
- Empty state: "No bootcamps assigned yet. Joshua will add them from the Teacher Workspace."
- Keep header / loading skeleton consistent with the rest of the app.

### 2. `src/pages/teacher/TeacherBootcamps.tsx` — date range on assign
Replace the bare `<Switch>` row with:
- Switch (assign/unassign) — same logic.
- Two compact `Popover + Calendar` date pickers ("Start" and "End"), shown inline next to the switch when the bootcamp is assigned (or when the admin is about to assign).
- On toggle ON: require both dates (default Start = today, End = today + bootcamp default duration: 14 for principle-flaw, 7 for others; final number TBD — safe default = today + 7).
- Pass `unlockAt: startDate.toISOString()` and `dueAt: endDate.toISOString()` into `createClassroomItem`.
- After create, call existing `notifyStudentOfClassroomItem` (already wired).
- For an **already-assigned** bootcamp, allow editing the dates: call `updateClassroomItem(itemId, { unlock_at, due_at })`. Debounced save + toast.
- Persist dates in local state keyed by bootcamp id; hydrate from existing item when present.

### 3. Schedule already wired
`src/pages/Schedule.tsx` reads `classroom_items` via `useClassroomItems`, treats `bootcamp_module` as a known type with the Flame icon, and renders dots on `due_at ?? unlock_at ?? created_at`. Once we set `unlock_at`/`due_at`, bootcamps will appear automatically — no Schedule changes needed.

### Multi-day visualization (light touch)
`Schedule.tsx` currently puts the dot on a single date. To show the bootcamp **across the range**, extend `itemDate` → `itemDates(item)`: if the item has both `unlock_at` and `due_at` and is `bootcamp_module`, return every day in `[unlock_at, due_at]`. Update the day-cell filter and tooltip aggregation to use the array. Keep all other types single-day.

## Out of scope
- External calendar (Google/Outlook) export — "calendar" here = the in-app `/schedule` view. If you meant an iCal export, say so and I'll add a follow-up.
- Changes to `BootcampGate` (already gates direct URL access correctly).
- Changes to RLS / DB schema (existing `classroom_items` columns are sufficient).

## Files touched
- `src/pages/Bootcamps.tsx` (gate listing)
- `src/pages/teacher/TeacherBootcamps.tsx` (date pickers + update flow)
- `src/pages/Schedule.tsx` (multi-day expansion for `bootcamp_module`)

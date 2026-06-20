# Desk-native Library

## Problem

The Library tab inside the Teacher Desk is currently rendering the legacy `/teacher/library/*` admin pages (dark bg, zinc-950, max-w-3xl admin layouts). They visually clash with the white/glass desk (`DeskStudentsSurface`, `DeskChatPanel`) and behave like a different product wedged into the desk frame.

## Goal

Four new desk-native surfaces for Assignments, Bootcamps, Guided Drills, and Activities that share the desk's visual language (white surfaces, glass blur, black/15 borders, amber CTA accent) and the same two-pane "pick a student / act on resource" rhythm `DeskStudentsSurface` established. Replace the legacy routes so there is one canonical surface.

## What changes

### New surfaces (under `src/pages/teacher/desk/library/`)

1. `DeskLibraryAssignmentsSurface.tsx`
   - Left pane: roster (reuse `useHubStudents`, same `StudentRow` look as `DeskStudentsSurface`).
   - Right pane: that student's grouped classroom_items (reuse `useAllClassroomItems` + `classifyItem`), shown as a quiet list with state pill (Not started / In progress / Stuck / Completed) and a "+ New assignment" CTA in the top-right that opens the existing `StudentAssignmentDetail` sheet.
   - Empty-pane copy: "Pick a student to see their assignments."

2. `DeskLibraryBootcampsSurface.tsx`
   - Left pane: roster.
   - Right pane: list of `BOOTCAMPS` as one row per bootcamp with a Switch + start/end `AssignmentDateField`s. Confirm bar at the bottom on dirty state. Reuses the data hooks from `TeacherBootcamps` (`useStudentClassroomItems`, `createClassroomItem`, `updateClassroomItem`, `archiveClassroomItem`, `notifyStudentOfClassroomItem`), only the chrome changes.

3. `DeskLibraryGuidedDrillsSurface.tsx`
   - Top: filter strip (search + Week + Reasoning type) on a white/glass bar.
   - Body: drill cards in a two-column grid on lg+, each card shows title, pool size, week, reasoning chips. Card actions: Preview (right slide-in sheet, white) and Assign (slide-in sheet with multi-student picker + date). Reuses `listGuidedDrills`, `createAssignments`, the existing `createClassroomItem` + `notifyStudentOfClassroomItem` pipeline.

4. `DeskLibraryActivitiesSurface.tsx`
   - Body: activity cards (one per `useAdminActivities` row) with title/subtitle and a "Send to…" button that opens an inline student multi-select popover. Uses `useAssignActivity` exactly as today. The post-assign "Results" view from `ActivityResults` is reachable from a "Results" link on each card.

All four surfaces share:
- Container: `flex h-full w-full flex-col` with `bg-white/25 backdrop-blur` panels, `border-black/12`, `text-black/55` secondary text, amber-500 used only for primary CTAs and active tab indicator.
- Loading: `Skeleton` rows in `bg-black/10` (matches `DeskStudentsSurface`).
- Empty / error: same compact tone (text-black/45, AlertTriangle + Retry).

### Desk wiring

- `DeskLibrarySurface.tsx` keeps the four-tab strip but renders the new surfaces directly (drop the lazy imports of `TeacherAssignmentsOverview`, `TeacherBootcamps`, `AdminGuidedDrills`, `TeacherActivities`, drop the dark wrapper `bg-zinc-950 text-zinc-100`).
- Remove the "Open full page" button (legacy routes are going away).

### Route cleanup (`src/App.tsx`)

- Replace the `/teacher/library/*` block: `library`, `library/assignments`, `library/bootcamps`, `library/guided-drills`, `library/activities`, `library/recaps`, `library/uploads`, `library/analytics`, `library/assignments/new`, `library/smartboard` all `<Navigate to="/teacher?ws=library" replace />`.
- Same redirect for the top-level legacy aliases at lines 477-480 (`assignments`, `recaps`, `uploads`, `analytics-bridge`).
- `/admin/library` (line 204) is unrelated and stays.

### Deletes (after the new surfaces land and routes are redirected)

- `src/pages/teacher/TeacherLibrary.tsx` (legacy tab strip).
- `src/pages/teacher/TeacherAssignmentsOverview.tsx`, `TeacherBootcamps.tsx`, `TeacherActivities.tsx`.
- `src/pages/admin/GuidedDrills.tsx` (only consumer was this route).
- `src/pages/teacher/desk/DeskWorkspacePlaceholder.tsx` (no longer rendered).

Hooks, `lib/classroomItems`, `lib/bootcamps`, `lib/guidedDrills`, `features/activity-centre` are all preserved — only the page-level chrome is replaced.

## Acceptance

- Opening `/teacher?ws=library` shows the four tabs styled to match the rest of the desk; no zinc-950 panels.
- Each tab can pick a student and complete an assign with toast confirmation and inbox/bell/email notification, same as before.
- Visiting any old `/teacher/library/...` URL redirects to `/teacher?ws=library` (with the right tab where possible).
- No broken imports of the deleted pages anywhere in `src/`.

## Out of scope

- Changing assign business logic, notifications, RLS, or DB schema.
- Touching `/admin/library` or the student-facing library browser.
- Rebuilding the `StudentAssignmentDetail` sheet (used as-is from the Assignments surface).

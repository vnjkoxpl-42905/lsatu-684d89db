# Schedule session chain (#176): verification

Date: 2026-10-02. Parent audit #165, decision source #155, ticket #176. Supports #169/#177; certifies neither.

## Baseline

- Branch: `claude/focused-hopper-bd82le`, created from `origin/main` at `124fee3a4f14952c5b05abcf3bedd18dd22d1f18` (same as the orientation SHA). Clean working tree at start.
- Final commit: see the PR head. This document is part of that commit.

## Contract map (written before production code)

| Data family | Owner / filter contract | Used how |
|---|---|---|
| Student bookings | `student-booking` edge function `info` action, authenticated as the student. Redemptions come from `get_student_booking(auth uid)`; single sessions are filtered by `user_id`. Returns typed `bookings[]` with `source` ∈ `redemption`/`single_session` and every status. | `useStudentSessionChain` reads `useStudentBooking()` (query key includes `user.id`). Rows are validated by `toSessionBooking`. |
| Teacher bookings | Redemptions: `booking_pass_redemptions` admin RLS policy ("Admins manage redemptions"), joined `booking_passes!inner(student_id)` and re-checked client-side. Single sessions: `booking-pass-admin` `get_for_student`, the `single_session_bookings` (verified, `user_id = student`) list only, re-checked on `user_id`. `single_session_possible_matches` is never read. | `fetchTeacherBookings` under key `['session-chain','teacher-bookings',studentId]`. Read-only. |
| Classroom items (student) | RLS `classroom_items_student_select`: own row, `visible_to_student`, unlocked or `bootcamp_module`. The hook comment about "unlocked" is not a query filter, so presentation re-applies it. | `useClassroomItems()`; `isStudentEligible` additionally drops `draft`/`archived` and foreign rows. |
| Classroom items (teacher) | `classroom_items_admin_all` (admin full CRUD). | `useStudentClassroomItems(studentId)`. |
| Recap types | `session_recap`, `smartboard_recap`. | Only these may sit in the Recap phase. |
| Destinations | `resolveItemRoute` in `src/lib/classroomItems.ts` (unchanged). | Every linked record opens through it. |
| Metadata writer | `updateClassroomItem` replaces `metadata_json` wholesale (no CAS). `classroom_items.updated_at` is stamped by trigger `classroom_items_touch` on every update. | New `updateClassroomItemMetadataIfUnchanged` conditions the update on `id`, `student_id` and the just-read `updated_at` (PostgREST filter). Zero rows = conflict. No schema, RLS, function or deploy change. |

Calendar adapter (`bookingRecordsToScheduleItems`) keeps showing only `booked` rows and can mark an elapsed booking `completed`; that is calendar state and is never read as work state here.

## Metadata contract

`classroom_items.metadata_json.session_chain` (no earlier equivalent existed in `src/` or `supabase/`):

| Field | Validation |
|---|---|
| `version` | exactly `1` |
| `booking_source` | `redemption` or `single_session` |
| `booking_id` | uuid (both source tables key on uuid) |
| `phase` | `preparation`, `recap`, `follow_up` |

Absent member = unlinked. Malformed, unknown version, unknown source, bad id or bad phase = `invalid`: never actionable for a student, disclosed to the teacher as "Association data is unreadable". `source_table`/`source_id` are untouched. Writes replace only `session_chain` on the freshly read row; all other keys and nested values are carried over.

## Eligibility

- Student view: `student_id` = subject, `visible_to_student`, status not `draft`/`archived`, unlocked unless `bootcamp_module`; booking must be in the subject's own booking list; phase must accept the item type.
- Teacher view: same projection; records the student cannot see are kept and labelled `Teacher only: Draft | Archived | Hidden from student | Locked until unlock date`. Foreign items are dropped with no title or id. Links to bookings outside the verified list and phase mismatches are listed as issues by title only.
- Link candidates: subject's items, not archived, type accepted by at least one phase (recap types only for Recap; drill, homework, activity, bootcamp_module, practice_test, note for Preparation/Follow-up).

## Mutation support

Supported, through compare-and-swap:

1. Re-read the row (`getClassroomItem`). Not found or another student's → `unavailable`.
2. If it already holds the target link → `saved` (idempotent, no write).
3. If its association differs from what the dialog showed → `conflict`, shows the current one, no write.
4. Conditional update on `updated_at`. Zero rows → re-read → `conflict`.
5. On a thrown write: re-read. Target present → `saved` (lost reply). Row unchanged → `not_saved` (safe retry). Changed otherwise → `conflict`. Re-read fails → `unknown` ("Check current state" re-reads; it never re-writes).
6. After an acknowledged write, the admin item query is refetched; a refetch failure is reported separately ("Saved … The list could not refresh").

`useSessionLinkWriter` blocks a second submit while one is in flight and bumps an epoch on student change; a late result returns `superseded` and cannot touch the next student's UI. `TeacherSessionWork` is also keyed by `studentId`, so the dialog, draft and messages reset on switch.

## Interfaces

- **Student Schedule** (`src/pages/Schedule.tsx`): each booked session in the selected-day agenda and in Today gets a "Session work" button. Selection is the pushed query `?session=v1.<source>.<id>`; unrelated params are preserved; Back/reload restore it. Invalid or not-owned selections show "Appointment unavailable" with "Back to schedule" and never pick another appointment. Canceled bookings resolve via deep link with a "Canceled" label.
- **Session work panel** (`src/components/schedule/SessionChainPanel.tsx`): heading with date/time span, runtime timezone, booking state; Preparation, Recap, Follow-up in order; "Open preparation/recap/follow-up" buttons labelled with the record title; separate loading, booking failure, item failure ("links for this session are unknown") and stale states, each with Retry.
- **Teacher dossier** (`StudentSchedulePanel` → `TeacherSessionWork`): verified appointment list for the selected student, then the same panel with "Link existing work" (disabled for canceled appointments), "Remove link" with confirmation that the record stays in My Work, Move-link confirmation naming both appointments, and the issues list. Quick-add and `classroomNotify` are untouched and not used.
- **My Work Notes** (`src/pages/MyWorkNotesPage.tsx`): "From your sessions" lists linked notes/recaps with "Open recap" and "Session <date/time>" (to `/schedule?session=…`). Unlinked notes are not placed under a session. Booking failure shows a named error with Try again.

`ClassroomRouteViews.tsx` and `StudentBookingPanel.tsx` and `DossierSchedule.tsx` were read but not changed; the Notes page section covers the session-context link without editing the recaps list.

## Changed files

| File | Change |
|---|---|
| `src/lib/sessionChain.ts` (new) | Parser, identity, eligibility, projection, URL helpers, formatting |
| `src/lib/sessionChain.test.ts` (new) | 36 tests |
| `src/hooks/useSessionChain.ts` (new) | Student/teacher read hooks, teacher booking fetch, CAS commit, context-bound writer |
| `src/hooks/useSessionChain.test.tsx` (new) | 19 tests |
| `src/components/schedule/SessionChainPanel.tsx` (new) | Shared panel, link dialog, remove dialog, `TeacherSessionWork` |
| `src/components/schedule/SessionChainPanel.test.tsx` (new) | 17 tests |
| `src/pages/Schedule.sessionChain.test.tsx` (new) | 5 route tests |
| `src/test/sessionChainFixtures.ts` (new) | Local fixtures |
| `src/lib/classroomItems.ts` | Added `updateClassroomItemMetadataIfUnchanged` only; existing functions untouched |
| `src/pages/Schedule.tsx` | URL selection, panel mount, "Session work" button |
| `src/components/schedule/TodayAgenda.tsx` | Optional `onOpenSessionWork` prop, "Session work" button on session rows |
| `src/components/teacher/schedule/StudentSchedulePanel.tsx` | Mounts `TeacherSessionWork` |
| `src/pages/MyWorkNotesPage.tsx` | "From your sessions" section |
| `src/pages/MyWorkNotesPage.test.tsx` | Mocks the new hook; 2 new tests |
| `src/pages/myWorkNotes.css` | Styles for the new section (necessary dependency of the page; not in the original inventory) |
| `docs/implementation-plans/2026-10-02-schedule-176-verification.md` (new) | This file |
| `docs/implementation-plans/artifacts/2026-10-02-schedule-176/*.png` (new) | Harness screenshots |

## Proof results

| Command | Result |
|---|---|
| `npx vitest run src/lib/scheduleEntries.test.ts src/hooks/useBookingScheduleItems.test.ts src/lib/classroomItems.test.ts src/lib/classroomItems.route.test.ts src/pages/MyWorkNotesPage.test.tsx src/pages/teacher/students/DossierWork.test.tsx` | Container TZ=UTC: 46/47, the one failure is `scheduleEntries.test.ts > indexes and selects entries by local yyyy-MM-dd`, which fails identically on the untouched baseline (it assumes a non-UTC timezone). With `TZ=America/New_York`: 47/47. |
| `npx vitest run src/lib/sessionChain.test.ts src/hooks/useSessionChain.test.tsx src/components/schedule/SessionChainPanel.test.tsx src/pages/Schedule.sessionChain.test.tsx src/components/schedule/TodayAgenda.test.tsx src/pages/MyWorkNotesPage.test.tsx` | 83/83 (also 76/76 for the four new files under `TZ=America/New_York`) |
| `npm run typecheck` | Pass |
| `npm run build` | Pass (postbuild canonical-content check OK). The build regenerated `public/data/_bank.generated.json` and `public/data/finder-address-index.json`; that churn was restored and is not in the diff. |
| `npx eslint <14 edited/new source files>` | 0 errors, 1 warning: `MyWorkNotesPage.tsx:49` exhaustive-deps, a line not touched here (pre-existing). |
| `git diff --check` | Pass |
| Full `npx vitest run` | 19 failing files, the identical set fails on the stashed baseline (bank content parity, timed adapters, SingleSession, activity centre, `scheduleEntries` TZ). None involve files in this diff. |

## Responsive and browser coverage

Automated fixture evidence only (mocked, local; proves no production RLS, ownership or live state). A temporary Vite page outside `src/` mounted the real `SessionChainPanel` with the fixtures above, in student, teacher, item-failure and stale modes, and Playwright (system Chromium) measured each at 390, 820, 1024, 1280, 1440 px: horizontal page overflow 0, buttons outside the viewport 0, page errors 0 in all 20 combinations. Keyboard: Enter on "Link existing work" opens the dialog with focus inside it; Escape closes it and focus returns to the button. At `html { font-size: 200% }` (390 px) overflow stays 0. The harness was deleted after the run.

The screenshots surfaced a defect the metrics missed: at three columns, a teacher row placed two buttons beside the title and crushed it to one word per line. Rows now stack title above actions at every width. The screenshots in `artifacts/` are from after that fix. The harness also exposed a labelling defect (each `<select>` wrapped in its label made option text part of the name); the dialog now uses `htmlFor`/`id`.

Not covered: the full Schedule page and dossier in a real signed-in browser session, and the Notes section rendered in the classroom shell.

## Regression matrix

| Scenario | Evidence |
|---|---|
| Owned booking, all three phases | `sessionChain.test` projection; panel test; Schedule route test |
| Empty valid booking | `sessionChain.test`; panel "honest absence" |
| Booking source fails | hook `deriveSessionChainState`; panel booking failure; Notes failure test |
| Item source fails | hook; panel "unknown, never empty" |
| Background refresh fails | hook stale; panel freshness notice |
| Actor / student change | hook subject filter; Schedule account-switch test; writer `superseded`; panel dialog closes |
| Foreign item / booking | projection drop; commit `unavailable`; Schedule not-owned selection |
| Possible email match | `fetchTeacherBookings` test |
| Draft, archived, hidden, locked | eligibility and teacher labels |
| Duplicate title / nearby appointment | projection test |
| Malformed / unknown version | parser cases; teacher issue |
| Source/ID collision | identity and projection tests |
| Canceled | state label, link disabled, history kept |
| Reschedule same ID / replacement | projection test |
| Elapsed appointment | label test; status untouched |
| Deep link, reload, back, unrelated query | URL tests; Schedule route tests |
| Metadata race | commit conflict tests |
| Double save / lost reply | writer duplicate test; commit lost-reply test |
| Save ok, refresh fails | panel test |
| Student switch during save | writer `superseded` test |
| Remove link | commit removal test; panel remove test |
| DST / midnight | identity-only test; times shown through existing runtime-timezone formatting |
| Widths and keyboard | harness run above |

## Limitations and findings for the host

1. **Student-writable metadata.** `guard_classroom_items_student_update` lets a student update `metadata_json` on their own rows, so a student could write a `session_chain` onto their own item. The projection still requires the booking to be in that student's own list, so this cannot expose another student's data, but a teacher-authored link is not tamper-proof. Making it so needs a backend change, which is out of scope here.
2. **`markNoteRead` is a blind merge.** It spreads the cached `metadata_json` and writes without CAS. If a student opens a note after Joshua links it but before their cache refreshes, the write can drop `session_chain`. This is a pre-existing writer outside this slice. Fix: route it through `updateClassroomItemMetadataIfUnchanged` or a server-side merge.
3. Timezone is the runtime's (the existing Schedule contract). No stored per-user timezone was found.
4. `bookingRecordsToScheduleItems` hides non-`booked` rows from the calendar, so a canceled appointment is reachable only by deep link (Notes link or saved URL).
5. Author attribution is not shown: `created_by` is an id, and no display name is available from the existing item contract.

## Real-account acceptance still required

One verified student-owned appointment; Joshua links real preparation, recap and follow-up records; student Schedule and Notes resolve the same links; the dossier agrees; reload persists; hidden and foreign access is rejected; timezone and date are correct. No live data was read or written, no notification was sent, nothing was deployed.

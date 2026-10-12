# Schedule session chain (#176): verification

Date: 2026-10-02. Parent audit #165, decision source #155, ticket #176. Supports #169/#177; certifies neither.

## Baseline

- Branch: `claude/focused-hopper-bd82le`, created from `origin/main` at `124fee3a4f14952c5b05abcf3bedd18dd22d1f18` (same as the orientation SHA). Clean working tree at start.
- First delivery: `3d2fb5efd29678a1efd9a04af6b3de1c50734e6c`. Correction pass 1 is the next commit on the same branch (see the PR head). This document is part of each commit.

## Correction pass 1 (review of 3d2fb5e)

The independent review found that 3d2fb5e was not safe to release. Each finding, and what changed:

| # | Finding | Correction or gate |
|---|---|---|
| 1a | `useBootcampProgress` replaced `metadata_json` with only `bootcamp_id` and `progress`, deleting `session_chain` on the next autosave. | It now calls the new `mergeClassroomItemMetadata` (`src/lib/classroomItems.ts`). Each attempt re-reads the row, rebuilds the metadata from the stored value plus `bootcamp_id`/`progress`, and writes status/`completed_at` in the same update. The update is conditioned on the `updated_at` just read; a concurrent write makes it match zero rows, so it re-reads and recomputes, up to 3 attempts. After that it throws `ClassroomItemMergeError` (the hook logs it, as before) and never falls back to an unconditional write. The effect now depends on `user.id`, not the `user` object. |
| 1b | `markNoteRead` spread the caller's cached metadata, so it could erase a link added later or restore one removed later. | It uses the same merge, recomputing `read_at` from the stored row. It skips the write when the stored row is already read. A failed merge rejects, and its only caller already treats that as non-fatal and claims nothing. |
| 1c | Other writers | All other `classroom_items` updates (`syncClassroomItemStatusBySource`, `completeAssignedWork`, `closeOutAssignedSection`, weekly-plan publish, access tier, `admin-manage-users` practice-test reassign, teacher bootcamp date edits) set named columns only, and Postgres leaves `metadata_json` untouched. The MCP edge function only reads. No other writer replaces metadata on an existing row. |
| 2 | A student may change `metadata_json` on their own rows (`guard_classroom_items_student_update` permits it; `classroom_items_student_update_status` checks only `student_id`). So `session_chain` can be inserted, moved or removed by the student account, and the teacher view could not prove teacher authorship. | **Gated.** `SESSION_LINK_WRITES_ENABLED = false` in `src/lib/sessionChain.ts`. The dossier panel shows **Link existing work** disabled, with `aria-describedby` pointing at: "Secure session linking is not available yet…". No Move or Remove control and no dialog renders, and `save` is never reached. Teacher-visible links carry "Links below are read from record data the student account can also edit. They are not verified as yours." The appointment list says "(unverified)". Read-only Schedule/Notes views remain; they show only the signed-in student's own rows and bookings, which the server already scopes. The writer (`commitSessionLink`, `useSessionLinkWriter`) stays in code and tests for when the prerequisite below lands. |
| 3 | `SessionLinkedNotes` returned `null` on item-source failure. | Loading, booking failure, item failure (and both), stale-with-rows and stale-without-rows now render distinctly, inside the "From your sessions" section, with **Try again** wired to both refetches. |
| 4 | Canceled sessions were reachable only by deep link. | `SessionHistory` on Schedule lists past and canceled sessions from the same verified student booking source (`student-booking` `info`: every redemption status; single sessions = the latest 30). Each row has a "Session work" button that pushes the same `?session=v1.<source>.<id>` selection. Booking management is unchanged. New linking stays disabled for canceled appointments, and in any case while gated. |
| 5 | Teacher booking keys and writer epochs omitted the actor. | Teacher bookings and items now use feature-owned queries keyed `['session-chain', 'teacher-bookings' or 'teacher-items', actorId, studentId]`. The shared `useStudentClassroomItems` is no longer used by this feature and is unchanged. The writer epoch resets on actor or student change; a result from the old context returns `superseded` and cannot clear the newer operation's pending state. `TeacherSessionWork` remounts on `actorId|studentId`, which drops drafts, dialogs and messages. |
| 6 | Extra blank line at EOF in `src/hooks/useSessionChain.ts`. | Removed. Whitespace is now checked against the committed diff from the base (below). |

### Server prerequisite for re-enabling link writes (not applied)

The smallest additive change, for the host to apply through the approved Lovable route. No migration file is committed here.

1. In `guard_classroom_items_student_update`, for non-admins also raise when `new.metadata_json -> 'session_chain' IS DISTINCT FROM old.metadata_json -> 'session_chain'`. Student progress and read writes keep working, because both writers now merge from the stored row and so carry the member through unchanged.
2. Add `set_classroom_item_session_link(_item_id uuid, _expected_updated_at timestamptz, _booking_source text, _booking_id uuid, _phase text)` (a null phase removes the link), `SECURITY DEFINER`, `search_path = public`, executable by `authenticated`, that:
   - requires `has_role(auth.uid(), 'admin')`;
   - locks the item `FOR UPDATE` and returns a conflict when `updated_at <> _expected_updated_at`;
   - verifies booking ownership against the item's `student_id` (`booking_pass_redemptions` → `booking_passes.student_id`; `single_session_bookings.user_id`), and for new links that the booking status is `booked`;
   - validates the phase against the item type (recap ⇒ `session_recap`/`smartboard_recap`; preparation/follow-up ⇒ drill, homework, activity, bootcamp_module, practice_test, note);
   - sets only `metadata_json -> 'session_chain'` via `jsonb_set`/`-`, adding `linked_by = auth.uid()` and `linked_at = now()`;
   - returns the updated row as the acknowledgment.
3. Then switch `commitSessionLink` to call that function, have the projection require `linked_by` for "verified" display, and flip `SESSION_LINK_WRITES_ENABLED`.

Until then, any `session_chain` already stored is legacy metadata of unproven authorship and is labelled that way.

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

1. **Student-writable metadata** (still true server-side). Teacher link writes are gated until the prerequisite above lands; see correction 2.
2. **`markNoteRead` / bootcamp progress clobbering:** fixed in correction pass 1 (merge with CAS and bounded retries).
3. Timezone is the runtime's (the existing Schedule contract). No stored per-user timezone was found.
4. The calendar still hides non-`booked` rows (unchanged). Past and canceled sessions are now reachable through "Past and canceled sessions". Single sessions older than the latest 30 are not returned by `student-booking` and so cannot appear.
6. Pre-existing, not introduced here: at 390 px with `html { font-size: 200% }`, the Schedule stage tabs and calendar header overflow by 10 px with or without a session selected. Not changed, to keep this PR scoped.
5. Author attribution is not shown: `created_by` is an id, and no display name is available from the existing item contract.

## Correction pass 1: files, tests and proof

Changed in this pass: `src/lib/classroomItems.ts` (adds `mergeClassroomItemMetadata`, `ClassroomItemMergeError`, `ClassroomItemColumnPatch`), `src/lib/markNoteRead.ts`, `src/hooks/useBootcampProgress.ts`, `src/lib/sessionChain.ts` (write gate and copy), `src/hooks/useSessionChain.ts` (actor-keyed teacher queries, actor-bound writer, EOF), `src/components/schedule/SessionChainPanel.tsx` (gate, unverified label, actor remount, `SessionHistory`), `src/pages/Schedule.tsx` (history and `selectSession`), `src/pages/MyWorkNotesPage.tsx` (failure, loading and stale states). Tests: `src/lib/sessionChainWriters.test.tsx` (new), `src/test/fakeClassroomItemsDb.ts` (new), `src/pages/MyWorkNotesPage.sessionLinks.test.tsx` (new), plus updates to `src/hooks/useSessionChain.test.tsx`, `src/components/schedule/SessionChainPanel.test.tsx`, `src/pages/Schedule.sessionChain.test.tsx` and `src/pages/MyWorkNotesPage.test.tsx`. Evidence: `docs/implementation-plans/artifacts/2026-10-02-schedule-176/full-page-mocked/` (10 PNGs).

New regression coverage:

| Requirement | Test |
|---|---|
| Link a bootcamp, then save progress: link remains | `sessionChainWriters` › keeps a session link when progress autosaves (real `useBootcampProgress`) |
| Teacher adds link after student caches note; mark-read keeps it | `sessionChainWriters` › keeps a link the teacher added… (real `markNoteRead`) |
| Teacher removes link after cache; mark-read does not restore it | `sessionChainWriters` › does not restore a link… |
| Concurrent updates keep both changes | `sessionChainWriters` › keeps both changes when another write lands… (mark-read and bootcamp) |
| Conflict or failed save never claims success | `sessionChainWriters` › fails without overwriting when the row keeps changing (throws, zero writes) |
| These tests catch the original bug | All 7 `sessionChainWriters` tests fail against the 3d2fb5e versions of `markNoteRead.ts`/`useBootcampProgress.ts` and pass after |
| Gate | `SessionChainPanel` › gates Link, Move and Remove by default and says why; does not present stored links as verified |
| Notes: initial item failure, booking failure, cached refresh failure, successful retry, account switch during pending read | `MyWorkNotesPage.sessionLinks` (5 tests through the real `useStudentSessionChain`) |
| Canceled discovery, exact selection, reload, Back | `Schedule.sessionChain` › lists canceled and past sessions… |
| Actor change: keys, projected rows, superseded save, no unlock of newer op | `useSessionChain` › actor binding (3 tests) |

Proof (this pass, container TZ=UTC unless stated):

| Command | Result |
|---|---|
| Required suite (11 files in the brief) + `src/lib/sessionChainWriters.test.tsx` + `src/pages/MyWorkNotesPage.sessionLinks.test.tsx` | `TZ=America/New_York`: 13 files, 143/143 pass. Under UTC: 142/143. The failure is `scheduleEntries.test.ts > indexes and selects entries by local yyyy-MM-dd`, which fails the same way on the untouched base. |
| Writer tests (`src/lib/sessionChainWriters.test.tsx`) | 7/7 (no earlier tests existed for these writers) |
| Full `npx vitest run` | Failing-file set identical to the base (19 pre-existing files; none in this diff) |
| `npm run typecheck` | Pass |
| `npm run build` | Pass (postbuild canonical check OK). The build-regenerated `public/data/_bank.generated.json` and `public/data/finder-address-index.json` were restored and are not in the diff. |
| Scoped ESLint on every changed `.ts/.tsx` | 0 errors; 1 pre-existing warning (`MyWorkNotesPage.tsx:49`, untouched line) |
| `git diff --check 124fee3a4f14952c5b05abcf3bedd18dd22d1f18 HEAD` | Pass after removing EOF blank lines in `src/hooks/useSessionChain.ts` and `src/pages/Schedule.sessionChain.test.tsx` (the second was found by this committed-range check). |

### Browser evidence: mocked, full page

This is not authenticated or live evidence. A temporary Vite config aliased `@/integrations/supabase/client` and `@/contexts/AuthContext` to local fakes (fixed fixtures, no network) and mounted the real `Schedule` page, the real `MyWorkNotesPage` inside `.classroom-root`, and the real teacher `StudentSchedulePanel`. Playwright with system Chromium:

- 6 states (Schedule with selection, canceled selection, item failure; Notes, Notes item failure; teacher dossier with an appointment selected) × 390/820/1024/1280/1440 px: horizontal overflow 0, controls outside the viewport 0, page errors 0 in all 30 combinations.
- History keyboard path: focus the canceled row's "Session work" and press Enter; the URL gains `session=v1.single_session.<id>` with `ref=x` preserved; the panel shows "Canceled-day drill" and receives focus; reload keeps it; Back returns to `?page=schedule&ref=x` with no panel.
- Schedule item failure shows "…links for this session are unknown" with Retry; booking failure shows "Appointments could not load."; Notes item failure shows the alert with Try again; Notes success shows "Open recap" plus a session link.
- Teacher: appointment chosen by keyboard; Link existing work is disabled and described by the gate note; unverified label present; 0 Remove buttons; 0 dialogs; teacher-only label present; overflow at 200% text = 0.
- A harness artifact was found and fixed in the harness: an unstable fake `useAuth` object caused a render loop the real `AuthContext` cannot produce. As a precaution, `useBootcampProgress` now depends on `user.id` rather than the user object.
- Not covered: the real auth/session stack, production RLS, the app shell and routing in `App.tsx`, and real Supabase data.

## Pass 2: independent assessment of the b729407 review, and server contract

PR head at the start of this pass: `b729407d3515cb2eabb3681617aa7e25f24f9124` (unchanged since the review). This pass is the next commit on the same branch.

### Assessment of the review's conclusions

Evidence types: **S** = source read, **T** = automated test in this repo (mocked), **M** = mocked browser run, **R** = real account, **D** = deployed. Nothing in this pass is R or D.

| Review statement | Verdict | Evidence |
|---|---|---|
| Note-read and bootcamp-progress saves preserve links (fresh read, CAS on `updated_at`, bounded retries, real writers tested) | **Agree** | S: `mergeClassroomItemMetadata` in `src/lib/classroomItems.ts`, `markNoteRead`, `useBootcampProgress`. T: `src/lib/sessionChainWriters.test.tsx`. Limit: CAS on the client is only as strong as `updated_at`; the server guard below makes link loss impossible regardless. A mark-read that gives up after 3 conflicts leaves the note unread (the caller swallows it); that is the intended failure. |
| Notes shows loading, failure, stale and retry | **Agree** | S: `SessionLinkedNotes`. T: `MyWorkNotesPage.sessionLinks.test.tsx`. M only for layout. |
| Past and canceled sessions are discoverable | **Agree in part.** The path existed, but `SessionHistory` also listed abandoned checkout holds (`draft`, `checkout_open`, `expired`, `abandoned`) and `failed` redemptions as past sessions, and the teacher list did the same. **Fixed in this pass** (see below). | S: `toSessionBooking`, `isAppointmentStatus`. T: new `sessionChain` and `Schedule.sessionChain` cases. |
| Teacher state includes actor and student | **Agree** | S: `teacherBookingsKey`, `teacherItemsKey`, `useSessionLinkWriter`, the `TeacherSessionWork` key. T: `useSessionChain` › actor binding. |
| Add/move/remove disabled until secure backend | **Agree** | S: `SESSION_LINK_WRITES_ENABLED = false`; `SessionChainPanel` drops `writer`. T: the gate tests. |
| Stored associations visibly labelled unverified | **Agree, with a defect to fix before enabling.** The label is tied to the gate (`teacher && !writer`), not to the data. Flipping the flag would hide it even for legacy links. Before enabling, the label must come from data: verified only when `session_chain.linked_by` is present **and** the item is not in `classroom_item_session_link_legacy`. Students see their own links without a caveat; only their own account could have forged those, so this is acceptable. | S: `SessionChainPanel` render. |
| "The existing booking query returns only the latest 30 bookings" | **Disagree in scope.** Only the student's **single sessions** are capped (`student-booking` `info` → `single_session_bookings ... .limit(30)`). Redemptions (`get_student_booking`) and every teacher read (`booking_pass_redemptions` via admin RLS; `booking-pass-admin` `get_for_student`) are uncapped. | S: `supabase/functions/student-booking/index.ts`, `supabase/migrations/20260720190000_booking_phase5_student_state.sql`. |
| Independent checks (143 tests, typecheck, build, lint, whitespace) | **Agree, and re-run** on the new head (numbers below). | T. |

### Additional findings, by practical impact

1. **Client link writer would break once the guard ships** (pre-enable blocker, not a live defect). `commitSessionLink` writes `metadata_json` directly. After the contract is applied the guard rejects that with `42501`. It is unreachable today (gated), but it must be switched to `set_classroom_item_session_link` before the flag is flipped.
2. **Checkout holds and failed bookings shown as sessions** (UX truthfulness; fixed). Unpaid holds would have appeared in "Past and canceled sessions" with a raw status such as "draft", and as teacher appointment rows. `toSessionBooking` now accepts only appointment statuses (`booked`, `cancelled`/`canceled`, `no_show`, `refund_pending`, `refunded`, `refund_failed`). Refund states read as Canceled and `no_show` reads as Missed.
3. **Silent omission beyond the 30-single-session cap** (truthfulness; fixed in UI, root cause open). A deep link or Notes link to an older single session read as "not available in your schedule". Now, when the student has 30 or more single-session rows, the unavailable state, the history list and Notes each say the coverage may be incomplete. Complete history needs `student-booking` to page (for example a `before` cursor) or to resolve specific linked ids. That is an edge-function change and is not done here.
4. **Verification label depends on the gate** (see the table). Must change before enabling.
5. **Pre-existing 10 px overflow** at 390 px with doubled text in the Schedule stage tabs and calendar header. Retained as an **unresolved acceptance item**: it is in existing Schedule chrome, appears with or without this feature, and fixing it means restyling navigation outside this ticket's surface.

### Server contract (implemented as a proposal artifact, tested, not applied)

Files:

- `docs/implementation-plans/artifacts/2026-10-02-session-chain-server-contract.sql`. It sits deliberately outside `supabase/migrations`, so merging this PR cannot apply it.
- `docs/implementation-plans/artifacts/2026-10-02-session-chain-server-contract-rollback.sql`.
- `scripts/verification/session-chain-server-contract.mjs`, a PGlite harness following the repo's existing `scripts/verification/*` convention (external `--pglite-module`; no app dependency added).

Design:

- **Actor** is `auth.uid()` from the request JWT, never a parameter. **Authority** is `has_role(auth.uid(), 'admin')`. The schema has only `admin` and `user` roles and no teacher-to-student roster, so "teacher" is the admin, exactly as `classroom_items_admin_all` already treats it.
- **Ownership:** the item's `student_id` must equal the intended `_student_id` (catches a stale UI selection). The booking must belong to that same student: a redemption via `booking_passes.student_id`; a single session via `single_session_bookings.user_id`, so email-only matches are rejected.
- **Eligibility:** the phase must fit the item type (Recap needs `session_recap`/`smartboard_recap`); archived items are refused; new links need booking status `booked`. Removal skips booking checks, so links on canceled appointments can still be removed.
- **Concurrency:** `SELECT … FOR UPDATE`, then compare `_expected_updated_at`. A mismatch returns `{status:'conflict', session_chain:<current>}` and writes nothing. A request for the state already stored returns `{status:'unchanged'}` with no write, so a retried lost reply is safe. A success returns `{status:'saved', updated_at, session_chain}` as the acknowledgment.
- **Preservation:** only `metadata_json -> 'session_chain'` changes (`jsonb_set` or `-`); `linked_by` and `linked_at` are stamped.
- **All mutation paths:** a `BEFORE INSERT OR UPDATE` trigger rejects any change to that member unless it comes from inside the function. The function sets a transaction-local flag; PostgREST clients cannot set arbitrary settings. This covers student updates, admin direct updates, inserts and service-role writes. Writes that carry the member through unchanged pass: the note-read and bootcamp merges, status syncs, column-only admin edits.
- **No destructive cleanup:** existing members are copied into `classroom_item_session_link_legacy` (admin-read-only), and no row is rewritten. A legacy link becomes verified only when Joshua re-saves it through the function, which clears its legacy record.
- **Rollback:** drops the function, trigger and guard function. It leaves every row and, by default, the legacy record. Turn the frontend flag off first.
- **Known bypass, documented:** direct SQL as `postgres` (dashboard or migrations) can set the flag. That is outside the app's threat model.

PGlite result: `PASS session_chain server contract: 52 checks`. Coverage:

- the forge works before install; install rewrites no row and records the legacy member; install is re-runnable;
- student add, move and remove are rejected; student merge and status writes still work; a student calling the function, or a call with no JWT, is rejected;
- admin direct update and insert-with-member are rejected; admin column edits still work;
- rejected: another student's booking, the wrong intended student, a cross-student item, an email-match-only single session, a canceled booking for a new link, drill-as-recap, an unknown source, an unknown phase;
- a missing item returns `not_found`;
- save stamps `linked_by` from the JWT and preserves other metadata;
- an idempotent repeat makes no write; a stale `updated_at` returns a conflict with the current link and changes nothing;
- move and remove keep other keys; removal works from a canceled booking;
- legacy re-save verifies the link and clears the legacy record; the legacy table is admin-only;
- rollback leaves rows untouched and restores pre-contract behavior; the preconditions fail closed on the wrong baseline.

PGlite is real Postgres compiled to WASM. It proves the SQL and trigger semantics, not Supabase's role and grant setup or PostgREST behavior.

Deployment prerequisite, in order (none of this has been done):

1. Joshua approves applying the SQL through the approved Lovable route, with **explicit confirmation immediately before any step that may spend Lovable credits**.
2. Pre-apply probe: `select count(*) from classroom_items where metadata_json ? 'session_chain';`. Expect 0, since writes were never enabled. Any non-zero count is recorded as legacy, not deleted.
3. Apply. Post-apply probe:
   - `to_regprocedure('public.set_classroom_item_session_link(uuid,uuid,timestamptz,text,uuid,text)')` is not null;
   - the trigger `classroom_items_session_chain_guard` exists;
   - a student-JWT `update … metadata_json || '{"session_chain":{}}'` on an owned fixture returns `42501`.
4. Frontend change, as a separate reviewed commit:
   - switch `commitSessionLink` to the RPC and map `saved`/`unchanged`/`conflict`/`not_found` onto the existing outcomes;
   - derive "verified" from `linked_by` plus the legacy table;
   - regenerate Supabase types;
   - then flip `SESSION_LINK_WRITES_ENABLED`.
5. Real-account acceptance (below).

### Pass 2 changed files

`src/lib/sessionChain.ts` (appointment-status filter, refund and no-show labels), `src/components/schedule/SessionChainPanel.tsx` (history filter, cap notes), `src/hooks/useSessionChain.ts` (`olderSingleSessionsOmitted`, `STUDENT_SINGLE_SESSION_CAP`), `src/pages/MyWorkNotesPage.tsx` (cap note). Tests: `src/lib/sessionChain.test.ts`, `src/pages/Schedule.sessionChain.test.tsx`, `src/components/schedule/SessionChainPanel.test.tsx` (fixture field). New: the two SQL artifacts and `scripts/verification/session-chain-server-contract.mjs`. This document.

### Pass 2 proof

| Check | Result |
|---|---|
| Required 11-file suite plus `sessionChainWriters` and `MyWorkNotesPage.sessionLinks` (13 files), `TZ=America/New_York` | 157/157 |
| Same under container UTC | 156/157; the one failure is the pre-existing `scheduleEntries` TZ test, which fails identically on the base |
| Full `npx vitest run` | Failing-file set identical to the base (19 pre-existing) |
| `node scripts/verification/session-chain-server-contract.mjs --pglite-module <external pglite>` | PASS, 52 checks |
| `npm run typecheck` | Pass |
| `npm run build` | Pass (generated bank churn restored, not committed) |
| Scoped ESLint on changed `.ts/.tsx/.mjs` | 0 errors; 1 pre-existing warning (`MyWorkNotesPage.tsx:49`) |
| `git diff --check 124fee3a4f14952c5b05abcf3bedd18dd22d1f18 HEAD` | Pass |

No new browser run was made for pass 2. Its UI changes are copy and filtering, covered by component and route tests (T). The pass-1 mocked full-page evidence (M) still stands for layout.

## Status

**Implemented and tested** (S, T, M; PGlite for SQL):

- read-only Session work panel on Schedule, the dossier and Notes;
- metadata-preserving writers;
- failure, stale and retry states;
- history with appointment-status filtering and honest cap notes;
- actor-bound teacher state;
- the gated teacher controls;
- the server contract and its rollback, as proposal artifacts.

**Deployed and verified:** nothing. No SQL was applied, nothing was published, and no real account was used.

**Blocked or outstanding:**

- applying the server contract (needs approval through the Lovable route);
- the frontend switch to the RPC with data-based verification, then enabling the controls;
- complete single-session history past 30 (needs a `student-booking` pagination or by-id change);
- the 390 px / 200% text overflow in existing Schedule chrome;
- all real-account acceptance below.

## Real-account acceptance still required

Not started. It needs the server contract applied and the frontend switched to the RPC. Use owned, narrowly authorized fixtures: one admin (Joshua) and two student accounts, A and B. Record each run as:

`environment (preview or production URL) · commit SHA · account role (admin / student A / student B; no credentials) · check · expected · actual · pass/fail · date`.

| # | Check | Expected |
|---|---|---|
| 1 | Admin links existing preparation, recap and follow-up records to a booked appointment of student A | Each save acknowledged; panel updates |
| 2 | Student A Schedule, student A Notes, and the admin dossier | Same booking and the same records in the same phases |
| 3 | Reload each view | Associations retained |
| 4 | Admin moves one link to another appointment, then removes another | Persist across reload; removed record still in My Work |
| 5 | Student B views | None of A's records or appointments; deep link to A's appointment shows "unavailable" |
| 6 | Hidden, draft or locked item linked by admin | Absent for student A; labelled teacher-only for admin |
| 7 | Student A attempts to change `session_chain` (crafted request) | Server rejects with `42501` |
| 8 | Student A opens a linked note; works a linked bootcamp day | Read state and progress saved; links intact |
| 9 | Appointment near midnight, or across a DST change | Date and time correct in the displayed timezone |
| 10 | Throttle or block a request, then Retry | Clear failure state; previously shown valid data retained |

#176 stays open until this table is filled with passing results. No live data was read or written, no notification was sent, and nothing was deployed in any pass so far.

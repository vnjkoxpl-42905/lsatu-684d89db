# Teacher Workspace Rebuild — Execution Plan

**Status:** Frozen spec, ready to execute.
**Design authority:** `~/ai-os/brainstorms/2026-08-03-teacher-workspace-redesign-spec.md` (decisions D1–D12). If this plan and that spec conflict, STOP and ask Joshua.
**Executor:** any model. This plan assumes no prior context. Follow tasks in order. Do not improvise beyond a task's stated scope.

---

## 0. Ground rules (read before every session)

1. **Repo:** `~/ai-os/projects/lsatu`. React 18 + Vite + TypeScript + Tailwind + shadcn + Supabase. Never edit this repo's `CLAUDE.md`/`AGENTS.md`.
2. **Git discipline:** the index is NOT clean by default (parallel processes pre-stage files). Before every commit run `git status` and stage ONLY the files you changed, by explicit path. Push only via `bash .claude/safe-push.sh` from the repo root, never bare `git push`. Fetch before push (Lovable auto-syncs main).
3. **Verify before editing:** line numbers in this plan were correct on 2026-08-03 and may drift. Always open the file and locate the code by the quoted symbol/string, not the line number. If you cannot find the described code, STOP and report — do not guess.
4. **Per-task protocol:** (a) read the listed files, (b) make the change, (c) run `npx tsc --noEmit` and `npm run build`, (d) verify the acceptance criteria in the running app (`npm run dev`), (e) commit with the given message prefix.
5. **Truthfulness rule (product law):** never render a number, badge, or progress state that does not trace to real fetched data. A failed query must render an error state, never `0`.
6. **Copy rules (product law):** no internal IDs (MC-*, NT-*, "Phase/Gate"), no spec language, no em-dashes in any student- or teacher-visible string.
7. **Scope guard:** student-facing surfaces (`/classroom`, bootcamp runners, drill player) are OUT OF SCOPE. Do not modify them except where a task explicitly says so.
8. **When blocked:** if a task's acceptance criteria cannot be met as written, stop that task, leave the code compiling, and report the blocker. Never leave the build red at a commit boundary.

**Key paths:**
- Router: `src/App.tsx`
- Old dark shell: `src/pages/teacher/TeacherShell.tsx`
- Desk (new-gen surfaces): `src/pages/teacher/desk/`
- Admin (oldest gen): `src/pages/admin/`
- Route guard: `src/components/ProtectedRoute.tsx`
- Generated DB types: `src/integrations/supabase/types.ts`

---

## PHASE 1 — Guard + truth pass (ship first; independent of redesign)

### T1.1 Gate the open admin routes
**Files:** `src/App.tsx`, `src/pages/admin/GuidedDrills.tsx`, `src/pages/admin/BootcampReferenceLab.tsx`
**Change:** In `src/App.tsx`, wrap EVERY `/admin/*` route element in `<ProtectedRoute requireAdmin>…</ProtectedRoute>`. Routes currently unguarded: `/admin/drive-files`, `/admin/homework`, `/admin/homework/new`, `/admin/homework/:setId`, `/admin/guided-drills`, `/admin/bootcamp-reference-lab`, `/admin/intro-lr`. Also change `/admin/board` from `flag="has_classroom_access"` to `requireAdmin`, and `/admin/ta`, `/admin/library`, `/admin/inspector` from `flag="has_ta_access"` to `requireAdmin`.
**Acceptance:** signed-in non-admin visiting `/admin/guided-drills` and `/admin/bootcamp-reference-lab` is redirected (not rendered). Note: `ProtectedRoute` has a DEV-localhost bypass; verify with a production build (`npm run build && npm run preview`) or by temporarily commenting the bypass during manual verification only (restore it after).
**Commit:** `fix(security): requireAdmin on all /admin routes`

### T1.2 Fix the homework Enter-key bug
**File:** `src/components/teacher/SessionBundleReview.tsx` (search `items.join('\n')`)
**Change:** The textarea is controlled by `value={items.join('\n')}` with `onChange` that splits+filters per keystroke, destroying newlines. Hold raw text in local state: `const [raw, setRaw] = useState(items.join('\n'))`; `onChange={(e) => setRaw(e.target.value)}`; call `onPatchLocal({ items: raw.split('\n').filter(l => l.trim()) })` only `onBlur` (and before any save action). Re-sync `raw` from props only when the reviewed item's id changes.
**Acceptance:** in the session-bundle review homework field, typing `line one`, Enter, `line two` produces two lines.
**Commit:** `fix(teacher): homework textarea preserves newlines`

### T1.3 Honest error states in Insights (no fabricated zeros)
**Files:** `src/components/teacher/bootcamps/StudentBootcampDetail.tsx`, `src/components/teacher/bootcamps/BootcampDetail.tsx`
**Change:** Both components use React Query results (`detailQ`, `breakdownQ`, etc.) but never read `isError`. For each query: if `isError`, render an inline error card ("Couldn't load this data. Retry.") with a refetch button, instead of the data branch. Specifically kill: `?? 0` renders when `data === undefined`, and the `(breakdownQ.data ?? []).every(...)` branch that prints "No drill attempts recorded." when the query failed (empty-array fallback). "No attempts" copy may render ONLY when the query succeeded and returned rows with zero attempts.
**Acceptance:** temporarily throw inside the query fn → page shows error cards, never "0%" or "No drill attempts recorded." Remove the temporary throw.
**Commit:** `fix(insights): distinguish query failure from zero data`

### T1.4 Honest stat tiles
**Files:** `src/pages/teacher/TeacherAITA.tsx` (search `pendingDrafts: 0`), `src/pages/teacher/TeacherToday.tsx`
**Change:** Same pattern: surface `isError` from the count queries; render `—` with a tooltip "couldn't load" on error instead of `0`.
**Commit:** `fix(teacher): stat tiles show error state, not zero`

### T1.5 Replace scaffold copy in the Desk canvas
**File:** `src/pages/teacher/desk/DeskChatPanel.tsx` (search `STARTER_CANVAS`)
**Change:** Replace the "Welcome to your clean canvas! … Coding: Paste your code…" boilerplate with product copy in the teaching voice, e.g. a short note that the canvas is for drafting replies, planning a student's next work, or sketching lesson notes. No em-dashes. Keep it to 3 short lines.
**Commit:** `fix(desk): replace scaffold canvas copy`

### T1.6 Preserve query params across legacy redirects
**File:** `src/App.tsx`
**Change:** The file already contains search-forwarding redirect components (`RedirectSmartboardToWhiteboard`, `RedirectAiTaToCommand` — search for them). Create one generic `RedirectWithSearch({ to })` component that appends `location.search` (merging when `to` already has a query string), and use it for the redirects of: `weekly-plans`, `assignments`, `library/assignments`, `library/assignments/new`, `library/uploads`, `students`. (These stubs are deleted in Phase 4; this keeps deep links working until then.)
**Acceptance:** visiting `/teacher/assignments?student=abc` lands on the target with `student=abc` still in the URL.
**Commit:** `fix(routing): legacy redirects preserve search params`

### T1.7 Fix the shipped 404 nav item (interim)
**File:** `src/pages/teacher/TeacherShell.tsx` (search `PRIMARY_NAV`)
**Change:** Change the `Activities` item's `to` from `/teacher/activities` to `/teacher/library/activities` (which redirects to the Desk activities tab). Do not add a new route.
**Commit:** `fix(nav): Activities nav item no longer 404s`

### T1.8 Data hygiene trio
**Changes (three small fixes, one commit):**
1. `src/lib/googleDrive.ts` (search `localStorage`): keep the Google OAuth access token in a module-level variable only; delete the `localStorage` read/write of `lsatu.gdrive.token.v1` and clear any existing stored value on load (`localStorage.removeItem(...)`).
2. `src/contexts/AuthContext.tsx`: on sign-out, call `queryClient.clear()` (import the shared query client or use `useQueryClient` where sign-out is handled).
3. `src/pages/admin/IntroLr.tsx` (search `permLoading = false`): use the real `loading` from `useUserPermissions()` instead of the hardcoded `false`.
**Commit:** `fix(hygiene): token storage, cache clearing, perm loading`

### T1.9 Assignment pipeline correctness (pre-consolidation patch)
**File:** `src/hooks/useAdminAssignments.ts` (search `class_id: set.class_id`)
**Change:** (a) write `class_id: studentId` (match `src/components/teacher/AssignmentBuilder.tsx`, search `class_id: studentId`); (b) after a successful insert, create the classroom item and notification exactly as `AssignmentBuilder` does (import and reuse its helpers `createClassroomItem` / `notifyStudentOfClassroomItem` from their modules — search `classroomNotify`). (c) In `src/pages/admin/GuidedDrills.tsx` (search `Promise.all`), wrap each per-student notify in its own try/catch so one failure doesn't reject the batch; collect failures and toast them per student; do not re-insert already-created assignments on retry.
**Acceptance:** assigning homework from `/admin/homework/:setId` produces a classroom item + notification for the student, with the student's id as `class_id` (verify in Supabase table editor).
**Commit:** `fix(assign): correct class_id, notify on admin path, per-student failure isolation`

**PHASE 1 GATE:** all tasks committed, `npm run build` green, then push via safe-push. Report completion to Joshua before starting Phase 2.

---

## PHASE 2 — The unified shell (gray, real routes)

Design tokens for all Phase 2+ UI (from spec D2/D10):
- Ground: the existing Desk light-gray palette (reuse its Tailwind classes; do not invent new grays).
- Accent: the Desk's existing warm rust/amber (the color currently on the Desk "New command" / "Assign" buttons — locate it in `src/pages/teacher/desk/` styles and promote it to a token, e.g. `--teacher-accent`). ALL primary actions in the teacher workspace use this one accent. No green/magenta/dark-green buttons anywhere.
- Type: match the app's editorial type scale used in the Classroom headers (serif display for page titles, existing sans for body).

### T2.1 New shell component
**Create:** `src/pages/teacher/shell/TeacherWorkspaceShell.tsx`
**Spec:** A layout route component: left sidebar (always mounted) + header + `<Outlet/>` + AI panel slot (Phase 3 fills it; render a placeholder toggle now).
- Sidebar items (exact order): Today `/teacher/today` · Students `/teacher/students` · Inbox `/teacher/inbox` · Library `/teacher/library` · Schedule `/teacher/schedule` · Insights `/teacher/insights`.
- Use `NavLink` with `end` on Today so exactly ONE item is ever active. Verify: navigate to every room; no double-highlight.
- Header: room title, a Whiteboard button (opens `/teacher/whiteboard` — see T2.4), AI-panel toggle placeholder.
- Gray ground, accent per tokens above.

### T2.2 Re-route the workspace
**File:** `src/App.tsx`
**Change:** Replace the current `/teacher` routing (both the outer `TeacherDeskPreview` route and the `TeacherShell` block) with:
```
/teacher                 → <Navigate to="/teacher/today" replace />
/teacher/*  (layout = TeacherWorkspaceShell, wrapped in ProtectedRoute requireAdmin)
  today      → DeskTodaySurface (extracted, T2.3)
  students   → DeskPeopleSurface (ported)
  students/:studentId → student dossier placeholder (Phase 3), interim: existing TeacherStudentDetail content
  inbox      → existing Messages surface (ported; Gmail merge in Phase 3)
  library    → DeskLibrarySurface with tab as child route: library/:tab? (tabs: bootcamps | guided-drills | homework | activities | references; default bootcamps)
  schedule   → TeacherSchedule content
  insights   → BootcampsHub (+ existing nested topic/student detail routes)
  whiteboard → TeacherSmartboard (reached from header button, not sidebar)
  dev        → Inspector, BootcampReferenceLab, LsatKnowledgeImport (index page with three links)
```
Keep old paths (`?ws=`, `/teacher/command`, etc.) working via redirects TO the new routes for now (delete in Phase 4): `/teacher?ws=people → /teacher/students`, `?ws=library → /teacher/library`, `?ws=messages → /teacher/inbox`, `?ws=gmail → /teacher/inbox`, `?ws=today → /teacher/today`, `/teacher/command → /teacher/today`, `/teacher/conversations → /teacher/inbox`. Implement the `?ws=` mapping as a small component at `/teacher` index that reads `searchParams` before defaulting to `today`.
**Acceptance:** every sidebar item renders inside the shell (sidebar never disappears); browser back/forward walks room history; deep links work; old `?ws=` URLs land correctly.

### T2.3 Port the Desk surfaces out of the overlay
**Files:** `src/pages/teacher/desk/*`
**Change:** The Desk today renders as a full-screen overlay with its own internal rail (`TeacherDeskPreview.tsx`, `deskTasks.ts` workspaces). Extract each surface (`Today`, `DeskPeopleSurface`, messages, `DeskLibrarySurface`) into components that render inside the new shell's `<Outlet/>` (no overlay chrome, no close button, no internal `ws` switching — the shell's sidebar is the only nav). The Today surface becomes: to-do queue (calendar/email/work cards) as the MAIN column + "Today's sessions" and quick stats; the chat moves to the AI panel (Phase 3) — interim, keep the composer at the bottom of Today.
**Acceptance:** no `?ws=` reads remain in desk surface components (`grep -rn "ws=" src/pages/teacher/desk` returns only the legacy-redirect mapper); the overlay close button is gone; Library tabs are routes (`/teacher/library/guided-drills` etc.).

### T2.4 Retire the dark shell and classroom "Teaching" nav
**Files:** `src/pages/teacher/TeacherShell.tsx`, `src/components/…/MainhubSidebar.tsx`, `src/…/ClassroomLayout.tsx` (search for `"/teacher"` links)
**Change:** Delete `TeacherShell.tsx` and all references. In the classroom/mainhub sidebars, the teacher-only "Teaching" group becomes exactly two links: **Teacher Workspace** → `/teacher/today`, and nothing else (References and Whiteboard now live inside the workspace). Remove links to `/admin/board`.
**Acceptance:** `grep -rn "TeacherShell" src/` → no hits; classroom sidebar shows a single Teaching link for teacher accounts.

### T2.5 Visual unification pass on ported surfaces
**Change:** Apply the tokens (gray ground, single accent, editorial titles) across the six rooms. Specific known defects to fix while restyling:
- Library cards: title never truncated to "Princip…" (wrap to 2 lines, full title in tooltip); one accent for Open/Assign buttons; fix the Guided Drills week-header overlapping-text glyph bug (search the week header component in `src/pages/teacher/desk/library/DeskLibraryGuidedDrillsSurface.tsx`; the header stacks two absolutely-positioned strings — render one string).
- Schedule day toggles: use the standard shadcn `Switch` so on/off is visually unambiguous.
- Insights: page H1 must read "Insights" (nav label = page title).
**Acceptance:** screenshot review of all six rooms: one palette, one accent, no truncated titles, no garbled headers.

**PHASE 2 GATE:** build green, manual walkthrough of all six rooms + whiteboard + dev, push, report.

---

## PHASE 3 — Consolidations

### T3.1 `assignWork()` — single assignment pipeline
**Create:** `src/lib/assignWork.ts`
**Spec:** `assignWork({ teacherId, studentIds, item, scheduledForLocalDate? })` where `item` is a discriminated union: `{kind:'homework_set', setId}` | `{kind:'guided_drill', drillId}` | `{kind:'activity', activityId}` | `{kind:'bootcamp', topicId}`. For EACH student, sequentially: (1) insert the assignment row with `class_id = studentId`; (2) create the classroom item; (3) notify (in-app + email via existing `notifyStudentOfClassroomItem`). Per-student try/catch; return `{ok: StudentResult[], failed: StudentResult[]}`; a step-2/3 failure attempts compensating delete of the step-1 row so no orphans remain. Dates: parse with `localDayISO` from `src/lib/localDate.ts` (never `new Date('YYYY-MM-DD')`).
**Change:** Replace ALL existing assignment writes with calls to it: `src/components/teacher/AssignmentBuilder.tsx`, `src/hooks/useAdminAssignments.ts`, `src/pages/admin/GuidedDrills.tsx` (until deleted), `src/pages/teacher/desk/library/*Surface.tsx` assign flows.
**Acceptance:** `grep -rn "guided_drill_assignments\|homework_assignments" src/ --include="*.tsx" --include="*.ts" | grep -v assignWork | grep -v types.ts | grep -v test` → only read paths remain, no inserts outside `assignWork.ts`. Assigning from Library creates row + classroom item + notification; a forced notify failure leaves no orphan row.

### T3.2 Students room — the dossier
**Create:** `src/pages/teacher/students/StudentDossier.tsx` at `/teacher/students/:studentId`, tabs (child routes): `overview` (default) | `work` | `notes` | `messages` | `schedule`.
- **Overview:** port the snapshot from `src/pages/admin/StudentHub.tsx` + access/role controls from `DeskPeopleSurface` (fix while porting: after a successful `toggleAccess`/`setRole`, refetch instead of trusting the optimistic write; per-field rollback, not whole-object).
- **Work:** one timeline of ALL assignment kinds for this student (query the assignment tables + classroom items), newest first, status chips, an "Assign work" button opening the shared assign flow (T3.4) pre-scoped to this student.
- **Notes:** session notes/recaps surfaces currently in StudentHub.
- **Messages:** this student's platform threads (reuse Inbox thread components filtered by student).
- **Schedule:** the per-student schedule panel from `TeacherSchedule` (search "Select a student to view their schedule").
**Change:** Roster page (`/teacher/students`) rows link to the dossier. Delete `/admin/ta` route + `StudentHub.tsx` + the floating-widget entry points (`AdminChatHub`, `FloatingTAWidget` — search `"/admin/ta"`), and `TeacherStudentDetail.tsx` once its content is absorbed.
**Acceptance:** everything about one student reachable within the dossier; `grep -rn '"/admin/ta"' src/` → no hits.

### T3.3 Unified Inbox with Gmail Pull (spec D5/D11)
**File base:** the Messages surface + `src/features/admin-inbox/gmail/*`
**Change:**
1. `/teacher/inbox` shows one thread list with source filter chips: All · Platform · Email; existing filters (Unread, Needs reply, Attachments) apply across both.
2. **Pull model:** remove any Gmail auto-fetch/polling. Add a header **Pull** button: on press, call the existing gws/Gmail-API sync path to fetch changes since the stored `historyId` (full mailbox: inbox, sent, labels, archive; first pull seeds via full list, subsequent pulls use the history API). Show spinner on the button while pulling, then "N new" badge and "Last pulled 2:41 PM" text. Persist `historyId`/last-pull per user.
3. Fix the folder/label bug: in `GmailPane.tsx` (search `handleFolderChange`), clear `userLabelId` (`setUserLabelId(null)`) when a system folder is selected so the query matches the highlighted folder.
4. Batch modify: per-id failure isolation (do not roll back the whole batch) — search `TODO(v1.1)` in `useGmailModify.ts`.
5. Every email thread row offers: open in Gmail (external link), reply in-platform, "draft with AI" (opens AI panel with thread context).
**Acceptance:** with the network tab open, no Gmail requests fire without pressing Pull; pressing Pull updates the list and timestamp; selecting a label then clicking Sent shows Sent mail.

### T3.4 Library consolidation (homework ⋈ guided drills, spec D4)
**Change:**
1. Add a **Homework** tab at `/teacher/library/homework`: card grid of `homework_sets` using the SAME card component as guided drills (title, item count, week/topic chips, Open + Assign with the accent). Detail view = beautified port of `src/pages/admin/HomeworkDetail.tsx` (keep the question picker; apply tokens). While porting fix: `useHomeworkSets` early-return leaving `loading` stuck true (search `if (!user || !setId) return` in `src/hooks/useHomeworkSets.ts` — set loading false before returning), and the stale-form bug (re-initialize form state when `setId` changes).
2. Shared taxonomy: both drills and homework filter by the same week/topic dropdowns; a combined "All" view can interleave both kinds.
3. **Bundle assign:** the assign flow (one shared `<AssignWorkSheet>` component calling `assignWork()`) accepts multiple items of mixed kinds and one or more students, so a drill + homework set ship as one assignment event.
4. References tab absorbs BootcampReferences + TutorCorpus as read-only lists.
5. Delete after absorption: `/admin/homework*` routes + pages, `/admin/guided-drills` + page, `/admin/library` + `TeachingLibrary.tsx`, `/teacher/reference-library*`, `/teacher/tutor-corpus` routes (content now inside Library).
**Acceptance:** homework and guided drills render with identical card systems and filters; a mixed bundle assign creates all rows + one classroom notification per student; deleted routes 404 → covered by Phase 4 catch-all.

### T3.5 AI panel (spec D6)
**Create:** `src/pages/teacher/shell/AiPanel.tsx`, mounted in the shell.
**Spec:** Right side panel: expanded (default 400px, drag-resizable 320–560px) ⇄ collapsed (thin rail with icon). Toggle via header button + `⌘J` (`keydown` listener, `metaKey && key === 'j'`, preventDefault). State (open/width) in `localStorage`. Contents: the Desk chat (saved chats list, composer with model picker, drafts). Context injection: the panel receives `{room, focusedStudentId?, threadId?}` from a shell-level context provider and shows matching quick actions ("Draft reply to <name>", "Suggest next work for <name>", "Summarize this thread"). Move the composer out of Today (T2.3 interim) into this panel; Today's main column is now purely the queue.
**Acceptance:** panel opens/collapses from every room and via ⌘J; width persists across reload; opening it from a student dossier shows that student's quick actions.

### T3.6 To-do ranking + small queue fixes
**Files:** `src/pages/teacher/desk/useCalendarTodoSource.ts`, `useGmailTodoSource.ts`, `deskTasks.ts`
**Change:** One scoring function: `score = bandBase + clamp01(recency)` where bandBase is 3000 (email needing reply), 2000 (work items), 1000 (calendar, except events in the next 2h get 4000), and `recency = 1 - min(ageHours, 72)/72` scaled to <1000. All three sources use it. Also: sender-filter heuristic (search `localPart.includes`) switches to word-boundary matching; remove the no-op `['teacher-todo-queue']` invalidations or register the key properly.
**Acceptance:** an unread student email from yesterday ranks above a routine calendar event tomorrow; a session starting within 2h ranks first.

**PHASE 3 GATE:** build green, full manual pass (assign homework+drill bundle to a test student, pull Gmail, drive AI panel from 3 rooms), push, report.

---

## PHASE 4 — The purge

### T4.1 Delete dead pages
**Delete files** (verify zero references first with `grep -rn "<Name>" src/` for each): `src/pages/teacher/`: `TeacherActivities.tsx`, `TeacherLibrary.tsx`, `TeacherStudents.tsx`, `TeacherAssignments.tsx`, `TeacherAssignmentsOverview.tsx`, `TeacherRecaps.tsx`, `TeacherUploads.tsx`, `TeacherAnalyticsBridge.tsx`, `TeacherBootcamps.tsx`, `BookingPasses.tsx`, `TeacherAdmin.tsx`, `TeacherWeeklyPlans.tsx`, `TeacherToday.tsx`, `TeacherTemplates.tsx`, `TeacherSessionIngest.tsx`, `TeacherAITA.tsx`, `TeacherConversations.tsx` (absorbed into Inbox), plus `src/pages/AdminDashboard.tsx`, `src/pages/AdminBoard.tsx`, `src/pages/admin/StudentHub.tsx`, `Homework*.tsx`, `GuidedDrills.tsx`, `TeachingLibrary.tsx` (all absorbed in Phase 3). Remove their lazy imports from `App.tsx` (especially the dead `TeacherWeeklyPlans` import).
**Note:** if any file still has references, the referencing feature was missed — STOP and report rather than deleting.

### T4.2 Delete redirect stubs
**File:** `src/App.tsx`
**Change:** First rewrite every remaining internal navigation to canonical routes: `grep -rn '"/teacher?ws=\|/teacher/command\|/teacher/conversations\|/teacher/library/\|/teacher/assignments\|/teacher/weekly-plans\|/admin/' src/ --include="*.tsx" --include="*.ts"` and update each hit. Then delete all legacy redirect routes, keeping exactly two: `/teacher` index → `today` (with the `?ws=` mapper), and `/admin/*` → `/teacher/today`.
**Acceptance:** the grep above returns no legacy-path writers; app-wide click-through produces no 404s.

### T4.3 Database + types cleanup
**Changes:**
1. ~~New migration dropping `schedule_templates`.~~ **CANCELLED — DO NOT DROP THIS TABLE.**
   Checked in the SQL editor 2026-08-06: it holds **2 live rows** (`standard-week`,
   `saturday-test-week`) seeded by `20260805003000_schedule_templates.sql`.

   The name was reused. The old `TeacherWeeklyPlans` table (`20260508000000`,
   columns `template_type` + `items_json`) never reached prod — neither column
   exists there. What is in prod is yesterday's "schedules as data" feature:
   `days_json` jsonb, `slug`, `is_default`, and the two seeded schedules,
   one of which is Malaya's. Dropping it would delete real teaching data.

   The old **page** (`src/pages/teacher/TeacherWeeklyPlans.tsx`) is still fair
   game for T4.1. The **table** is live and stays.
2. Regenerate `src/integrations/supabase/types.ts` (`npx supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts` — ref is in `src/integrations/supabase/client.ts`). Remove now-unneeded `as unknown as` casts (search `as unknown as {`).
3. Delete `src/hooks/use-toast.ts` if `grep -rn "use-toast" src/` shows no imports.
**Commit:** `chore(purge): drop dead table, regen types, remove dead shims`

**PHASE 4 GATE:** `npm run build`; bundle should shrink (compare `dist/` sizes before/after); push, report.

---

## PHASE 5 — Power layer

### T5.1 Focused student
Shell-level context: `FocusedStudentProvider` with `{studentId, setFocusedStudent}`. Set it when opening a dossier or picking a student anywhere. Shell header shows a chip ("● Lexi A ✕"). Consumers: Inbox filter, Library assign default, AI panel context, Schedule student panel. Clearing the chip clears the filters.

### T5.2 ⌘K command palette
Use the shadcn `Command` component. Sources: students (name → dossier), rooms, actions ("Assign work…", "Pull Gmail", "Open whiteboard", "New chat"). `⌘K` opens; typing filters; Enter navigates.

### T5.3 Undo toasts
For assign and dismiss actions: perform immediately, show a 10s toast with Undo that reverses (delete assignment via compensating path in `assignWork`, restore dismissal). No confirm dialogs on these paths.

### T5.4 Remaining punch list (small, one commit each)
1. `AssistantComposer.tsx` image overflow: compute `overflow` OUTSIDE the `setImages` updater (count before setState).
2. `TeacherSchedule.tsx` `?event=` param: validate as UUID before building the `.or(...)` filter; render "event not found" on failure.
3. Queue row keys: use `student.class_id` in the queue list key (was in `TeacherAITA`; apply wherever that list landed in Today).
4. `DeskPeopleSurface` feature-adoption bars: denominator = total user count; compute max once outside the map; only rendered keys.
5. `useBootcampMetrics`: compare timestamps via `Date.parse(a) <= Date.parse(b)`, not string compare (5 sites, search `toISOString()` comparisons).
6. `BootcampLessonProgress`: when the `students` row lookup fails, render an explicit "No progress data" state instead of `return null`.
7. `useNextSession` query key: include `user.id`.
8. Strip spec-language comments (search `AC #`, `Item B —`, `Item C —`, `Item D —`, `build-spec §`).

---

## Final verification (after Phase 5)

1. `npx tsc --noEmit` && `npm run build` green.
2. Production-build walkthrough as admin: all six rooms + whiteboard + dev; sidebar never unmounts; exactly one active nav item at all times.
3. As a NON-admin test account: `/teacher/*` and `/admin/*` all redirect away.
4. Assign a homework+drill bundle → student receives classroom item + notification + email; Supabase rows have student `class_id`; no orphans after a forced failure.
5. Gmail: zero requests until Pull; Pull updates list + timestamp; label→folder switching correct.
6. Kill the network mid-session: every surface shows error states, zero fabricated zeros.
7. `grep -rn "TeacherShell\|ws=people\|/admin/ta\|STARTER_CANVAS" src/` → no hits.
8. Report to Joshua with screenshots of each room.

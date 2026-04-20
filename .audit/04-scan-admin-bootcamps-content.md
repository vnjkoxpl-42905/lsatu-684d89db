# Scan 4 — Admin, Bootcamps, and Content Surfaces

**Scope.** `src/pages/AdminDashboard.tsx`, `src/pages/Bootcamps.tsx`, `src/pages/CausationStation.tsx`, `src/pages/MainConclusionRole.tsx`, `src/pages/Abstraction.tsx`, `src/pages/Classroom.tsx`, `src/pages/Schedule.tsx`, `src/pages/WrongAnswerJournal.tsx`, `src/pages/FlaggedQuestions.tsx`, `src/pages/Analytics.tsx`, `src/components/bootcamp/*`, `src/components/dashboard/*`, `src/components/gamification/*`, `src/lib/classroomData.ts`, `src/lib/achievementEngine.ts`, `src/lib/gamification.ts`, `src/lib/streakSystem.ts`, `src/lib/wajService.ts`, `supabase/functions/admin-manage-users/index.ts`.

## Executive Summary

This scan uncovers the most severe product-rule violation in the entire repo. **Two core surfaces (Classroom and Schedule) are powered by hardcoded mock data with fabricated student records, fabricated feedback, and fabricated scores.** A student tapping Classroom sees "PT 92 — Full Exam, Returned, Score 76, 'Parallel Reasoning continues to drag — revisit the structural pattern'" — an exam they never took and feedback Joshua never wrote. This directly violates the architecture rule "Do not expose actions users cannot actually perform — no fake analytics, no dead buttons, no misleading placeholders."

The Admin Dashboard is architecturally competent (granular flag groups, optimistic UI with rollback, well-structured edge function) but violates the "Admin must be desktop AND mobile responsive" product rule — the core user table is a 6-column `<table>` with no mobile variant. There is also a silent bug in the analytics fetch: the client passes `x-mode: analytics` as a header, the edge function reads `mode` from a query param, so the analytics endpoint never fires in analytics mode.

A pile of gamification code is completely disconnected. `XPBar`, `StreakWidget`, `BadgeGallery`, `CelebrationModal` components exist. `achievementEngine.ts`, `streakSystem.ts`, `gamification.ts` total ~500 lines. `profiles` has `xp_total`, `streak_current`, `longest_streak`, `level` columns. `calculateXP` is never called. The system is ~700 lines of scaffolding with zero runtime wiring. `Profile.tsx` renders the columns as zeros forever.

Bootcamps, Analytics, WAJ, and FlaggedQuestions are all real product surfaces using real DB queries. No fake-data flags.

## Deep Findings

### F4.1 — Classroom is entirely mock data (new finding, worst violation in repo)
**Evidence.** `src/pages/Classroom.tsx` imports `MOCK_ASSIGNMENTS` and `MOCK_MATERIALS` from `src/lib/classroomData.ts` (177 lines). `classroomData.ts:78-153` defines 6 fake assignments with fabricated teacher comments:

- `a1` — "20 Sufficient Assumption questions, adaptive mode"
- `a2` — "PT 87 — Section 3 (LR)"
- `a3` — "Strengthen & Weaken — Review Set"
- `a4` — **"PT 92 — Full Exam"** with `feedback: { score: 76, comments: "Solid performance in Section 1 and 4. Parallel Reasoning continues to drag — revisit the structural pattern. Section 2 timing was off by 4 minutes; consider your pacing on long stimuli.", returnedAt: '2026-03-26T14:30:00Z', opened: false }`
- `a5` — "Parallel Reasoning — Response" with fabricated revision feedback
- `a6` — "Causal Reasoning — Drill Set" with `feedback: { score: 92, ... }`

Plus 3 fake materials (Argument Structure, Conditional Logic, Parallel Reasoning). Zero Supabase integration, zero real classroom tables. `AssignmentsTab:302` filters and renders `MOCK_ASSIGNMENTS`. Every student who views Classroom sees the same fabricated academic history attributed to them.

**Why this is worse than a dead button.** A dead button signals a feature is not ready. Fake data masquerading as the student's real record lies about their history, their instructor's feedback, and their progress. Two students comparing notes will instantly see identical fake assignments with identical fake scores on both accounts. Product credibility is dead at that point.

**Severity: 10/10.**
**Fix.**
- **(A) Right fix:** ship a real `assignments` table + migrations + RLS + loader + admin-side creation UI. Multi-week project.
- **(B) Immediate stopgap:** replace the mock array with a truthful empty state ("No assignments yet. Your instructor will post materials here when ready.") and remove Classroom from the sidebar nav until (A) is built. Do NOT leave mock data live.

### F4.2 — Schedule is in-memory only, no persistence (new finding)
**Evidence.** `src/pages/Schedule.tsx:49`: `const INITIAL_TASKS: Task[]` with 8 hardcoded tasks ("Flaw & Weaken — 20 Qs", "PT 140 — Section 2", "Causation Station — Module 1", etc.). `Schedule.tsx:288`: `const [tasks, setTasks] = React.useState<Task[]>(INITIAL_TASKS);`. Add-task handler at `:314`, delete-task handler at `:323` mutate local state only. No Supabase call. No localStorage.
**Behavior.** User adds a task, refreshes page, original 8 fake tasks reappear and additions are gone. Add/Delete are fake affordances.
**Severity: 8/10.**
**Fix.** `scheduled_tasks` table (id, class_id, user_id, date, type, title, linked_qids jsonb). Real loader. Delete `INITIAL_TASKS`. OR remove the surface until backed.

### F4.3 — AdminDashboard table is not mobile-responsive (architecture rule violation)
**Evidence.** `src/pages/AdminDashboard.tsx:265-332`. A 6-column `<table>`: expander / User / Role / Last Seen / Access count / Actions (two buttons). No `overflow-x-auto` wrapper, no mobile card variant. CLAUDE.md product rule: "Admin is fully responsive on desktop and mobile."
**Behavior.** At 380px the table horizontally overflows. Stat cards (`grid-cols-2 md:grid-cols-4`) and feature adoption (`grid-cols-2 md:grid-cols-5`) are responsive. The user table is the outlier.
**Severity: 6/10.**
**Fix.** Wrap in `overflow-x-auto` as stopgap. Proper: stacked card list below `md` with disclosure-triggered detail.

### F4.4 — Broken analytics two-request pattern
**Evidence.** `AdminDashboard.tsx:107-115`: client calls `supabase.functions.invoke("admin-manage-users", { method: "GET", headers: { "x-mode": "analytics" } })`. `supabase/functions/admin-manage-users/index.ts:66`: server branches on `url.searchParams.get("mode")`.
**Behavior.** Header is ignored. Query param is null. Analytics branch never fires. Server returns the user list. Client does `setAnalytics(analyticsRes.data)` — `analytics` becomes an array of users, not an `Analytics` object. `computedAnalytics = analytics || {...fallback...}` — fallback never triggers because array is truthy. `computedAnalytics.total_users` etc. are `undefined`. StatCards render with `value={undefined}`. Admin sees empty numerics.
**Severity: 7/10.** Admin dashboard displaying undefined stats right now.
**Fix.** One-line server change: `const mode = url.searchParams.get("mode") ?? req.headers.get("x-mode")`. Or client sends `?mode=analytics` in URL. Also drop unused `total_attempts`/`week_attempts` or surface them.

### F4.5 — Entire gamification subsystem built but not wired
**Dead code inventory:**
- `src/lib/gamification.ts` (161 lines): XP curve, `calculateXP` with accuracy/speed/difficulty/streak/firstTime bonuses.
- `src/lib/achievementEngine.ts` (229 lines): achievement unlock logic.
- `src/lib/streakSystem.ts` (125 lines): streak tracking.
- `src/components/gamification/XPBar.tsx` — not imported anywhere.
- `src/components/gamification/StreakWidget.tsx` — not imported anywhere.
- `src/components/gamification/BadgeGallery.tsx` — not imported anywhere.
- `src/components/gamification/CelebrationModal.tsx` — not imported anywhere.
- `profiles` table has `xp_total`, `streak_current`, `longest_streak`, `level` columns. `Profile.tsx` reads them. Nothing writes them.

`calculateXP` is never called. `awardXP` does not exist. `Profile.tsx:210-213` always renders zeros.
**Severity: 5/10** for code health; 7/10 counting "Profile shows xp: 0 forever" as a misleading-UI issue.
**Fix.** Ship or delete. If shipping: wire `calculateXP` into the Drill save path (consolidated per F2.11), add XPBar somewhere, add CelebrationModal on level-up. If deleting: remove the four components, the three lib files, drop the four columns in a migration.

### F4.6 — Bootcamps are real (based on scaffold inspection)
**Evidence.** `src/pages/Bootcamps.tsx` (130 lines) is a clean landing page with 3 real bootcamp cards routing to `/bootcamp/causation-station`, `/bootcamp/main-conclusion-role`, `/bootcamp/abstraction`. `CausationStation.tsx` delegates to `CSDashboard`/`CSDrillPlayer`/`CSFlashcards`/`CSJournal`. `Abstraction.tsx` is a 5-line wrapper. `MainConclusionRole.tsx` is 516 lines.
**Behavior.** No fake-data flags raised on first pass.
**Severity: 0.**
**Known open question.** Whether CSJournal persists to Supabase, whether flashcard progress is tracked across sessions, whether MainConclusionRole contains any further mocks — not verified at scan depth.

### F4.7 — FlaggedQuestions is correct
**Evidence.** `src/pages/FlaggedQuestions.tsx:40-48` queries real `flagged_questions` table scoped by `user_id`. Unflag mutation at `:57` does real delete. Launch-drill at `:68` uses `questionBank.getQuestion(qid)` and navigates with correct state.
**Severity: 0 (positive confirmation).**

### F4.8 — WAJ uses `wajService` and real DB
**Evidence.** `src/pages/WrongAnswerJournal.tsx` uses `getWAJEntries` from `src/lib/wajService.ts`. Queries real `wrong_answer_journal` table. Handles filters (qtype, level, pt, last_status).
**Severity: 0 (positive confirmation) at scan depth. Not deeply verified past line 100.**

### F4.9 — Analytics (student-facing) is well-built and real
**Evidence.** `src/pages/Analytics.tsx` (437 lines) queries real `attempts` table with 30-day window. Computes per-type / per-level / per-type-level accuracy, 7d-vs-previous-7d trend, impact-weighted top opportunities. Tap-to-drill directly into the weakest area. Empty-state "No data yet for this period" at line 219 is correct.
**Behavior.** This is premium analytics and it is real. Minor code smell: `loadAnalytics` relies on RLS (no explicit `.eq('class_id', ...)`). Fine but worth documenting.
**Severity: 0 (positive confirmation).**

### F4.10 — AdminDashboard optimistic UI is the reference pattern
**Evidence.** `AdminDashboard.tsx` `toggleAccess`, `bulkUser`, `setRole` all: update local state first → fire RPC → rollback on error with toast.
**Behavior.** Template for Drill.tsx `handleToggleFlag` (F2.12) and MessageComposer (F3.3) to adopt.
**Severity: 0 (positive confirmation). Do NOT change. Cite as the model.**

### F4.11 — CausationStation uses in-component view state
**Evidence.** `src/pages/CausationStation.tsx` uses `view` state (`'dashboard' | 'drill' | 'flashcards' | 'journal'`) instead of nested routes.
**Behavior.** Breaks deep linking (can't bookmark flashcards view). Defensible trade-off for a guided module.
**Severity: 3/10.**
**Fix.** Optional — migrate to nested routes if deep-linking becomes a requirement.

### F4.12 — `AskJoshua` node and admin-linking flow is consistent
**Evidence.** `ADMIN_USER_ID` hardcoded constant from F3.11 used only in `AcademyFoyer.handleAskJoshua` and `askJoshua.ts`. Admin Dashboard's role management is entirely `user_roles`-based (dynamic).
**Severity: 0 (positive confirmation).**

### F4.13 — Content pages share repeated header boilerplate
**Evidence.** Bootcamps, CausationStation, Analytics, WAJ, FlaggedQuestions, Classroom, Schedule all have near-identical header markup: back button → section label → LogoutButton → ThemeToggle.
**Severity: 3/10.**
**Fix.** Extract `<PageHeader title subtitle showBack>` component. Cuts ~40 lines per page.

## Scores (Scan 4 slice)

| Axis | Score |
|---|---|
| Architecture quality | 58 / 100 |
| Maintainability | 64 / 100 |
| UI/design consistency | 78 / 100 |
| Product vision alignment | **40 / 100** |
| Bug/risk level | 44 / 100 |

Product vision alignment score is the lowest in the audit. A premium outcome-driven LSAT product that lies to students about their own academic history fails the brand benchmark fundamentally.

## Next Actions (ranked)

1. **Remove Classroom mock data immediately.** (A) truthful empty state + de-link from nav, today. (B) real assignments schema + loader, this week.
2. **Fix Schedule persistence or remove the surface.**
3. Fix the Admin analytics mode detection (one-line server change).
4. Make AdminDashboard table mobile-responsive.
5. Decide on gamification: ship or delete. Both are acceptable — limbo is not.
6. Extract `<PageHeader>` component.
7. Deep-scan bootcamp content pipelines to rule out further mocks.

## Known Open Questions

- Are CSJournal, CSFlashcards, and similar bootcamp subcomponents backed by real persistence, or are they in-memory like Schedule? Not verified at scan depth.
- What is Joshua's intended content-creation flow for Classroom? Admin UI does not currently have classroom content tooling. Deciding this shapes the Option A vs Option B path for F4.1.
- Is the gamification subsystem paused or abandoned? Decides the ship-vs-delete call for F4.5.

# LSAT U Session Handoff — 2026-04-21

## Latest State
- SHA on main: `2ee2072` (fix(question-bank): skip reload when already loaded; dedupe concurrent load())
- Working tree: clean, on branch `main`, up to date with `origin/main`
- Unpushed commits: none

## Shipped This Session
- `2ee2072` fix(question-bank): load-once guard + promise dedup in `QuestionBank.load()`; `QuestionBankProvider` now synchronously reads `isReady()` / `getManifest()` so warm mounts don't re-fetch 102 JSON files
- `6e682bc` fix(homework): `<Select key={selectedPt}>` Radix re-mount on PT change in `QuestionMultiPicker`; dropped `canSave` gate in `HomeworkNew`, default title `"Untitled set"`, button only `disabled={submitting}`

Earlier on the same session branch (already on main before the Homework work, included for continuity):
- `983afa6` fix(drill): F2.15 — full-section mode persists attempts via shared `commitSessionAttempts` helper; real `timeMs` from `performance.now() - questionStartTime`
- `3b5cf08` fix(drill): F2.14 — 7 new cols on `blind_review_sessions`, 9 on `attempts`, real UUID, errors surfaced via toast

## Live on lsatprep.study
- Confirmed working (per user): Homework Phase A verification pass — commit `57445ae` deployed, DB tables `homework_sets` + `homework_assignments` present, `/admin/homework` routes respond
- Unverified (shipped but not click-tested by user in session): `2ee2072` load-once guard — user last reported Test dropdown stuck on "Loading questions...", fix was pushed after that report; awaiting user live verification post-Lovable-redeploy
- Unverified: `6e682bc` picker cascade fix on live site
- Known issues at session close: none reported unresolved — last user message was the loading bug, addressed in `2ee2072`

## In-Flight
- **Foyer Redesign Tier C plan**: written to `/root/.claude/plans/identity-you-are-claude-validated-fern.md` during session, never executed. User pivoted to Homework verification/bugs instead of approving Phase 2. Not explicitly cancelled. 5-node hero ring design (matched to reference image) w/ sidebar + dock refactor. Re-check plan file before resuming.
- **Cold-load perf on `/admin/homework/new`**: out of scope for `2ee2072`. Still does 102 sequential `fetch('/data/PT*.json')` on first visit of a browser session. Candidate fixes: parallel fetch with `Promise.all`, single combined manifest, or SW precache of `/data/*.json`. Not started.
- No staged work uncommitted.
- No debugging left open — all reported bugs were closed out this session.

## Critical Hazards
- **`(supabase as any)` casts** — 35 occurrences across 12 files; auto-generated DB types in `src/integrations/supabase/types.ts` are out of sync with recent migrations (homework_sets/assignments, BR fields, session_replays, drive_files). Sites:
  - `src/components/homework/StudentAssignSection.tsx`
  - `src/hooks/useHomeworkSets.ts` (5 casts)
  - `src/hooks/useStudentAssignments.ts`
  - `src/hooks/useAdminAssignments.ts` (3 casts)
  - `src/hooks/useInbox.ts`
  - `src/lib/adaptiveEngine.ts` (3 casts)
  - `src/lib/drillIntelligence.ts` (3 casts)
  - `src/lib/wajService.ts` (6+ casts)
  - `src/lib/questionPoolService.ts`
  - `src/lib/templateService.ts`
  - `src/pages/Drill.tsx` (2 casts incl. session_replays)
  - `src/pages/admin/DriveFiles.tsx`
  - Regenerate types via Supabase CLI and strip casts in one focused pass once DB surface stabilizes.
- **Pre-existing lint debt** — `npm run lint` currently reports **124 errors + 35 warnings** across ~50 files. Don't block on this for feature work, but don't add to it. Heaviest offenders:
  - `supabase/functions/tutor-chat/index.ts` (13 `any` errors)
  - `supabase/functions/admin-manage-users/index.ts` (6 `any` errors)
  - `src/components/drill/EnhancedBlindReview.tsx`, `BlindReviewFlow.tsx`, `TutorChatModal.tsx`, `VoiceCoachModal.tsx`
  - `src/contexts/QuestionBankContext.tsx` — **one** known warning on line 43 re: Fast Refresh (ignore, pre-existing)
  - `src/pages/ResetPassword.tsx:166` empty block
  - `tailwind.config.ts:134` forbidden `require()`
- **TypeScript strict flags are OFF** — `strictNullChecks: false`, `noImplicitAny: false`. Flipping either cascades into a huge diff. Do not touch without explicit approval.
- **Lovable quirks** — `lovable-tagger` Vite plugin, `vite-plugin-pwa` start URL pinned to `/foyer`, Lovable preview SW guard in `src/main.tsx`. Don't remove.
- **No CI** — no GitHub Actions, no pre-commit hooks. Ship discipline is manual: `npx tsc --noEmit -p tsconfig.app.json` + `npm run lint` + `npm run build` before every push (Tier C).
- **DNS / email / env** — not audited this session; no known action items.
- **`bun.lock` / `bun.lockb`** still present in repo — npm is canonical. Ignore but don't commit against them.

## Homework Phase A Architecture
- **Routes** (all `React.lazy` in `src/App.tsx`, `ProtectedRoute`-gated): `/admin/homework` (list), `/admin/homework/new` (create), `/admin/homework/:setId` (detail + assign), `/classroom/:assignmentId` (student view).
- **DB surface** (migrations `20260421112208_create_homework_sets.sql` + `20260421112209_create_homework_assignments.sql`):
  - `homework_sets` — admin-owned question set (title, description, `question_qids text[]`). RLS gated by `public.has_role(auth.uid(), 'admin')`.
  - `homework_assignments` — one row per (set × student). `due_at`, `status`, `student_id`. Students read own rows; admins read all.
- **Hooks**: `useHomeworkSets` (admin CRUD), `useAdminAssignments` (admin assign/list), `useStudentAssignments` (student list).
- **Components**: `QuestionMultiPicker.tsx` (PT → Section → Qs cascade; uses `QuestionBankContext`; Radix `key={selectedPt}` workaround is live), `StudentAssignSection.tsx` (bulk assign on detail page).
- **Known sharp edge**: picker depends on `questionBank.load()` being fast. Warm nav is now free (load-once guard). Cold nav still does 102 fetches — flagged above.

## Bootcamp State
- **Routes**: `/bootcamps` (index list), `/bootcamp/causation-station`, `/bootcamp/main-conclusion-role`, `/bootcamp/abstraction`.
- **Pages**: `src/pages/Bootcamps.tsx` (card index, hardcoded `BOOTCAMPS` array with title/emoji/stats/route), plus three full bootcamp surfaces: `CausationStation.tsx`, `MainConclusionRole.tsx`, `Abstraction.tsx`.
- **Components**: `src/components/bootcamp/abstraction/InteractiveStemDrill.tsx` (known lint debt site — don't touch unless fixing).
- **No dedicated DB tables** for bootcamps — data is in-memory/static inside each page. WAJ / flagged / achievement infra reused for tracking.
- **Currently shipped bootcamps**: 3 (Causation Station, Main Conclusion & Role, Abstraction). No admin-side CMS; adding a bootcamp = new page + route + entry in the `BOOTCAMPS` array.

## User Preferences (Joshua)
- Terse, direct, no em dashes
- Plan mode before execution
- Commits direct to main, no branches
- Tier C (tsc + eslint + build, no regressions) for client UI; Tier B for DB changes
- Proactive suggestions welcome
- Push back when wrong — do not capitulate to incorrect claims
- Building a commercial product; treat every change as a production ship
- No fake data, no dead buttons, no placeholder actions that don't work
- Identity: email sign-in, **name** not username, instructor displays as "Joshua"
- When speculative fix is low-risk and targeted, apply directly without instrumentation first

## Recommended First Task for Next Session
**Ask Joshua to live-verify `2ee2072` on lsatprep.study**: open `/admin/homework/new`, confirm PT → Section → Test cascade hydrates without "Loading questions..." being stuck. If confirmed, close out Homework Phase A bug thread and ask whether to resume the Foyer Redesign Tier C plan (still sitting at `/root/.claude/plans/identity-you-are-claude-validated-fern.md`) or pick up cold-load perf for `/admin/homework/new` (parallel fetch / single manifest).

Justification: two distinct loose threads exist (Foyer plan + perf), and Joshua will steer. The load-once guard is the last shipped change and he hasn't confirmed it yet — that's the one blocker before anything else should start.

## Files Next CC Must Read on Startup
1. `CLAUDE.md` — project rules, gaps, conventions
2. `.audit/session-handoff-latest.md` — this file
3. `.audit/07-fixes-delta.md` — running log of fixes vs. audit findings
4. `src/App.tsx` — route registration (ground truth for what exists)
5. `src/lib/questionLoader.ts` + `src/contexts/QuestionBankContext.tsx` — load-once guard just shipped; understand before touching the picker
6. `src/components/homework/QuestionMultiPicker.tsx` + `src/pages/admin/HomeworkNew.tsx` — latest bug-fix surface
7. `supabase/migrations/20260421112208_create_homework_sets.sql` + `20260421112209_create_homework_assignments.sql` — Phase A DB surface
8. `/root/.claude/plans/identity-you-are-claude-validated-fern.md` — Foyer Redesign plan (approved? unclear — re-confirm before executing)

# LSAT U — Master Reference (April 2026, revised post cross-scan verification)

**Repo anchor:** `vnjkoxpl-42905/lsatu-684d89db` at HEAD `9165b2c`.
**Original audit date:** 2026-04-19.
**Addendum:** cross-scan verification folded in on same day. See `06-cross-scan-verification.md` for deduplication and evidence for the F*.* IDs added below.
**Supersedes:** `lsatu-fix-playbook.md` (Jan 2026).
**Scope note:** all findings below are grounded in the current repo state. Where this document disagrees with any earlier scan or the Jan playbook, the current repo wins.

---

## 1. Repository Architecture Map

**Stack.** Vite 5 + React 18 + TypeScript (strict-null OFF, `strict: false`, no CI type-check) + Tailwind 3.4 + shadcn/ui. Supabase (Auth + Postgres + Edge Functions) + Lovable Cloud Auth JWT fallback (`@lovable.dev/cloud-auth-js`). TanStack Query v5 (installed, sparingly used). Framer Motion + Spline. PWA via `vite-plugin-pwa` with CacheFirst (see F5.19).

**Size.** 182 TS/TSX files in `src/`. Largest single file: `Drill.tsx` at 2,194 lines.

**Shape.**
- `src/pages/` — 22 pages. `AcademyFoyer` is primary nav.
- `src/components/` — feature-grouped: `foyer/`, `drill/` (21 files, ~8k lines), `inbox/`, `bootcamp/`, `dashboard/`, `gamification/` (unwired). Plus `ui/` (57 shadcn files, 25 unused, `OrbitalLoader` orphaned — see F5.24) and `common/`.
- `src/contexts/` — 5 providers: Auth, UserSettings (localStorage-only, see F2.19), QuestionBank, Theme, Timer.
- `src/hooks/` — 6 hooks. `useUserPermissions` and `useInbox` are hot spots.
- `src/lib/` — business logic. `adaptiveEngine` 681 lines, runtime uses only ~4 methods (F2.18). `drillIntelligence`, `achievementEngine`/`gamification`/`streakSystem` (unwired), `questionLoader` (sequential 83-file fetch), `questionPoolService`, `questionTimer`, `wajService`, `displayName`, `highlightUtils`, `askJoshua`, `classroomData` (mock).
- `supabase/functions/` — 8 edge functions. 7 quality, 1 placeholder.
- `supabase/migrations/` — 36 migrations. History has RLS regression (F5.8).
- `public/data/` — 83 LSAT PT JSON files, ~3MB total. Cached CacheFirst for 7 days (staleness risk F5.19).

**Routing.** React Router v6. Routes registered in `src/App.tsx`. Feature-gated routes wrapped in `ProtectedRoute`. `/foyer` is the landing surface. **`FoyerSidebar` does not respect those permission flags — hardcodes the workspace link list (F4.17).**

**Auth flow.** Supabase Auth + Lovable Cloud Auth for Google OAuth, bridged via `src/integrations/lovable/index.ts`. Client-side row provisioning in `AuthContext.provisionStudentRecord` (no Postgres trigger — F1.2).

**Identity rules.**
- Admin displays as "Joshua" via `formatParticipantName(display_name, is_admin)` helper. `FloatingMessenger` bypasses the helper (F3.6).
- `class_id TEXT` with `get_user_class_id(auth.uid())` fallback to `uid::text`.
- **class_id/user_id resolution is inconsistent across 4+ surfaces (F1.10).** Works today only because provisioning sets `class_id = user_id`.
- `ADMIN_USER_ID` hardcoded in `src/lib/askJoshua.ts` (F3.11).

**Type safety.** `(supabase as any)` bypasses the generated types at 18 call sites (F5.20). This mechanism is what allows the schema contract drift findings (F2.13, F2.14) to survive undetected.

---

## 2. Frontend System Summary

**Primary navigation.** `AcademyFoyer.tsx` composes `FoyerSidebar` + `FoyerHeroRing`. Ring has 2 enabled nodes (Smart Drill, Ask Joshua) plus a center focus card CTA. `FoyerSidebar` is `hidden md:block` (F3.1 mobile nav trap). Sidebar hardcodes links without permission gating (F4.17). `FloatingMessenger` is suppressed on `/foyer`.

**Drill surface.** `Drill.tsx` is 2,194 lines with 40+ `useState`, 10+ `useEffect`, 4 DB-write paths — all swallow errors (F2.2). Full-section mode persists ZERO per-question attempts (F2.15). `saveBRResults` has TDZ risk (F2.17). Schema drift on section history (F2.13) and BR (F2.14) inserts means every full-section and every BR session silently fails to persist. `adaptiveEngine.ts` (681 lines) runs in browser; three of its most interesting methods are not in the runtime flow (F2.18).

**Messaging surface.** Inbox is real — 1:1 threads, PDF attachments via Supabase Storage, admin-only `polish-message` edge function. **Attachment realtime race (F3.18): receiver sees the message before the attachment row exists and never auto-refreshes.** ThreadList shows "New conversation" for PDF-only messages (F3.19). Student-initiated conversations fail at RLS (F3.4 dead Ask Joshua).

**Content surfaces.**
- **Classroom: fake data (F4.1) AND dead launcher (F4.16).** Every Start/Resume button bounces back to /foyer.
- **Schedule: in-memory only (F4.2).**
- **Analytics: no explicit scoping (F4.14).** RLS-dependent. Potential cross-user leak if F5.8 regression in production.
- **Profile: broken key `.eq('id', user.id)` instead of `user_id` (F4.15).** Never resolves student row. Shows zeros regardless of gamification state.
- WAJ, FlaggedQuestions: real, DB-backed.
- Bootcamps: 3 modules, scaffolding real; persistence not verified at scan depth.
- Admin: granular flag groups, optimistic UI with rollback — best DB-mutation pattern in the repo. Table not mobile-responsive (F4.3). Analytics endpoint broken (F4.4/F5.6).

**Design system.** HSL CSS variables throughout. Dark-first palette at `:root`, `.dark` aliased to `.light` (F5.1 broken convention). `RecentPerformanceWidget` hardcodes colors instead of tokens (F5.21). `OrbitalLoader` exists but is never imported — every loading state uses raw `animate-spin` divs (F5.24). `hover:` variants lack `(hover: hover)` guards — sticky hover on iOS (F5.25). `BackgroundPaths` renders 72 animated SVG paths continuously (F5.22). `IL` instrument-label primitive redefined in 4 pages (F5.23).

---

## 3. Backend / Data / Auth Summary

**Tables.**
- **Core student data:** `profiles`, `students` (legacy classroom-link), `attempts`, `wrong_answer_journal`, `flagged_questions`, `drill_templates`, `blind_review_sessions`, `voice_coaching_sessions`, `sessions`, `settings`, `events`.
- **Gamification (unwired):** `achievements`, `user_achievements`, `challenges`, `user_challenges`, `daily_stats`. Plus 4 dead columns on `profiles`.
- **Messaging:** `conversations`, `conversation_participants`, `messages`, `message_attachments`. `conversations.last_message_at` maintained by `bump_conversation_last_message` trigger (not a bug).
- **Auth/roles:** `auth.users` (Supabase managed), `user_roles`.
- **Content/coaching:** `concept_library`, `question_type_strategies`, `reasoning_type_guidance`, `tactical_patterns`.

**Schema contract health.** **Seriously compromised.** Client code writes fields that don't exist in the generated types for:
- `section_history` — 7 unknown fields on insert (F2.13).
- `blind_review_sessions` — 7 unknown fields on insert (F2.14).
- `attempts` (BR loop) — 9 unknown BR-specific fields on insert (F2.14).

Either the types file is stale and needs regeneration, or the DB needs migrations to add these columns. Either way, every full-section completion and every BR session currently fails to persist.

**RLS.** Post-Oct 22, 2025 tightening: most core tables scoped via `class_id = get_user_class_id(auth.uid())`. **Regression: April 6, 2026 baseline migrations reintroduce `USING (true)` on students, attempts, profiles, sessions, settings, events (F5.8).** Resolution still unclear. This makes F4.14 (Analytics unscoped) a potential cross-user leak in production right now.

**Helper functions.** `public.get_user_class_id(uid)` with `COALESCE(students.class_id, uid::text)` fallback. `public.has_role(auth.uid(), 'admin')`. `public.is_conversation_participant(conv_id, user_id)`. `public.get_conversation_participant_names(uuid[])` — SECURITY DEFINER RPC (reference quality).

**No auth trigger.** Zero `on_auth_user_created`. Client-side provisioning in `AuthContext.provisionStudentRecord` (F1.2).

**Edge functions (8).** All use proper CORS, input validation, 429/402 handling. `admin-manage-users` has mode bug (F4.4). `generate-micro-drill` is a stub (F5.5). Everything else is quality.

---

## 4. Design System Audit

**Strengths.** HSL tokens, cohesive dual palettes, bronze accent, glass/glow tokens, `glow-pulse`/`spotlight`/`slide-up`/`lift`/`fade-in` keyframes, ligatures, responsive type ramp, touch-friendly 16px inputs, zero-layout-shift `.hl` class with `box-decoration-break: clone`.

**Weaknesses.**
- `.dark` class aliased to `.light` — conceptual drift (F5.1).
- 50 `dark:` variants are dead styling.
- 25 of 57 UI components unused. **OrbitalLoader is one of them and shouldn't be** (F5.24).
- `hover:` variants lack `(hover: hover)` guard — sticky hover on mobile (F5.25).
- `RecentPerformanceWidget` hardcodes neutral-black/white-alpha (F5.21).
- `BackgroundPaths` renders 72 continuously animated SVG paths (F5.22).
- `IL` primitive redefined in 4 pages (F5.23).
- No shared shell component system — headers, page wrappers, section labels all redefined per page (F5.23 + F4.13).
- Theme FOUC on first paint.
- `components.json` baseColor mismatch.

**Motion.** Framer Motion used well in FloatingMessenger. BackgroundPaths is over-built for the job.

---

## 5. Scan-by-Scan Scores (original April scan)

| Scan | Area | Arch | Maint | UI/Design | Product | Bug Risk |
|---|---|---|---|---|---|---|
| 1 | Auth / Session / Permissions | 68 | 72 | — | 82 | 62 |
| 2 | Drill Surface | 52 | 48 | 74 | 70 | **38** |
| 3 | Foyer / Inbox / Realtime | 66 | 70 | 74 | 62 | 60 |
| 4 | Admin / Bootcamps / Content | 58 | 64 | 78 | **40** | 44 |
| 5 | Design System / Backend / Infra | 72 | 60 | **86** | 80 | 66 |

**Revised Bug Risk after cross-scan verification.** Scan 2 bug risk should be adjusted from 38 to **22** in light of F2.13, F2.14, F2.15 (schema drift + full-section zero persistence). Scan 4 bug risk from 44 to **36** in light of F4.14, F4.15, F4.16. The repo is materially buggier on the persistence layer than the April audit captured.

---

## 6. Prioritized Issue List

### Top-5 (revised post cross-scan verification)

| Rank | Issue | F-IDs | Severity | Notes |
|---|---|---|---|---|
| 1 | **Schema contract drift across 3 tables** | F2.13, F2.14 | 10 | Every full-section completion + every BR silently fails to persist. Single most dangerous truthfulness failure. |
| 2 | **Full-section mode writes zero attempts** | F2.15 | 9 | Compounds #1. Most premium mode is weakest persistence path. |
| 3 | **Classroom mock data + dead launcher** | F4.1, F4.16 | 10 | Fake data AND dead "Start" buttons on the same surface. |
| 4 | **Identity/scoping broken** | F1.10, F4.14, F4.15 | 8 | class_id inconsistent across surfaces; Profile wrong key; Analytics no scope. Cross-cutting. |
| 5 | **Mobile nav trap + dead Ask Joshua** | F3.1, F3.4 | 9 | Primary landing page unusable on phones for new students. |

### Scan 1 — Auth / Session / Permissions

| Rank | F-ID | Issue | Severity |
|---|---|---|---|
| 1 | F1.2 | Missing `on_auth_user_created` trigger | 8 |
| 2 | F1.10 | class_id resolution inconsistent across surfaces | 6 |
| 3 | F1.1 | `useUserPermissions` per-route fetching | 6 |
| 4 | F1.3 | `token_hash: userId` placeholder smell | 3 |
| 5 | F1.8 | `class_id::uuid` convention undocumented | 3 |

### Scan 2 — Drill Surface

| Rank | F-ID | Issue | Severity |
|---|---|---|---|
| 1 | F2.13 | `LRSectionResults` schema drift (7 unknown fields) | 10 |
| 2 | F2.14 | `saveBRResults` schema drift (16 unknown fields across 2 tables) | 10 |
| 3 | F2.15 | Full-section mode persists zero attempts | 9 |
| 4 | F2.1 | Question bank sequential fetch | 9 |
| 5 | F2.2 | `saveAttemptToDatabase` error swallow | 9 |
| 6 | F2.3 | Error-swallowing in 3 sibling write paths | 8 |
| 7 | F2.6 | Adaptive engine client-side | 7 |
| 8 | F2.5 | `Drill.tsx` 2,194 lines | 7 |
| 9 | F2.17 | TDZ risk in `saveBRResults` closures | 6 |
| 10 | F2.11 | Duplicate save sequences | 6 |
| 11 | F2.18 | Adaptive engine library > runtime surface | 5 |
| 12 | F2.12 | `handleToggleFlag` pessimistic | 5 |
| 13 | F2.8 | `classId` fetch duplicated | 5 |
| 14 | F2.19 | UserSettings localStorage-only | 4 |
| 15 | F2.9 | `QuestionTimer` orphaned | 4 |
| 16 | F2.4 | `Math.random` session ID | 4 |
| 17 | F2.16 | natural-drill not a distinct runtime mode | 3 |
| 18 | F2.20 | Highlights/eliminations session-only | 3 |
| 19 | F2.10 | Duplicate Fisher-Yates | 3 |

### Scan 3 — Foyer / Inbox / Realtime

| Rank | F-ID | Issue | Severity |
|---|---|---|---|
| 1 | F3.1 | Mobile nav trap | 9 |
| 2 | F3.4 | "Ask Joshua" dead button | 9 |
| 3 | F3.3 | No optimistic chat | 7 |
| 4 | F3.18 | Attachment realtime race | 7 |
| 5 | F3.2 | WebSocket channel sprawl | 6 |
| 6 | F3.6 | `FloatingMessenger` bypasses `formatParticipantName` | 5 |
| 7 | F3.19 | ThreadList empty for PDF-only messages | 4 |
| 8 | F3.9 | `ConversationView` auto-scroll yanks reader | 4 |
| 9 | F3.10 | Attachment upload no rollback | 4 |
| 10 | F3.7 | `NewConversationDialog` 200-cap + client filter | 4 |
| 11 | F3.11 | Hardcoded `ADMIN_USER_ID` | 3 |
| 12 | F3.5 | Hero ring doc/code mismatch | 3 |
| 13 | F3.8 | Unread-state race | 3 |

### Scan 4 — Admin / Bootcamps / Content

| Rank | F-ID | Issue | Severity |
|---|---|---|---|
| 1 | F4.1 | **Classroom is mock data** | 10 |
| 2 | F4.2 | Schedule in-memory only | 8 |
| 3 | F4.14 | Analytics.tsx no scoping | 8 |
| 4 | F4.15 | Profile.tsx wrong key `.eq('id',...)` | 7 |
| 5 | F4.16 | Classroom launcher bounces | 7 |
| 6 | F4.4 | Admin analytics mode detection bug | 7 |
| 7 | F4.3 | Admin table not mobile-responsive | 6 |
| 8 | F4.17 | FoyerSidebar no permission gating | 5 |
| 9 | F4.5 | Gamification built but unwired | 5 |
| 10 | F4.13 | Repeated header boilerplate | 3 |
| 11 | F4.11 | CausationStation view state not URL-backed | 3 |

### Scan 5 — Design System / Backend / Infra

| Rank | F-ID | Issue | Severity |
|---|---|---|---|
| 1 | F5.1 | `.dark` class semantics inverted | 6 |
| 2 | F5.19 | PWA CacheFirst 7-day staleness | 7 |
| 3 | F5.20 | `(supabase as any)` at 18 sites — enables schema drift | 7 |
| 4 | F5.8 | Migration RLS regression | 6 |
| 5 | F5.25 | hover: variants lack `(hover: hover)` guard | 5 |
| 6 | F5.21 | RecentPerformanceWidget hardcodes colors | 5 |
| 7 | F5.18 | No CI | 5 |
| 8 | F5.12 | Zero Vitest/Playwright specs | 5 |
| 9 | F5.5 | `generate-micro-drill` placeholder | 5 |
| 10 | F5.7 | Qtype canonicalization duplicated | 5 |
| 11 | F5.11 | ESLint thin | 4 |
| 12 | F5.24 | OrbitalLoader orphaned | 4 |
| 13 | F5.3 | 25 unused UI components | 4 |
| 14 | F5.22 | BackgroundPaths 72 animated paths | 4 |
| 15 | F5.14 | Theme FOUC on first paint | 3 |
| 16 | F5.23 | IL redefined 4x | 3 |
| 17 | F5.16 | `components.json` baseColor mismatch | 1 |
| 18 | F5.17 | `App.css` coexistence | 2 |

---

## 7. Known Open Questions

1. **Has the RLS regression in the April 6 migrations hit the production DB?** Cannot determine from repo alone. Now more urgent given F4.14.
2. **Do the DB tables actually have the BR/section fields the client inserts?** If types are stale, running `supabase gen types typescript --local` would confirm. If not stale, a migration is needed.
3. Are CSJournal/CSFlashcards/MainConclusionRole bootcamp internals persistence-backed?
4. `shorten_admin_display_name` migration — load-bearing or one-time?
5. Current user and conversation count (scaling assumptions).
6. Lovable's deploy pipeline — lint/type/test or raw build?
7. Gamification — paused or abandoned?
8. `.dark` alias — defensive against known scenario or vestigial?

---

## 8. Closing signal (revised)

The April 2026 bundle correctly identified the visible top-tier product failures (Classroom mock, mobile nav trap, Drill error swallow). The cross-scan verification surfaces a deeper layer: **the persistence contracts between client and DB are fractured, and the enforcement layers (type checking, CI, error surfacing) are all opted out.** The observable symptoms in the April audit were caused by the invisible schema drift.

Four urgent fixes in priority order:

1. **Regenerate Supabase types.** One command resolves the truth of F2.13 + F2.14. If DB has the columns, types were just stale and the code works. If DB doesn't, you write a migration.
2. **Add the missing `saveAttempts` loop to `handleFinishSection`** so full-section mode actually persists (F2.15).
3. **Fix Profile.tsx one-liner** (`.eq('user_id', user.id)`) — F4.15. Scope Analytics explicitly (F4.14).
4. **Remove Classroom mock data + de-link from nav** (F4.1). Classroom launcher becomes moot (F4.16) if F4.1 is solved cleanly.

Everything else in §6 can wait or parallelize.

The design system, edge function tier, hero ring, messaging schema, and the newly-identified analytics paths on WAJ/FlaggedQuestions are genuinely well-built. The product has premium bones. What it doesn't have yet is a disciplined persistence contract between client and DB, and that's the single biggest lever for upgrading it from "premium-looking" to "premium-grounded."

# LSAT U Session Handoff — 2026-05-01 (UPDATED end of day)

This is the single source of truth for current state across all in-flight work. Claude Code reads this on every session start. Do not skim.

---

## CURRENT STATE — END OF DAY 2026-05-01

> The "Three active work tracks" section below was written **earlier in the day when the bridge was still orphaned from routes**. That state was rewound. The text below in that section is HISTORICAL — read it for context but do NOT trust it as current state. The current truth is here at the top.

- **HEAD on `main`:** verify with `git log --oneline -5`. Latest expected commits (oldest → newest): `8baf646` (re-wire), `faeea3d` (Drill 3.1–3.3 Stages 3+4), `1375f87` (vitest log), `d53c6dd` (held recs), `2f75f30` (SPA fallback fix), and the current handoff/plan-defuse commit on top.
- **Hosting:** Lovable (Netlify-backed). Lovable-connected project is canonical; GitHub mirror auto-syncs from `main`.
- **Lovable autopilot:** `.lovable/plan.md` was rewritten end of day to lock the new bootcamp at `/bootcamp/structure`. The earlier landmine plan that reverted the bridge has been replaced.
- **Bridge status:** `/bootcamp/structure/*` → `MainConclusionBootcamp` (the new bootcamp at `src/bootcamps/main-conclusion/`). `/bootcamp/structure-v2` and `/*` redirect to `/bootcamp/structure`. Old `Structure.tsx` is on disk but unrouted. **Live and reachable** (pending Joshua walkthrough verification).
- **SPA fallback:** `public/_redirects` + `vite.config.ts navigateFallback` both shipped. Required for deep-link refresh on Netlify-backed hosts.
- **Vitest CI:** 18/18 pass. Infra was already wired in `package.json` + `vitest.config.ts`.
- **Phase D:** still blocked on M4 seeds (Q11 Mosston rebuttal + Q20 grain companies) in `docs/main-conclusion-bootcamp/m4-seed-request.md`.
- **Drill state:** 3.1–3.3 all 4 stages authored; 3.4 stages 1+2 authored, stages 3+4 still placeholder; 3.5–3.9 single-stage with sample content.
- **Doc reconciliation:** `BRIDGE_HANDOFF.md`, `gate-5-audit.md`, `promotion-runbook.md`, `PROJECT_MEMORY.md` all updated to current state.

---

## Lovable's `gpt-engineer-app[bot]` commits = JOSHUA OVERRIDE

Per Rule 14, even without a chat directive, treat any `gpt-engineer-app[bot]` commit as a Joshua override and log it in PROJECT_MEMORY.md Decisions Log. Earlier today, that mechanism caught Lovable's autopilot reverting the bridge — without it the regression would have been silent.

**Revert-watch armed:** if Lovable autopilot reverts the bridge again within 10 minutes of any future preview sync, **do NOT re-push**. Surface immediately so Joshua can paste an explicit Lovable prompt manually. The `.lovable/plan.md` rewrite should prevent this, but the watch stays armed as a safety net.

---

## HISTORICAL CONTEXT BELOW (do not act on as current truth)

The text below was the state at an earlier point in the day. It is preserved for context — don't delete it (audit trail) but don't trust it either. The "CURRENT STATE" block above supersedes everything below.

### Earlier-in-day state header

- SHA on main (at time of writing this section): Lovable's `9b35eb8`, `163be27`, `6954151`, `be79274` with message "Fixed structure bootcamp route" — superseded.

---

## Three active work tracks (HISTORICAL — see CURRENT STATE block above)

LSAT U currently has three parallel work tracks. Each has its own state. None blocks the others.

### Track 1: Main Conclusion bootcamp (the heaviest in-flight work)

**Status (HISTORICAL): built but orphaned from routes. Awaiting Lovable bridge re-do.** — superseded; bridge re-wired in `8baf646`.

What exists at `src/bootcamps/main-conclusion/` (100+ files, fully built):
- `App.tsx` + `modules/ModuleIndex.tsx` + `modules/Placeholder.tsx`
- `components/workspace-shell/` (LeftRail, RightDrawer, LockedRoute, WorkspaceShell)
- `components/primitives/` (Badge, Button, Card, Chip, EmptyState, Input, LoadingSkeleton, LockedState, Modal, SegmentedControl, Toggle, Tooltip)
- `components/command-palette/CommandPalette.tsx`
- `components/ai-tutor/` (AiTutor, templates) — stub mode, slot-filled templates, no live LLM call
- `components/smart-hints/` (SmartHints, hints)
- `components/trap-master/` (TraitTag, TraitDeepDive)
- `components/cluster-decomposer/ClusterDecomposer.tsx`
- `components/x-ray-scan/XRayScanToggle.tsx`
- `components/stage-gate/StageGateTracker.tsx`
- `components/coachs-note/CoachNoteCard.tsx`
- `components/argument-structure-map/CakeOnBlocks.tsx` (the cake-on-blocks SVG)
- `components/question/QuestionCard.tsx`
- `content/*.source.ts` (drills, indicators, named-tools, references, simulator, traps, hard-sentences, m5-capstone, schemas)
- `data/*.generated.json` — lessons (12), simulator (20), calibration (15), named-tools (15), references (11), indicator-vault (6), traps (7), manifest (86 entries)
- `data/*.extracted.json` — mcfirst, Cluster-Sentences-Review, main_conclusion_student_dup1
- `persistence/` — Persistence interface + LocalStoragePersistence + IndexedDBPersistence + V1Persistence + factory
- `hooks/` — useUser (stub), useDiagnostics, useModuleProgress
- `lib/` — srs, cn, diagnostics, ids, ordering
- `styles/` — tokens, base, scoped, print CSS
- `types/source-slots.ts`
- `routes.tsx`

Pipeline at `scripts/import-content.ts` runs end-to-end. Parity-verified (manifest 86 entries, 0 drift). 5 generated kinds + 2 parity-verified kinds (lessons, calibration).

Current route state in `src/App.tsx` (verified 2026-05-01):
- `/bootcamp/structure` → `src/pages/Structure.tsx` (the OLD 8-module bootcamp, still live)
- `/bootcamp/main-conclusion-role` → redirects to `/bootcamp/structure`
- `/bootcamp/structure-v2` → redirects to `/bootcamp/structure`
- `/bootcamp/structure-v2/*` → redirects to `/bootcamp/structure`

The new bootcamp at `src/bootcamps/main-conclusion/` is NOT registered in `src/App.tsx`. Orphaned from the route table. Lovable's "Fixed structure bootcamp route" commits removed the bridge.

**Why the bridge got reverted:** Lovable's autopilot saw routing it didn't recognize as canonical and reverted to the working old state. Lovable was never explicitly told the new bootcamp is the permanent replacement.

**Joshua's plan to fix:** paste an explicit Lovable prompt that names `src/bootcamps/main-conclusion/` as the permanent canonical Main Conclusion bootcamp and instructs Lovable to (a) wire `/bootcamp/structure` to the new bootcamp, (b) delete `src/pages/Structure.tsx` + `src/components/structure/*`, (c) update `src/pages/Bootcamps.tsx` accordingly. Lovable does the integration; Claude Code stays out of route files.

**Claude Code's job for this track:** do NOT edit `src/App.tsx`, `src/pages/Bootcamps.tsx`, `src/pages/Structure.tsx`, `src/components/structure/*`, or any route file. Lovable owns the bridge. Claude Code's job is content work inside `src/bootcamps/main-conclusion/`.

What's safe to work on inside `src/bootcamps/main-conclusion/` while Lovable handles the bridge (additive only):
- Drill 3.1-3.4 Stages 2-4 content (engine already handles them; only Stage 1 authored)
- Drill 3.6 additional whimsical premise pairs (3 currently authored)
- Drill 3.8 Stages 4-6 (Cumulative recall, Full recollection, Final restate)
- Phase D 80-distractor batch (4 wrong × 20 questions) with trait_id + fingerprint_note + audit_voice — blocked on Joshua's M4 seeds (2 ground-truth distractor sets for Q11 Mosston rebuttal + Q20 grain-companies wildcard, into `docs/m4-seed-request.md`)
- 20 Coach's Notes (structure map + core move + per-answer audit)
- Trap Master deep-dive worst-case examples (3 per trait × 7 traits = 21 examples)
- Hard Question Mode (5 hardest questions surfaced from individual diagnostics)
- Mr. Tannisch orphan stimulus disposition (assess at Phase D start; include as 21st Q if covers underweighted trait, drop with reason if borderline)

What's blocked on Joshua:
- M1 voice walkthrough — walk Lessons 1.1-1.12 in dev server, lock voice
- M4 seeds — 2 ground-truth distractor sets for Q11 + Q20
- Gate 5 walkthrough — 7-item sign-off (location: probably `docs/gate-5-audit.md` or similar; Claude Code locates on session start)
- G1.4 (Causation Station + Abstraction reference URLs) — close as "URLs are routes inside this app: /bootcamp/causation-station and /bootcamp/abstraction"
- G3.UX-RESEARCH packet — close as "deferred to v1.0.5; surface refinements happen post-first-cohort feedback"

### Track 2: AI TA Assistant

**Status: built end-to-end. Not blocked. Two small remaining items.**

Per `ai-ta-handoff-brief.md` (dated 2026-04-23) at the repo root:

What exists and works:
- `/admin/library` (PDF/doc upload, text extraction, search, filter, edit, delete)
- `/admin/ta` (student selector, conversational chat, real-time subscriptions)
- Floating TA widget on all pages (admin-only, permission-gated, shares state with full page)
- `ta-chat` Edge Function (loads student context, calls Gemini 2.5 Pro via Lovable AI gateway, parses `<<<DRAFT>>>` blocks, persists both turns)
- DraftCard (approve creates `ta_assignments` + sends inbox notification via `taNotify.ts`; reject; revise)
- Classroom page merges homework + TA assignments
- `/classroom/ta/:id` (scrollable HTML render, auto-marks viewed, "Mark complete" button, PDF download via html2canvas + jsPDF)
- DB tables: `teaching_assets`, `ta_interactions`, `ta_assignments`. RPC: `search_teaching_assets`. Feature flag: `has_ta_access` on profiles.

What's left:
1. **Gmail email notification on assignment approve.** Inbox notification works; email does not. Need Edge Function `send-assignment-email` (or extend approve flow). Send from `contact@aspiringattorneys.com`. Pick: Resend / Postmark / SendGrid / Gmail API / Supabase Database Webhook on `ta_assignments` INSERT.
2. **Live testing + system prompt tuning** in `ta-chat/index.ts` lines 61-71. Iterative.
3. **Library search quality verification** (RPC `search_teaching_assets`). Confirm full-text vs ILIKE; test with 20+ asset library.
4. **Dead column cleanup (low priority):** `ta_assignments.pdf_url` never populated; PDFs are client-side. Remove or populate later.

Architectural rules for AI TA work: granular feature flags not roles, DB mutations never swallow errors, RLS on all new tables, zero layout shift, no dead buttons, admin displays as "Joshua" via `displayName.ts`. See `ai-ta-handoff-brief.md` for the full "do not change" list.

### Track 3: Repo audit follow-through (22 fixes)

**Status: 22 fixes catalogued. Status of each unverified.**

See `.audit/07-fixes-delta.md` for the full list. Categories:
- Drill surface persistence (8 fixes): F2.13, F2.14 (BR fields), F2.15 (full-section attempts), F2.16 (natural-drill mode), F2.17 (TDZ on saveBRResults), F2.18 (adaptive engine wiring), F2.19 (UserSettings localStorage-only), F2.20 (highlights/eliminations session-only)
- Messaging (2 fixes): F3.18 (realtime attachment race), F3.19 (ThreadList empty for PDF-only)
- Admin/Content (4 fixes): F4.14 (analytics scoping), F4.15 (Profile wrong key), F4.16 (Classroom launcher bounces), F4.17 (FoyerSidebar no permission gating)
- Identity (1 fix): F1.10 (class_id resolution inconsistent)
- Infra/Design (7 fixes): F5.19 (PWA CacheFirst staleness), F5.20 (`(supabase as any)` at 18 sites), F5.21 (RecentPerformanceWidget hardcodes colors), F5.22 (BackgroundPaths 72 animated paths), F5.23 (IL redefined 4x), F5.24 (OrbitalLoader orphaned), F5.25 (`hover:` variants lack hover guard)

Track 3 work is done piecemeal between bootcamp + AI TA work. Pick up F-IDs as time allows. None is blocking.

---

## Live on lsatprep.study (verify on session start)

- All historical confirmed-working features from prior handoffs (Homework Phase A, load-once guard, Drill BR fields, etc.) — assumed still live; verify via spot-check if needed
- New Main Conclusion bootcamp at `/bootcamp/structure` — **NOT YET LIVE**, awaiting Lovable bridge
- AI TA at `/admin/ta` and `/admin/library` — should be live; verify
- Causation Station, Abstraction, old Structure bootcamp — live

---

## Recent Lovable autopilot commits to inspect

Lovable shipped commits `9b35eb8`, `163be27`, `6954151`, `be79274` with message "Fixed structure bootcamp route" before this handoff was written. They removed the `MainConclusionBootcamp` import from `App.tsx` and pointed all bootcamp routes back at the old Structure. Per Rule 14, treat as JOSHUA OVERRIDE (Lovable autopilot) and confirm in your first reply that you've read these commits.

---

## Critical Hazards (carried forward, still applicable)

- **`(supabase as any)` casts** at 18 sites (F5.20). Fix in one focused pass when DB types regenerate.
- **Pre-existing lint debt** — 124 errors + 35 warnings. Don't add to it. Heaviest offenders unchanged.
- **TypeScript strict flags OFF** (`strictNullChecks: false`, `noImplicitAny: false`). Do not flip without approval.
- **Lovable quirks** — `lovable-tagger` Vite plugin, `vite-plugin-pwa` start URL `/foyer`, Lovable preview SW guard in `src/main.tsx`. Don't remove.
- **No CI** — Tier C discipline manual: `npx tsc --noEmit -p tsconfig.app.json` + `npm run lint` + `npm run build` before every push.
- **`bun.lock` / `bun.lockb` still present** — npm is canonical. Ignore but don't commit against them.

---

## Active Rules (apply every session)

- **Rule 14 — User modifications are authoritative and must be emphasized.** Whenever Joshua edits any file OR overrides a decision in chat OR Lovable's `gpt-engineer-app[bot]` ships commits, you MUST: (a) detect the change, (b) acknowledge with a "JOSHUA OVERRIDE" or "JOSHUA EDIT" or "LOVABLE AUTOPILOT" callout, (c) log it in this handoff under a new section, (d) treat the user / Lovable version as authoritative, (e) surface conflicts before proceeding. Never silently absorb.
- **Rule 15 — Proactive next-move recommendations.** After every unit of work, surface a `NEXT-MOVE RECOMMENDATIONS` section with two concrete numbered suggestions, additive to the approved plan. Approved log as new dated rows + execute; declined log as `parked`.
- All other CLAUDE.md product rules (no fake data, no dead buttons, identity = name not username, instructor = "Joshua", email sign-in, Foyer is primary nav).

---

## User Preferences (Joshua)

- Terse, direct, no em dashes
- Plan mode before execution on non-trivial tasks
- Commits direct to main, no branches (PRs are exception, not default)
- Tier C (tsc + eslint + build, no regressions) for client UI; Tier B for DB changes
- Proactive suggestions welcome
- Push back when wrong — do not capitulate to incorrect claims
- Building a commercial product; treat every change as a production ship
- No fake data, no dead buttons, no placeholder actions that don't work
- When speculative fix is low-risk and targeted, apply directly without instrumentation first

---

## Recommended First Task for Next Session

Read this handoff in full + run `git log --oneline -10` and `git status`. Confirm the current SHA, working tree state, and which bootcamp `/bootcamp/structure` currently routes to. Report back in <250 words.

Then wait for Joshua's direction. The likely next move is one of:
1. Author additive content for Track 1 (Drill 3.1-3.4 Stage 2-4, Drill 3.6 pairs, Drill 3.8 Stages 4-6) inside `src/bootcamps/main-conclusion/` while Lovable handles the bridge separately
2. Pick up Track 2 AI TA: build `send-assignment-email` Edge Function
3. Pick up Track 3 audit fixes (F2.x persistence cluster is highest leverage)

Do not start any work after the report-back. Wait for Joshua.

---

## Files Next CC Must Read on Startup

1. `CLAUDE.md` — project rules, Lovable specifics, conventions
2. `.audit/session-handoff-latest.md` — this file
3. `.audit/07-fixes-delta.md` — 22-fix audit list
4. `.audit/master-reference.md` — consolidated 7-section repo reference
5. `ai-ta-handoff-brief.md` (repo root) — AI TA Track 2 specifics
6. `src/App.tsx` — route registration ground truth
7. `src/bootcamps/main-conclusion/` — confirm 100+ files exist; spot-check `App.tsx`, `modules/ModuleIndex.tsx`, `data/lessons.generated.json`, `data/simulator.generated.json`, `data/calibration.generated.json`, `scripts/import-content.ts` (if at root)
8. `src/pages/Structure.tsx` + `src/components/structure/` — confirm old bootcamp still routed (these are slated for removal by Lovable, do not edit)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project snapshot

LSAT U is a premium ed-tech web app: React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui, Supabase backend with Edge Functions, hosted on Lovable. The Lovable-connected project is the source of truth; GitHub (`vnjkoxpl-42905/lsatu-684d89db`) is the mirror. Treat the connected project as canonical unless told otherwise.

## Second brain (product memory)

Product context, design decisions, pedagogy, and status do NOT live in this repo. They live in the Obsidian vault at `~/ai-os/`. This repo is the code; the vault is the decision layer. Read the vault when starting a session, needing product/design/pedagogy context, or making a decision that touches roadmap or UX. Skip it for trivial code edits.

Path sanity check first:

- Vault root (the `~/ai-os` directory IS the Obsidian vault): `/Users/joshuaf/ai-os`
- Code repo root (this project): `/Users/joshuaf/ai-os/projects/lsatu`

If any older note says `~/Documents/Obsidian Vault/...` or `~/Documents/Claude/02_PROJECTS/LSATU`, treat that as stale — the vault was consolidated into `~/ai-os`. Use the absolute paths above.

Protocol is canonical in `~/ai-os/CLAUDE.md` (Session Start / Session End), run via two skills:

- **`/pickup`** (start / "brief me"): reads `wiki/tasks.md` → `wiki/hot.md` → `wiki/dashboard.md` → `wiki/index.md` → latest `wiki/log.md` entry, then gives a 6-8 line briefing (Now / Next / open threads / suggested next) and waits.
- **`/wrapup`** (handoff / "done for today"): proposes which tasks are done (confirm first), strikes them through in `wiki/tasks.md`, refreshes `wiki/hot.md`, appends a dated `wiki/log.md` entry, updates the task anchor, gives a 4-line confirmation.

`wiki/tasks.md` is the living ledger of Now / Next / Done; finished work is struck through with a date so a new session never re-runs it.

Where LSATU truth lives in the vault (paths relative to `~/ai-os`):

The vault was rebuilt on 2026-07-16. **Live** pages:

- Teaching voice (route ALL student-facing copy through it): `wiki/teaching-voice.md`
- The tutoring business (offers, channels, priorities): `wiki/entities/aspiring-attorneys.md`
- Hubs: `wiki/tasks.md`, `wiki/hot.md`, `wiki/log.md`, `wiki/dashboard.md`, `wiki/index.md`
- A student's whole record (transcripts, notes, homework): `students/<name>/` — see `students/README.md` for the primary/mirror rule
- LSAT teaching knowledge: `corpus/index.md` (fills by ingest)

**Archived** — the pre-rebuild product knowledge is read-only reference at `archive/wiki-pre-rebuild-2026-07-16/domains/lsat-u/`; it is not maintained and may be stale. Re-ingest a page through `raw/` if it becomes load-bearing again rather than editing it in place:

- Product context: `…/synthesis/intro-to-lr-product.md` (flagship Main Conclusion bootcamp)
- Design system (colors, type, role tokens): `…/synthesis/intro-to-lr-design.md`
- Code/source map: `…/synthesis/lsatu-source-map.md` (regenerable from this codebase)
- Quality bar all bootcamps finish to: `…/synthesis/bootcamp-quality-bar.md`
- Concepts, entities, domain index: `…/concepts/`, `…/entities/`, `…/index.md`

Rules: `raw/` is immutable input, never edit it. Read knowledge from `wiki/`, not `raw/`. Use the `obsidian` CLI (`search`, `backlinks`, `read`) for graph traversal (needs the Obsidian app open); flat file reads work without it. When saving deliverables to the vault, use `[[wiki-link]]` syntax and `UPPERCASE-HYPHENATED.md` naming.

## Commands

Scripts (from `package.json`):

- `npm run dev` — Vite dev server on port 8080
- `npm run build` — production build
- `npm run build:dev` — build with development mode flags
- `npm run preview` — serve the built bundle
- `npm run lint` — ESLint flat config (`eslint.config.js`)
- `npm run test` — Vitest single run (runner wired, no specs exist yet)
- `npm run test:watch` — Vitest watch mode
- Single test file: `npx vitest run path/to/file.test.ts`

Package manager: **npm**. `package-lock.json` is canonical. A stray `bun.lock` / `bun.lockb` exists in the repo — ignore it, do not switch tooling.

- `npm run typecheck` — `tsc --noEmit -p tsconfig.app.json`. Not optional before a push: `vite build` uses esbuild, which strips types without checking them, so a type error ships and auto-deploys. `.claude/safe-push.sh` gates on this.
- `npm run test:e2e` / `npm run playwright` — Playwright e2e (`e2e/smoke.spec.ts`).

No Prettier. Formatting is ESLint-only.

## Architecture (big picture)

- **Routing** — React Router v6. Routes are registered in `src/App.tsx`, pages live in `src/pages/`. `/foyer` is the landing surface. Feature-gated pages are wrapped by `ProtectedRoute`.
- **Auth + permissions** — Supabase Auth session plus Lovable Cloud Auth JWT fallback (`@lovable.dev/cloud-auth-js`). Per-feature access flags (`has_practice_access`, `has_drill_access`, `has_chat_access`, `is_admin`, ...) are resolved in `src/hooks/useUserPermissions.ts`. Session death is detected via JWT/401.
- **Supabase integration** — client auto-generated at `src/integrations/supabase/client.ts` (Supabase JS v2). DB types are auto-generated — do not hand-edit. Edge Functions (Deno) in `supabase/functions/`: `admin-manage-users`, `analyze-stem-response`, `generate-micro-drill`, `motivation-engine`, `parse-drill-request`, `tutor-chat`, `voice-coach-respond`. SQL migrations in `supabase/migrations/`.
- **State** — React Context for cross-cutting concerns (`AuthContext`, `UserSettingsContext`, `QuestionBankContext`, `ThemeContext`, `TimerContext`). TanStack Query v5 for server state.
- **Primary navigation — Foyer** — `src/pages/AcademyFoyer.tsx` composes `src/components/foyer/FoyerSidebar.tsx` (state blocks + workspace nav) with `src/components/foyer/FoyerHeroRing.tsx` (3 nodes: Smart Drill, Resume, Ask Joshua). This is the primary nav for the product.
- **Messaging / Inbox** — real messaging feature, not cosmetic. Lives in `src/components/inbox/` (`FloatingMessenger`, `ConversationView`, `ThreadList`) plus `src/hooks/useInbox.ts`. One ongoing 1:1 thread per student with the admin (Joshua). Supports PDF attachments. Gated by `has_chat_access`.
- **Practice surfaces** — Drill and Wrong Answer Journal (WAJ) are real product surfaces, not launchers. Core logic in `src/lib/`: `adaptiveEngine`, `drillIntelligence`, `achievementEngine`, `gamification`, `questionLoader`, `streakSystem`, `wajService`.
- **Admin** — `AdminDashboard` + `admin-manage-users` edge function. Must be desktop AND mobile responsive. Needs granular per-feature toggle control.
- **UI primitives** — shadcn/ui (Radix + `class-variance-authority`) in `src/components/ui/`. Icons from `lucide-react` and `@tabler/icons-react`. Framer Motion for animation. Spline for 3D.
- **Styling** — Tailwind 3.4 over HSL custom properties in `src/index.css`, surfaced as tokens in `tailwind.config.ts`. `DESIGN.md` is the visual authority; `.impeccable/design.json` is its machine-readable sidecar. Prefer tokens over ad-hoc hex values, and never add a token name whose CSS variable is not defined - three such names (`accent-bronze`, `accent-warm`, `glow-bronze`) shipped broken for five months and silently removed the focus ring from every shared Button.

## Conventions

- **Git workflow:** Always commit and push directly to `main`. Never create feature branches or pull requests unless explicitly asked. After completing any code change: stage relevant files, commit with a descriptive message, and push to `main`.
- **Push via `.claude/safe-push.sh`, not raw `git push`.** Lovable auto-commits to `main` mid-session; a raw push can get rejected or race a concurrent commit. The script fetches, merges origin/main if it diverged (never rebases, never force-pushes), then pushes.
- **Never roll `main` back.** Do not use Lovable's "Revert to commit", "revert and resend", or history restore, and never reset or force-push `main`. On 2026-09-27 an accidental "revert and resend" (b998596) silently undid three merged PRs across 121 question-bank files, and students saw the wrong questions again. To undo your own work, `git revert <your SHA>` only. If a Lovable dialog offers a revert, dismiss it; if one fires, stop and tell Joshua before repairing anything.
- Path alias `@/` → `./src/` (set in `vite.config.ts` and `tsconfig.json`).
- TypeScript strict mode is **off** (`strictNullChecks: false`, `noImplicitAny: false`, `noUnusedLocals: false`). Do not flip these without explicit approval — it would cascade into a very large diff.
- Lovable-specific plumbing that must not be removed:
  - `lovable-tagger` Vite plugin injects `data-lov-id` in dev
  - `vite-plugin-pwa` configured with start URL `/foyer`
  - Lovable preview Service Worker guard in `src/main.tsx`
- Identity rules: email sign-in, profile identity uses **name** (not username), instructor is displayed as **"Joshua"**, students display their real profile names.

## Cross-tool instruction hygiene

`CLAUDE.md` is the fuller project source of truth. `AGENTS.md` is the Codex-facing adapter and should stay aligned without becoming a second full copy.

- When updating project instructions, update both files as needed: put durable detail here, and keep `AGENTS.md` as a concise adapter.
- When creating a Claude skill that Codex should use, also copy it to `.agents/skills/` with its `SKILL.md` and supporting files.
- When creating a Claude agent that Codex should spawn, also create a matching `.codex/agents/<name>.toml` and place the converted instructions in `developer_instructions`.
- When adding shared knowledge, put it in `docs/`, `references/`, or `templates/` so every tool can read the same source.

## Publish after every merge to main

Standing rule (Joshua, 2026-10-17), for Claude, Codex and Gemini alike. When an authorized change lands on `main`, the same agent publishes the frontend with the free Lovable `deploy_project` (project `53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76`) without asking, then proves it live:

1. Before deploying, call `get_project` and check `latest_commit_sha` equals the merged HEAD. If it does not, wait and re-check; a deploy fired early ships the previous commit with no error.
2. After deploying, fetch `https://lsatprep.study/`, confirm the `index-*` bundle hash changed, and confirm a string only your commit adds is present. Lovable's Publish button will then show nothing to publish; that is expected.
3. Report the merge commit, the old and new bundle hash, and what you checked live.

This rule does not authorize pushing or merging to `main` (use a branch and PR, merge only when Joshua says so). It does not cover edge functions or anything that spends Lovable credits; those still need his confirmation right before they run.

## Verification (must not skip)

Any change to `src/components/` or `src/pages/` is not "done" until it has been viewed running in the app (dev server + browser tool, e.g. Playwright or chrome devtools MCP), with a screenshot or DOM check as evidence. Do not report a UI change complete on the strength of the diff alone. This has been the single biggest recurring failure across past sessions (repeated "it's not working" / "i dont see it" corrections) — treat it as a hard gate, not a suggestion.

**Responsive fixes carry a wider gate: verify across the full emulate matrix BEFORE pushing, not after Joshua reports it.** That means narrow, mid, and wide viewports plus the sidecar-docked case, every time. A responsive defect that gets pushed as "fixed" and does not hold costs a second full session — this has already happened (a pushed Home-page fix that did not survive, then 13 screenshots and 8 emulate cycles to actually close it). One matrix pass before the push is cheaper than either.

## Product rules (must not regress)

- Foyer (`FoyerSidebar` + `FoyerHeroRing`) is the primary navigation. The Foyer additionally hosts a `GooeyDock` quick-launch row well below the orbital ring; this dock is allowed only on `/foyer`. Do not add docks elsewhere.
- Inbox is real messaging with back-and-forth threads and PDF attachments, scoped 1:1 per student with admin.
- Admin is fully responsive on desktop and mobile.
- Do not expose actions users cannot actually perform — no fake analytics, no dead buttons, no misleading placeholders. Prefer truthful fallbacks over fake data.
- Onboarding asks for name, not username. Sign-in uses email.

## Known gaps (do not invent answers)

- Vitest specs exist (80 `src/**/*.test.ts(x)` files as of 2026-07-16); run them with `npm run test`. Playwright is wired with one e2e spec (`e2e/smoke.spec.ts`), run via `npm run test:e2e`.
- No Prettier config and no CI workflows. Nothing runs `typecheck`, `lint`, or the tests automatically — `.claude/safe-push.sh` is the only gate, and only for typecheck.
- `README.md` is a stub.
- `.claude/settings.json` is set up with a permission allowlist for safe dev work (npm scripts, git reads, MCP GitHub reads) and a denylist for destructive ops. No custom `.claude/agents/`. A `SessionStart` auto-pull hook is wired in `.claude/settings.local.json` (runs `.claude/auto-pull-hook.sh`); Codex mirrors it in `.codex/hooks.json`.

## Skill / agent / command vault

The full skill/agent/command vault lives in the brain root at `~/ai-os/skills/`, `~/ai-os/agents/`, `~/ai-os/commands/` (split into `claude/` and `codex/` subtrees, indexed by `~/ai-os/skills/INDEX.md`). It is inert storage — nothing here auto-loads. To use a vault skill in this project, symlink it into `.claude/skills/` (Codex: `.agents/skills/`). When you create a new skill/agent/command, save it to BOTH this project's `.claude/<kind>/` and the vault, so the vault stays the complete catalog.

## Agent skills

### Issue tracker

GitHub Issues on `vnjkoxpl-42905/lsatu-684d89db`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, unchanged: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` points at eight per-context glossaries; ADRs are all at the root. See `docs/agents/domain.md`.

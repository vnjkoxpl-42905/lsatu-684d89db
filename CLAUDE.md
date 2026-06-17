# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project snapshot

LSAT U is a premium ed-tech web app: React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui, Supabase backend with Edge Functions, hosted on Lovable. The Lovable-connected project is the source of truth; GitHub (`vnjkoxpl-42905/lsatu-684d89db`) is the mirror. Treat the connected project as canonical unless told otherwise.

## Second brain (product memory)

Product context, design decisions, pedagogy, and status do NOT live in this repo. They live in the Obsidian vault at `~/Documents/Obsidian Vault/`. This repo is the code; the vault is the decision layer. Read the vault when starting a session, needing product/design/pedagogy context, or making a decision that touches roadmap or UX. Skip it for trivial code edits.

Protocol is canonical in `~/Documents/Obsidian Vault/CLAUDE.md` (Session Start / Session End), run via two skills:

- **`/pickup`** (start / "brief me"): reads `wiki/tasks.md` → `wiki/hot.md` → `wiki/dashboard.md` → `wiki/index.md` → latest `wiki/log.md` entry, then gives a 6-8 line briefing (Now / Next / open threads / suggested next) and waits.
- **`/wrapup`** (handoff / "done for today"): proposes which tasks are done (confirm first), strikes them through in `wiki/tasks.md`, refreshes `wiki/hot.md`, appends a dated `wiki/log.md` entry, updates the task anchor, gives a 4-line confirmation.

`wiki/tasks.md` is the living ledger of Now / Next / Done; finished work is struck through with a date so a new session never re-runs it.

Where LSATU truth lives in the vault:

- Product context: `wiki/synthesis/intro-to-lr-product.md` (flagship Main Conclusion bootcamp)
- Design system (colors, type, role tokens): `wiki/synthesis/intro-to-lr-design.md`
- Code/source map: `wiki/synthesis/lsatu-source-map.md`
- Quality bar all bootcamps finish to: `wiki/synthesis/bootcamp-quality-bar.md`
- Teaching voice (route ALL student-facing copy through it): `wiki/concepts/teaching-voice.md`
- Concepts: `wiki/concepts/drill.md`, `wiki/concepts/mainhub.md`
- Entities: `wiki/entities/intro-to-lr-bootcamp.md`, `lsat-u.md`, `supabase.md`, `lovable.md`

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

No typecheck script exists. When a typecheck is needed: `npx tsc --noEmit -p tsconfig.app.json`.

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
- **Styling** — Tailwind 3.4 with custom design tokens (bronze accent, glass blur, glow effects) in `tailwind.config.ts`. Prefer tokens over ad-hoc hex values.

## Conventions

- **Git workflow:** Always commit and push directly to `main`. Never create feature branches or pull requests unless explicitly asked. After completing any code change: stage relevant files, commit with a descriptive message, and push to `main`.
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

## Product rules (must not regress)

- Foyer (`FoyerSidebar` + `FoyerHeroRing`) is the primary navigation. The Foyer additionally hosts a `GooeyDock` quick-launch row well below the orbital ring; this dock is allowed only on `/foyer`. Do not add docks elsewhere.
- Inbox is real messaging with back-and-forth threads and PDF attachments, scoped 1:1 per student with admin.
- Admin is fully responsive on desktop and mobile.
- Do not expose actions users cannot actually perform — no fake analytics, no dead buttons, no misleading placeholders. Prefer truthful fallbacks over fake data.
- Onboarding asks for name, not username. Sign-in uses email.

## Known gaps (do not invent answers)

- Vitest specs exist (37 `src/**/*.test.ts(x)` files as of 2026-06-16); run them with `npm run test`. No Playwright e2e specs exist yet, though `@playwright/test` and `playwright.config.ts` (Lovable wrapper) are installed and there is no `playwright` npm script.
- No typecheck script (use `npx tsc --noEmit -p tsconfig.app.json`), no Prettier config, no CI workflows.
- `README.md` is a stub.
- `.claude/settings.json` is set up with a permission allowlist for safe dev work (npm scripts, git reads, MCP GitHub reads) and a denylist for destructive ops. No custom `.claude/agents/`. A `SessionStart` auto-pull hook is wired in `.claude/settings.local.json` (runs `.claude/auto-pull-hook.sh`); Codex mirrors it in `.codex/hooks.json`.

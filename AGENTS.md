# AGENTS.md

This file is the Codex-facing adapter for this repository. It summarizes the Claude-oriented project guidance from `CLAUDE.md` in a smaller format that is fast for Codex to scan. `CLAUDE.md` remains the fuller source of project knowledge.

## Project Map

- `src/App.tsx`: route registration and top-level app wiring.
- `src/pages/`: route-level screens, including the Foyer and admin/teacher surfaces.
- `src/components/`: shared UI, including `foyer/`, `inbox/`, and shadcn/ui primitives.
- `src/hooks/`: auth, permissions, and shared data hooks.
- `src/lib/`: drill, WAJ, gamification, and other product logic.
- `src/integrations/supabase/`: generated Supabase client and types. Do not hand-edit generated types.
- `supabase/functions/`: Edge Functions.
- `supabase/migrations/`: database schema migrations.

## Stack And Commands

- Stack: React 18, Vite 5, TypeScript, Tailwind, shadcn/ui, Supabase, TanStack Query.
- Package manager: `npm`. `package-lock.json` is canonical. Ignore stray Bun lockfiles.
- Dev server: `npm run dev` on port `8080`.
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm run test`
- Watch tests: `npm run test:watch`
- Typecheck when needed: `npx tsc --noEmit -p tsconfig.app.json`

## Working Rules

- Keep changes small and aligned with existing patterns.
- Use TypeScript React function components and the `@/` path alias.
- Preserve Lovable-specific plumbing, including the `lovable-tagger` Vite plugin, the PWA setup, and the service-worker guard in `src/main.tsx`.
- Do not change app behavior just to satisfy tooling setup.
- Do not hardcode secrets or service-role credentials.
- Treat Supabase-generated files as generated artifacts, not hand-edited source.
- TypeScript strictness is intentionally loose. Do not tighten it without explicit approval.
- Keep this adapter aligned with `CLAUDE.md` without duplicating the full project guide. Put durable detail in `CLAUDE.md`; keep shared reference material in `docs/`, `references/`, or `templates/`.

## Product Constraints

- The Foyer is the primary navigation surface. The `GooeyDock` quick-launch row belongs only on `/foyer`.
- Inbox is a real 1:1 student-admin messaging system with PDF attachments.
- Admin surfaces must stay responsive on desktop and mobile.
- Prefer truthful fallbacks over fake buttons, fake analytics, or placeholder behavior.
- Onboarding asks for name, not username. Sign-in uses email. The instructor display name is `Joshua`.

## Smart Drill Note

On `/drill`, adaptive Smart Drill can show a `currentQuestion` that is not the same as `session.questionQueue[session.currentIndex]`. Any per-question UI state must key off `currentQuestion.qid` unless the code path is explicitly limited to queued drills.

## Workflow Expectations

- Run `npm run build` before wrapping up significant code or documentation work.
- If tests are relevant to the change, run them too.
- After completing a change, stage the intended files, commit with a concise message, and push to `origin main` unless the user says otherwise.
- Existing Codex repo hooks live in `.codex/hooks.json`; preserve them unless the task explicitly requires a hook change.

## Session Protocol (second brain)

Product context, status, and decisions live in the Obsidian vault at `~/Documents/Obsidian Vault/`, not this repo. Two repo-local skills in `.agents/skills/` run the session ritual; the canonical protocol is in the vault `CLAUDE.md`.

- `pickup` — start of session. Read `wiki/tasks.md` (the Now / Next / Done ledger) first, then `wiki/hot.md`, `wiki/dashboard.md`, skim `wiki/index.md`, read the latest `wiki/log.md` entry. Emit a 6-8 line briefing (where we left off, Now, Next, open threads, hot, suggested next) and wait. Do not deep-read other pages until pointed at a task.
- `wrapup` — end of session. Propose which `## Now` tasks finished and confirm before writing; a wrong "Done" is the failure to avoid. Then strike finished items through in `wiki/tasks.md` with a date, refresh `wiki/hot.md`, append a dated `wiki/log.md` entry (newest first, distinct label for same-day sessions), update the task anchor.

`wiki/tasks.md` is the single source of truth for what is open vs done. Finished work is struck through so a new session never re-runs it. `raw/` in the vault is immutable.

## Codex Adapter Layout

- `.codex/config.toml`: minimal shared Codex project config. Keep secrets and machine-specific overrides out of this file.
- `.codex/agents/`: Codex agent definitions converted from `.claude/agents/*.md` when Claude agents exist. Use `.toml` files with converted instructions in `developer_instructions`.
- `.agents/skills/`: repository-local Codex skills copied from `.claude/skills/` when Claude skills exist and Codex should use them. Keep each `SKILL.md` with its supporting files.
- `.codex/hooks.json`: existing repository hooks. Preserve unless the task explicitly concerns hooks.

This checkout currently has Claude settings and hooks under `.claude/`, but no `.claude/skills/` or `.claude/agents/` directory to convert.

## Known Gaps

- Vitest specs exist (37 `src/**/*.test.ts(x)` files as of 2026-06-16); run with `npm run test`. No Playwright e2e specs yet, though `@playwright/test` and `playwright.config.ts` are installed with no `playwright` npm script.
- No dedicated typecheck script (`npx tsc --noEmit -p tsconfig.app.json`) or Prettier config exists.
- `README.md` is still minimal.

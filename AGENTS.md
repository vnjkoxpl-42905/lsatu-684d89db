# AGENTS.md
<!-- LOVABLE:BEGIN -->
- RC builder correctness and observable adaptive selection use independently aggregated released history; protected exams require persisted owner-scoped parent completion, so hidden newer takes cannot erase earlier released misses.
<!-- LOVABLE:END -->
This file is the Codex-facing adapter for this repository. It summarizes the Claude-oriented project guidance from `CLAUDE.md` in a smaller format that is fast for Codex to scan. `CLAUDE.md` remains the fuller source of project knowledge.

## Fast Locator

- Vault root (the `~/ai-os` directory IS the Obsidian vault): `/Users/joshuaf/ai-os`
- Code repo root (this project): `/Users/joshuaf/ai-os/projects/lsatu`
- Live vault knowledge: `/Users/joshuaf/ai-os/wiki/` (hubs, voice, business), `/Users/joshuaf/ai-os/students/`, `/Users/joshuaf/ai-os/corpus/`
- Pre-2026-07-16 LSATU product knowledge (archived, read-only): `/Users/joshuaf/ai-os/archive/wiki-pre-rebuild-2026-07-16/domains/lsat-u/`

If an older note says `~/Documents/Obsidian Vault/...` or `~/Documents/Claude/02_PROJECTS/LSATU`, treat it as stale — the vault was consolidated into `~/ai-os`. Use the absolute paths above.

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
- Typecheck: `npm run typecheck`. Required before a push — `vite build` strips types without checking them, so a type error would ship. `.claude/safe-push.sh` gates on it.
- E2E: `npm run test:e2e` (Playwright, `e2e/smoke.spec.ts`).

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

## Verification (must not skip)

- Any change to `src/components/` or `src/pages/` is not "done" until it has been viewed running in the app (dev server + a browser tool), with a screenshot or DOM check as evidence. Never report a UI change complete on the strength of the diff alone. This is the single biggest recurring failure across past sessions — a hard gate, not a suggestion.
- **Responsive fixes carry a wider gate: verify across the full emulate matrix BEFORE pushing, not after Joshua reports it.** Narrow, mid, and wide viewports plus the sidecar-docked case, every time. A pushed "fix" that does not hold costs a second full session; this has already happened once.

## Workflow Expectations

- Run `npm run build` before wrapping up significant code or documentation work.
- If tests are relevant to the change, run them too.
- After completing a change, stage the intended files, commit with a concise message, and push to `origin main` unless the user says otherwise.
- **Push via `.claude/safe-push.sh`, not raw `git push`.** Lovable auto-commits to `main` mid-session, so a raw push can be rejected or race a concurrent commit. The script fetches, merges `origin/main` if it diverged (never rebases, never force-pushes), then pushes. It also gates on `npm run typecheck`.
- **Never roll `main` back.** Do not use Lovable's "Revert to commit", "revert and resend", or history restore, and never reset or force-push `main`. On 2026-09-27 an accidental "revert and resend" (b998596) silently undid three merged PRs across 121 question-bank files, and students saw the wrong questions again. To undo your own work, `git revert <your SHA>` only. If a Lovable dialog offers a revert, dismiss it; if one fires, stop and tell Joshua before repairing anything.
- Existing Codex repo hooks live in `.codex/hooks.json`; preserve them unless the task explicitly requires a hook change.

## Session Protocol (second brain)

Product context, status, and decisions live in the Obsidian vault at `~/ai-os/`, not this repo. Two repo-local skills in `.agents/skills/` run the session ritual; the canonical protocol is in the vault `CLAUDE.md`.

The vault was rebuilt 2026-07-16 (paths relative to `~/ai-os`). Live: teaching voice `wiki/teaching-voice.md` (route ALL student-facing copy through it), the business `wiki/entities/aspiring-attorneys.md`, a student's record `students/<name>/` (see `students/README.md`), teaching knowledge `corpus/index.md`, and the `wiki/{tasks,hot,dashboard,index,log}.md` hubs named below. Archived read-only reference (pre-rebuild product knowledge, may be stale): `archive/wiki-pre-rebuild-2026-07-16/domains/lsat-u/` — product context `…/synthesis/intro-to-lr-product.md`, design system `…/synthesis/intro-to-lr-design.md`, quality bar `…/synthesis/bootcamp-quality-bar.md`, domain index `…/index.md`.

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

- Vitest specs exist (80 `src/**/*.test.ts(x)` files as of 2026-07-16); run with `npm run test`. Playwright is wired with one e2e spec (`e2e/smoke.spec.ts`), run via `npm run test:e2e`.
- No Prettier config and no CI workflows.
- `README.md` is still minimal.

## Agent skills

### Issue tracker

GitHub Issues on `vnjkoxpl-42905/lsatu-684d89db`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, unchanged: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` points at eight per-context glossaries; ADRs are all at the root. See `docs/agents/domain.md`.

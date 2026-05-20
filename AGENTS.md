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

## Known Gaps

- No real Vitest specs exist yet.
- No dedicated typecheck script or Prettier config exists.
- `README.md` is still minimal.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project snapshot

LSAT U is a premium ed-tech web app: React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui, Supabase backend with Edge Functions, hosted on Lovable. The Lovable-connected project is the source of truth; GitHub (`vnjkoxpl-42905/lsatu-684d89db`) is the mirror. Treat the connected project as canonical unless told otherwise.

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

- **Routing** — React Router v6. Routes are registered in `src/App.tsx`, pages live in `src/pages/`. `/foyer` is the landing orbital hub. Feature-gated pages are wrapped by `ProtectedRoute`.
- **Auth + permissions** — Supabase Auth session plus Lovable Cloud Auth JWT fallback (`@lovable.dev/cloud-auth-js`). Per-feature access flags (`has_practice_access`, `has_drill_access`, `has_chat_access`, `is_admin`, ...) are resolved in `src/hooks/useUserPermissions.ts`. Session death is detected via JWT/401.
- **Supabase integration** — client auto-generated at `src/integrations/supabase/client.ts` (Supabase JS v2). DB types are auto-generated — do not hand-edit. Edge Functions (Deno) in `supabase/functions/`: `admin-manage-users`, `analyze-stem-response`, `generate-micro-drill`, `motivation-engine`, `parse-drill-request`, `tutor-chat`, `voice-coach-respond`. SQL migrations in `supabase/migrations/`.
- **State** — React Context for cross-cutting concerns (`AuthContext`, `UserSettingsContext`, `QuestionBankContext`, `ThemeContext`, `TimerContext`). TanStack Query v5 for server state.
- **Primary navigation — Foyer Orbital** — `src/components/foyer/OrbitalHub.tsx` is the core navigation surface. It is the primary nav for the product. Any dock or utility tray is secondary utility only and must not duplicate orbital modules.
- **Messaging / Inbox** — real messaging feature, not cosmetic. Lives in `src/components/inbox/` (`FloatingMessenger`, `ConversationView`, `ThreadList`) plus `src/hooks/useInbox.ts`. One ongoing 1:1 thread per student with the admin (Joshua). Supports PDF attachments. Gated by `has_chat_access`.
- **Practice surfaces** — Drill and Wrong Answer Journal (WAJ) are real product surfaces, not launchers. Core logic in `src/lib/`: `adaptiveEngine`, `drillIntelligence`, `achievementEngine`, `gamification`, `questionLoader`, `streakSystem`, `wajService`.
- **Admin** — `AdminDashboard` + `admin-manage-users` edge function. Must be desktop AND mobile responsive. Needs granular per-feature toggle control.
- **UI primitives** — shadcn/ui (Radix + `class-variance-authority`) in `src/components/ui/`. Icons from `lucide-react` and `@tabler/icons-react`. Framer Motion for animation. Spline for 3D.
- **Styling** — Tailwind 3.4 with custom design tokens (bronze accent, glass blur, glow effects) in `tailwind.config.ts`. Prefer tokens over ad-hoc hex values.

## Conventions

- Path alias `@/` → `./src/` (set in `vite.config.ts` and `tsconfig.json`).
- TypeScript strict mode is **off** (`strictNullChecks: false`, `noImplicitAny: false`, `noUnusedLocals: false`). Do not flip these without explicit approval — it would cascade into a very large diff.
- Lovable-specific plumbing that must not be removed:
  - `lovable-tagger` Vite plugin injects `data-lov-id` in dev
  - `vite-plugin-pwa` configured with start URL `/foyer`
  - Lovable preview Service Worker guard in `src/main.tsx`
- Identity rules: email sign-in, profile identity uses **name** (not username), instructor is displayed as **"Joshua"**, students display their real profile names.

## Product rules (must not regress)

- Foyer orbital is the primary navigation. Dock / utility tray is secondary utility only, never a duplicate of orbital modules.
- Inbox is real messaging with back-and-forth threads and PDF attachments, scoped 1:1 per student with admin.
- Admin is fully responsive on desktop and mobile.
- Do not expose actions users cannot actually perform — no fake analytics, no dead buttons, no misleading placeholders. Prefer truthful fallbacks over fake data.
- Onboarding asks for name, not username. Sign-in uses email.

## Known gaps (do not invent answers)

- No test specs yet — Vitest runner is wired but `src/**/*.test.ts` does not exist.
- No typecheck script, no Prettier config, no CI workflows.
- `README.md` is a stub.
- No `.claude/settings.json`, no custom `.claude/agents/`, no SessionStart hook.

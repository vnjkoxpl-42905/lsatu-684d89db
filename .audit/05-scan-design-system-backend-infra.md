# Scan 5 — Design System, Backend, Edge Functions, Build/Infra

**Scope.** `tailwind.config.ts`, `src/index.css`, `src/App.css`, `src/components/ui/*` (57 files), `src/components/ThemeToggle.tsx`, `src/contexts/ThemeContext.tsx`, all `supabase/functions/*` (8 functions), all `supabase/migrations/*` (36 migrations), `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `playwright.config.ts`, `vitest.config.ts`, `.env`, `.gitignore`, `components.json`, `.claude/settings.json`.

## Executive Summary

Closes out with one resolved playbook issue and a surprising net-positive assessment of the infrastructure layer. **Playbook Issue #2 — the `.dark` class bug — is now diagnosed precisely.** Tailwind is configured with `darkMode: ["class"]`, which binds `dark:` variants to `html.dark`. The CSS file defines the default (dark) palette at `:root`, `.light` class overrides to light, and `.dark` is aliased to mirror `.light`. `ThemeContext` only ever toggles `.light`, never `.dark`. Net effect: 50 `dark:` variants across the codebase never fire in production because `html.dark` is never set. If any library sets `html.dark`, the CSS flips to light palette AND `dark:` variants apply, producing visual chaos.

The design system itself is the strongest piece of the repo. HSL tokens everywhere, cohesive light/dark dual-palette, extended Tailwind config (bronze/warm accents, glass/glow shadows, spotlight/glow-pulse animations), purpose-built `.hl` class for highlights with `box-decoration-break: clone` enforcing the zero-layout-shift rule. The edge functions are consistently well-written: CORS headers correct, input validation thorough, 429/402 branch handling present, admin-only functions gated via a `verifyAdmin` helper.

Quality drops when client meets server. Qtype canonicalization is duplicated in `tutor-chat` and `questionLoader.ts`. The placeholder `generate-micro-drill` function is still a stub. The migration history has a regression: April 6 baseline reintroduces `USING (true)` policies after the October 22 tightening.

`.env` contains the Supabase anon key (correct — it is public). ESLint is thin. Vitest and Playwright are wired but have zero specs. **25 of 57 shadcn UI components are unused.**

## Deep Findings

### F5.1 — `.dark` class semantics inverted (Playbook Issue #2 resolved)
**Evidence.** Four pieces cooperating:

- `tailwind.config.ts:4`: `darkMode: ["class"]`. Tailwind `dark:` variants fire on `html.dark`.
- `src/index.css:8-75`: CSS variables at `:root` define dark palette (background 3.9%, foreground 98%). No class needed.
- `src/index.css:77-113`: `.light` class overrides to light palette.
- `src/index.css:115-146`: `.dark` class also overrides to light palette. Comment: "mirrors .light — reserved alias."
- `src/contexts/ThemeContext.tsx`: state is `'dark' | 'light'`. On 'light' adds `light` class; on 'dark' removes it. Never adds `dark` class.

**Combined behavior:**
- User default: no class → dark palette via `:root` → `dark:` variants don't fire. Dark-visual, Tailwind thinks light-mode.
- User toggles light: `html.light` → light palette → `dark:` variants don't fire. Correct.
- If anything adds `html.dark` (shadcn default, test harness, `next-themes` which is installed): `.dark` alias triggers → CSS produces light palette → `html.dark` present → Tailwind `dark:` variants apply. Visual chaos.

50 `dark:` variants in the codebase (`alert.tsx`, `background-paths.tsx`, `feature-section-with-bento-grid.tsx`, several bootcamp components, `StreakWidget.tsx`) are dead styling under current behavior.

**Severity: 6/10.** Latent; dangerous if `html.dark` ever gets set.
**Fix options:**
- **(A) Preferred — flip convention.** Put light values at `:root`, dark values in `.dark`, ThemeContext adds `.dark` class for dark mode. Remove the `.dark` alias block. Aligns with idiomatic Tailwind. Requires auditing the `.light` usage.
- (B) Drop `darkMode: ["class"]` from Tailwind config. The 50 `dark:` variants become explicit no-ops. Delete unused shadcn components containing them or rewrite.
- (C) Neutralize the `.dark` alias (delete the block). Does not fix the dead `dark:` variants.

### F5.2 — Design system tokens are production-quality
**Evidence.** `tailwind.config.ts` extends with custom semantic colors (`surface-elevated`, `text-primary/secondary/tertiary`, `accent-bronze`, `accent-warm`, `glow-bronze`), `glass` backdrop blur token, custom shadows (`shadow-glow`, `shadow-glow-sm`), custom animations (`glow-pulse`, `lift`, `spotlight`, `slide-up`, `fade-in`). `src/index.css` defines every color as HSL triplet. Light/dark palettes are complete and proportional. `body` sets `font-feature-settings: "rlig" 1, "calt" 1;` for ligatures. Responsive typography (`14px → 16px` at `≥640px`). Touch-friendly `font-size: 16px` on mobile inputs. `.hl` class enforces `box-decoration-break: clone` for zero-layout-shift highlighting.
**Severity: 0 (positive confirmation). This is the reference quality for the rest of the repo to aspire to.**

### F5.3 — 25 of 57 UI components unused
**Evidence.** `src/components/ui/` contains 57 files. Unused (no imports anywhere):
```
accordion, aspect-ratio, bento-grid, breadcrumb, calendar, carousel, chart,
collapsible, command, context-menu, drawer, feature-section-with-bento-grid,
form, hover-card, input-otp, menubar, navigation-menu, orbital-loader, pagination,
resizable, scroll-area, sidebar, slider, toggle-group, vapour-text-effect
```
44% of the folder. Mix of shadcn defaults never used (accordion, calendar, carousel, command, form, hover-card, pagination, scroll-area, sidebar, slider) and speculative aesthetic flourishes (vapour-text-effect 294 lines, feature-section-with-bento-grid 251, orbital-loader 91, bento-grid 78).
**Behavior.** Tree-shaking means no bundle impact. IDE noise, shadcn upgrade friction, dead-import signal.
**Severity: 4/10.**
**Fix.** Delete or move to `src/components/ui/_unused/`.

### F5.4 — Edge functions are the highest-quality tier in the repo
**Evidence.** 8 functions, consistent patterns: identical CORS headers, OPTIONS preflight handled, JSON error responses with appropriate status, explicit input validation with char-length bounds, 429/402 branches distinguished, shared `verifyAdmin(req)` in admin-only functions (`admin-manage-users`, `polish-message`). `tutor-chat` has module-scope TTL cache for coaching knowledge, in-function qtype canonicalization. `parse-drill-request` uses Gemini 2.5 Flash with function-calling for structured output. `motivation-engine` has 4 typed validation branches. `voice-coach-respond` has a Reflect/Pinpoint/Next-step prompt structure.
**Severity: 0 (positive confirmation).**

### F5.5 — `generate-micro-drill` is a placeholder
**Evidence.** `supabase/functions/generate-micro-drill/index.ts` (39 lines). Comment: "For now, return placeholder questions. In production, this would query the question bank for similar questions." Returns fake `qid: "micro-${Date.now()}-1"`.
**Severity: 5/10.**
**Fix.** Implement real logic (lift from `adaptiveEngine.generateSmartDrill`) or delete the function entirely.

### F5.6 — `admin-manage-users` mode-detection bug
**Duplicate of F4.4.** Server reads `url.searchParams.get("mode")`, client sends `x-mode` header. Fix: `?? req.headers.get("x-mode")`.

### F5.7 — Qtype canonicalization duplicated client/server
**Evidence.** `src/lib/questionLoader.ts` has `TYPE_SYNONYMS` (~35 entries). `supabase/functions/tutor-chat/index.ts:81-105` has `CANONICAL_QTYPES` + `QTYPE_SYNONYMS` (~28 entries). The server list covers EXCEPT variants the client does not ("Strengthen (EXCEPT)", "Weaken EXCEPT", "Must Be True EXCEPT").
**Behavior.** Two sources of truth. Will drift.
**Severity: 5/10.**
**Fix.** Single canonical normalizer — either a shared module symlinked both sides, or a DB-side function exposed to both.

### F5.8 — Migration RLS regression
**Evidence.** `supabase/migrations/20251022025825_...sql` (Oct 22, 2025) tightened RLS on `attempts`, `profiles`, `drill_templates`, `flagged_questions`, `wrong_answer_journal`, `voice_coaching_sessions` to `class_id = get_user_class_id(auth.uid())`. `supabase/migrations/20260406070036_...sql` (April 6, 2026) reintroduces `CREATE POLICY "Students can view own data" ON students FOR SELECT USING (true)` and similar for attempts, profiles, sessions, settings, events. Three more April 6 migrations (`070119`, `070140`, `070202`) have similar patterns.
**Behavior.** Likely a Lovable schema-regeneration step that captured a temporarily-loosened state. Running `supabase db reset` may error on duplicate policy names OR leave open policies in the final state depending on CLI resolution.
**Severity: 6/10.**
**Fix.** Audit policy names across migrations. Either delete the regressing `CREATE POLICY ... USING (true)` lines from April 6 baselines (idempotent-safe if names match existing tightened policies), or add a post-April-6 tightening migration that restores the Oct 22 state explicitly. Verify `supabase db reset` locally.

### F5.9 — Dead gamification schema columns
**Duplicate of F4.5 extension.** `profiles.xp_total`, `streak_current`, `longest_streak`, `level` — unwritten. Ship or drop.

### F5.10 — `.env` exposes Supabase URL and anon key correctly
**Evidence.** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. Key JWT payload is `"role":"anon"` — designed to ship to clients. `client.ts` uses `VITE_SUPABASE_PUBLISHABLE_KEY` only. No service-role in client env.
**Severity: 0 (positive confirmation).** Document the convention so no one drops `VITE_SUPABASE_SERVICE_ROLE_KEY` in there.

### F5.11 — ESLint config is thin
**Evidence.** `eslint.config.js` extends `js.configs.recommended` + `tseslint.configs.recommended` + `reactHooks.configs.recommended.rules` + a single `react-refresh/only-export-components` warning. Disables `@typescript-eslint/no-unused-vars`. No `eslint-plugin-import`, no `eslint-plugin-jsx-a11y`, no Prettier, no type-aware rules, no CI runner.
**Behavior.** Dead imports accumulate (F5.3 is partly a consequence). Several `// eslint-disable-next-line react-hooks/exhaustive-deps` comments in the code (valid uses).
**Severity: 4/10.**
**Fix.** Re-enable `no-unused-vars` with reasonable severity. Add `eslint-plugin-jsx-a11y`.

### F5.12 — Vitest and Playwright wired but unused
**Evidence.** `vitest.config.ts` expects `src/test/setup.ts`, globs `src/**/*.{test,spec}.{ts,tsx}`. Zero specs. `playwright.config.ts` uses `createLovableConfig({})`. `@playwright/test` installed. Zero tests. CLAUDE.md admits this.
**Severity: 5/10** relative to premium product expectations.
**Fix.** Minimal test suite targeting high-silent-failure-risk paths: drill save-attempt round-trip, admin flag toggle, message send, optimistic inbox unread, OAuth return-leg.

### F5.13 — Vite config is clean and production-ready
**Evidence.** `vite.config.ts`. React SWC plugin, `lovable-tagger` dev-only, VitePWA with proper manifest (`start_url: /foyer`, `theme_color: #000000`), `navigateFallbackDenylist: [/^\/~oauth/]` protecting OAuth returns, `CacheFirst` runtime cache on `/data/*.json` (7-day max-age, 100 entries) partially mitigating F2.1. `resolve.alias` dedupes React to prevent double-copy during HMR. `process.env.PORT` honored.
**Severity: 0 (positive confirmation).**

### F5.14 — Theming lifecycle FOUC
**Evidence.** `ThemeContext.tsx` reads localStorage inside `useState` initializer so React's first render has correct theme. But `src/main.tsx` does not apply the class to `html` before React mounts. Browser paints dark palette (default) for one frame before React's first `useEffect` adds `light` class if that is the stored preference.
**Severity: 3/10.**
**Fix.** Inline script in `index.html` that reads localStorage and sets the class on `html` before React mounts.

### F5.15 — `.claude/settings.json` allowlist is clean
**Evidence.** Read tools, npm scripts, `npx` wrappers (tsc/vitest/eslint/playwright/supabase), git reads, git push/pull to origin. No destructive ops, no `rm`, no `sudo`. `.claude/settings.local.json` gitignored for per-dev overrides.
**Severity: 0 (positive confirmation).**

### F5.16 — `components.json` baseColor mismatch
**Evidence.** `components.json`: `"baseColor": "slate"`. Actual palette: HSL `0 0% X%` (neutral).
**Behavior.** Only referenced on new component generation via `npx shadcn add`. Harmless at runtime.
**Severity: 1/10.**
**Fix.** Update to `"baseColor": "neutral"` for shadcn-add consistency.

### F5.17 — `src/App.css` exists alongside `src/index.css`
**Evidence.** Both files in `src/`. Not read at scan depth.
**Severity: 2/10.**
**Fix.** Verify `App.css` is needed. If blank or CRA leftover, delete. If content, consolidate into `index.css`.

### F5.18 — No CI
**Evidence.** No `.github/workflows/`, no GitLab CI, no pre-commit hooks.
**Behavior.** Lovable presumably builds on push. Nothing runs `npm run lint`, `tsc --noEmit`, or tests before deploy.
**Severity: 5/10.**
**Fix.** GitHub Action on PR: `npm run lint` + `npx tsc --noEmit -p tsconfig.app.json` + `npm run test`. Five minutes of config, meaningful safety net.

## Scores (Scan 5 slice)

| Axis | Score |
|---|---|
| Architecture quality | 72 / 100 |
| Maintainability | 60 / 100 |
| UI/design consistency | **86 / 100** |
| Product vision alignment | 80 / 100 |
| Bug/risk level | 66 / 100 |

UI/design consistency score is the highest in the audit. The design system is genuinely premium; what drags the product is how well the system is deployed into product surfaces elsewhere.

## Next Actions (ranked)

1. Fix the `.dark` class semantics. Option A (flip convention) is cleanest.
2. Resolve the migration regression. Audit policy names across April 6 migrations.
3. Fix `admin-manage-users` mode detection (one-line server change).
4. Share qtype canonicalization between client and edge functions.
5. Ship or delete `generate-micro-drill`.
6. Delete 25 unused UI components.
7. Decide on gamification (F4.5 call).
8. Add minimal CI.
9. Add 5 integration tests targeting silent-failure paths.
10. Fix theme FOUC with inline script.
11. Tighten ESLint.

## Known Open Questions

- Has the April 6 RLS regression hit the production DB? Cannot determine from repo alone. Resolution requires inspecting the deployed Supabase project directly OR running `supabase db reset` locally.
- Is the `.dark` alias defensive against a specific known scenario (`next-themes`, SSR, Lovable preview) or vestigial? Decides whether convention flip is safe.
- How many `dark:` variants are in vendored shadcn vs hand-written code? Decides audit scope for F5.1.
- Is Lovable's deploy pipeline doing any lint/type/test checks? Affects CI priority.

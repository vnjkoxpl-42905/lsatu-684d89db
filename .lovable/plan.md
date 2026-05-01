# Lovable autopilot plan — ACTIVE (2026-05-01)

## Source of truth

The new Main Conclusion bootcamp lives at `src/bootcamps/main-conclusion/` (105 files) and is wrapped by `src/pages/MainConclusionBootcamp.tsx`. It is mounted at `/bootcamp/structure/*` via `src/App.tsx`. **This is canonical and approved by Joshua (2026-05-01).**

The OLD bootcamp at `src/pages/Structure.tsx` + `src/components/structure/**` is **no longer routed**. Source files remain on disk pending a separate archival decision. **DO NOT re-route `/bootcamp/structure` to the old `Structure.tsx`.**

## Current canonical route table (do not change without Joshua's explicit chat directive)

- `/bootcamp/structure/*` → `MainConclusionBootcamp` (the new bootcamp). The splat `/*` is REQUIRED for the bootcamp's nested module routes (lessons, drills, simulator, hard-sentences, diagnostics, journal, settings, reference) to work.
- `/bootcamp/structure-v2` → `Navigate to /bootcamp/structure replace` (legacy alias).
- `/bootcamp/structure-v2/*` → `Navigate to /bootcamp/structure replace` (legacy alias for nested deep links).
- `/bootcamp/main-conclusion-role` → `Navigate to /bootcamp/structure replace` (legacy alias).
- `/bootcamp/causation-station` → `CausationStation` (unchanged, untouched).
- `/bootcamp/abstraction` → `Abstraction` (unchanged, untouched).

## SPA fallback (do not remove)

The repo deploys to Netlify (Lovable's host). For BrowserRouter deep-link refresh to work, two things must be in place:

1. `public/_redirects` contains `/*    /index.html   200` — Netlify SPA fallback. Required.
2. `vite.config.ts` PWA workbox config has `navigateFallback: "/index.html"` plus `navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /\.[^/]+$/]` — service worker fallback for repeat visits. Required.

Both are defense-in-depth for deep-link 404s. Removing either re-introduces the bug Joshua hit on 2026-05-01 (404 on `/bootcamp/structure/*` deep links).

## What NOT to do

- ❌ Do NOT re-import `Structure` from `./pages/Structure` into `App.tsx`.
- ❌ Do NOT redirect `/bootcamp/structure` to `/bootcamp/structure-v2`.
- ❌ Do NOT remove the `MainConclusionBootcamp` import from `App.tsx`.
- ❌ Do NOT change `path="/bootcamp/structure/*"` to `path="/bootcamp/structure"` (must keep the splat).
- ❌ Do NOT delete `public/_redirects`.
- ❌ Do NOT strip `navigateFallback` from `vite.config.ts`.
- ❌ Do NOT modify the Bootcamps card to point at the old Structure description (8 modules: Foundations, 2-Part Check, FABS, X-Ray, Argument Shapes, Trojan Horse, 7 Traps, Prove It). The card now describes the NEW bootcamp (6 modules, 12 lessons, 9 drills, simulator, hard sentences, diagnostics, SM-2 SRS).
- ❌ Do NOT delete `src/bootcamps/main-conclusion/`, `src/pages/MainConclusionBootcamp.tsx`, `scripts/main-conclusion/`, or `docs/main-conclusion-bootcamp/` — these are the bootcamp's source of truth.

## Historical context (do not act on this; reference only)

An earlier version of this plan instructed Lovable autopilot to do the opposite of the above. That plan was wrong — it misidentified which bootcamp was canonical. The Lovable commits `9b35eb8`, `163be27`, `6954151`, `be79274` ("Fixed structure bootcamp route") executed that wrong plan and were rewound by Claude in commit `8baf646` after Joshua confirmed the new bootcamp is canonical. This plan file replaces the old one entirely.

## Out of scope for autopilot (Joshua-only decisions)

- Drill 3.4 Stage 4 canonical-20 subset selection.
- M4 distractor seeds (Q11 Mosston rebuttal + Q20 grain-companies wildcard).
- OLD `Structure.tsx` + `src/components/structure/**` archival (move to `src/_archived/`).
- M1 voice walkthrough on Lessons 1.1–1.12.
- Phase D distractor batch authoring (gated on M4 seeds).
- Trap Master worst-case examples (gated on Phase D trait lock).
- Light-mode theme for the bootcamp (currently dark-only by spec).

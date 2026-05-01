# Why the old "STRUCTURE" page keeps coming back

## Diagnosis (the actual cause)

The screenshot you keep seeing (sidebar with `Foundations / The 2-Part Check / FABS · The Premise Quartet / X-Ray the Structure / Argument Shapes / Trojan Horse Concession / The 7 Traps / Prove It · Simulator`, plus "Bootcamp progress: 0%", "CHECK-IN", "Finalize Module") **does not exist anywhere in the current codebase**. I searched every file — no component renders that UI anymore.

What's actually wired today:
- `App.tsx` route `/bootcamp/structure/*` → `MainConclusionBootcamp` → `BootcampRoutes` (the new Claude-built bootcamp with Lessons 1.1–1.13, Reference, Drills, Simulator, Hard Sentences, Diagnostics).
- The old `src/pages/Structure.tsx` was already deleted earlier in this thread.

So why is the old UI still showing? **It's being served by a stale Service Worker (PWA) cache.**

The project uses `vite-plugin-pwa` with `registerType: "autoUpdate"`, `skipWaiting`, and `clientsClaim`. `src/main.tsx` only unregisters the SW when the host is `id-preview--*` or `lovableproject.com`. On the **published domains** (`lsatu.lovable.app`, `www.lsatprep.study`, `lsatprep.study`) the SW stays active and keeps serving the previous deploy's `index.html` + JS bundles from cache — which still contain the old Structure module markup baked in. Hard reload doesn't always evict it because the SW intercepts the navigation.

That's why it "keeps returning" no matter how many times we fix the route in code: the user's browser literally never downloads our new build.

## The fix — two parts

### Part 1: Kill the stale cache permanently

1. Add a published-host branch to `src/main.tsx` so the SW is also unregistered (and caches purged) when an outdated bundle is detected. Specifically: on every load, if the registered SW's scriptURL differs from the current build, unregister it and `caches.keys()` → `caches.delete()` everything, then reload once.
2. Make this safe for the production PWA: gate the auto-purge so it only fires when the app detects an old build SHA (compare `__BUILD_SHA__` against a value stamped into the SW). Avoids an infinite reload loop.
3. Bump the SW by re-registering with the new `BUILD_SHA` so all current users get the new bundle on their next visit without manual cache clearing.

User-side, one-time: I'll also add a tiny "Force refresh" link in the bootcamp's error/empty state so anyone still stuck can self-recover.

### Part 2: Rename the bootcamp to "Intro to LR" so this can never confuse anyone again

Rename target: **"Intro to LR"** (was: "Main Conclusion / Argument Structure").

Route + identifier rename: `/bootcamp/structure` → `/bootcamp/intro-to-lr`.

Files to update:

- `src/App.tsx`
  - Add `<Route path="/bootcamp/intro-to-lr/*" element={…MainConclusionBootcamp…} />`.
  - Keep `/bootcamp/structure/*` and `/bootcamp/structure-v2/*` as **`<Navigate>` redirects** to `/bootcamp/intro-to-lr` so any old bookmark, link, or cached HTML still lands on the right place.
  - Rename the import: `MainConclusionBootcamp` → `IntroToLrBootcamp` (file rename below).
- `src/pages/MainConclusionBootcamp.tsx` → rename file to `src/pages/IntroToLrBootcamp.tsx`. Update the doc comment header to say "/bootcamp/intro-to-lr — Intro to LR bootcamp".
- `src/pages/Bootcamps.tsx`
  - Change the card: `id: 'intro-to-lr'`, `title: 'Intro to LR'`, `route: '/bootcamp/intro-to-lr'`.
  - Update emoji/description if you want; otherwise leave the description alone.
- `src/bootcamps/main-conclusion/` — keep the folder name (internal, no user impact) but update every hardcoded `'/bootcamp/structure'` prefix to `'/bootcamp/intro-to-lr'`. Affected files (from the prior fix pass):
  - `modules/lessons/LessonsIndex.tsx`
  - `modules/ModuleIndex.tsx`
  - `modules/reference/ReferenceIndex.tsx`
  - `modules/drills/DrillsIndex.tsx`
  - `modules/diagnostics/DiagnosticsIndex.tsx`
  - `modules/diagnostics/TraitProfile.tsx`
  - `modules/diagnostics/Recommendations.tsx`
  - `lib/diagnostics.ts`
  - `components/command-palette/CommandPalette.tsx`
- `WorkspaceShell` header label (the "STRUCTURE" chip in the top bar): change to "INTRO TO LR".
- Any sidebar/heading that says "MAIN CONCLUSION": change to "INTRO TO LR".

I will leave the internal folder `src/bootcamps/main-conclusion/` untouched — renaming a folder this deep risks breaking dozens of imports for zero user benefit. Only the **route, page name, sidebar label, and bootcamp card** change. That's all the user ever sees.

## What you'll see after this ships

1. On next deploy, every browser that loads the app will detect the new build SHA, purge the old SW + caches, and download fresh JS. The ghost "STRUCTURE / Foundations / Finalize Module" UI dies for good.
2. The bootcamp card on `/bootcamps` says **Intro to LR** and routes to `/bootcamp/intro-to-lr`.
3. Any old link to `/bootcamp/structure` redirects forward, so nothing breaks.
4. The header chip and sidebar say **INTRO TO LR**.

## Technical notes

- I won't touch `vite-plugin-pwa`'s config beyond what's needed for the cache-busting check. The PWA still works offline; we just stop serving truly stale bundles.
- `public/_redirects` is irrelevant on Lovable hosting (per Lovable docs) and won't be touched.
- The internal data files (`lessons.generated.json`, `manifest.generated.json`, etc.) reference no route prefixes, so the rename is safe.
- I'll grep for any remaining `bootcamp/structure` string after the edits to make sure nothing dangling links back to the old path.

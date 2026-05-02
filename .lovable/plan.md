## What’s happening

I checked the current app code and the old **"Structure"** bootcamp card/page from your screenshot is **not** in the active source anymore.

What is still true today:
- `src/pages/Bootcamps.tsx` only defines the active card as **Intro to LR**.
- `src/App.tsx` still keeps legacy aliases like `/bootcamp/structure` and `/bootcamp/structure-v2` alive.
- The published site is still shipping a real `sw.js` service worker.

That means the reason this old version “comes back” is:
1. A previously-installed browser/app service worker still controls navigation.
2. It serves an old cached app shell and old JS bundle.
3. That old bundle still contains the retired **Structure** UI.
4. Because the old bundle is what loads first, the newer cache-busting code in `src/main.tsx` is not reliable enough to rescue the session.

So the root cause is **stale PWA/service-worker caching**, not the current bootcamp source itself.

## Plan

### 1) Kill the stale service worker for real
- Add a **kill-switch worker** at the old worker path(s):
  - `public/sw.js`
  - `public/service-worker.js` (defensive, in case any device registered that path)
- The kill-switch will:
  - claim all clients
  - delete all Cache Storage entries
  - force controlled windows to navigate once with a cache-busting param
  - unregister itself

This is the important missing piece. It cleans up devices that are already trapped on the old shell.

### 2) Stop shipping the behavior that caused this
- Remove or disable `vite-plugin-pwa` in `vite.config.ts`.
- Keep the app as a normal web app, or manifest-only if installability is still desired.
- Simplify `src/main.tsx` so it only keeps lightweight service-worker cleanup guards where needed, instead of relying on build-SHA mismatch logic alone.

This prevents the ghost version from reappearing later.

### 3) Retire the old “Structure” slug completely
- Update `src/App.tsx` so the legacy routes do **not** behave like a live bootcamp alias anymore:
  - `/bootcamp/structure`
  - `/bootcamp/structure/*`
  - `/bootcamp/structure-v2`
  - `/bootcamp/structure-v2/*`
  - `/bootcamp/main-conclusion-role`
- Redirect those to `/bootcamps` instead of silently forwarding into **Intro to LR**.

That way the old name is clearly dead and cannot keep being mistaken for the active bootcamp.

### 4) Re-audit active UI so changes only apply to the correct bootcamp
- Re-check active launch targets in:
  - `src/pages/Bootcamps.tsx`
  - `src/App.tsx`
  - `src/bootcamps/main-conclusion/components/workspace-shell/LeftRail.tsx`
  - any active bootcamp labels/routes under `src/bootcamps/main-conclusion/`
- Confirm that only **Intro to LR** is user-facing for this bootcamp family.
- Remove any remaining user-facing `Structure` / `Main Conclusion` labels from active surfaces if any remain.

### 5) Add a small verification marker so we can confirm the stale shell is gone
- Surface a tiny build/version label on a safe page like `/bootcamps` or in the bootcamp shell.
- Use the existing `src/lib/buildInfo.ts` values.

This gives a fast visual way to tell whether the user is seeing the current build or an old cached one.

### 6) QA the exact failure paths
I’ll verify these routes after the fix:
- `/bootcamps` shows the current bootcamp list only
- `/bootcamp/intro-to-lr` opens the correct bootcamp
- `/bootcamp/structure` no longer opens as a real bootcamp route
- published/custom-domain behavior no longer resurfaces the retired Structure UI

## Technical details

- The current `__BUILD_SHA__` comparison in `src/main.tsx` helps only **after the new JS bundle runs**.
- In your case, the problem is that some browsers are still loading the **old cached shell first**, so that logic may never get a chance to execute.
- That is why the proper fix is the **kill-switch service worker**, plus retiring the old route alias.

Once approved, I’ll implement this cleanup so the old Structure version is gone and can’t keep hijacking people back into the wrong bootcamp.
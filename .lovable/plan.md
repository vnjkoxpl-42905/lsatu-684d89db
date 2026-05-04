## Goal

1. Completely remove `BackgroundPaths` / `BackgroundPathsHero` from the codebase — no file, no imports, no references.
2. Keep the Arc cream landing as `/auth`'s base, but auto-open the dark login modal whenever a user lands on `/auth` so the form is visible immediately on top of the cream background.

## Changes

### 1. Purge BackgroundPaths

- **Delete** `src/components/ui/background-paths.tsx`.
- **`src/pages/Home.tsx`** — remove the `import { BackgroundPaths }` (line 16) and the `<BackgroundPaths />` render (line 304). The Card already has its own dark backdrop + Spotlight + Spline scene, so removal is purely subtractive.
- **`src/pages/Onboarding.tsx`** — remove the import (line 7) and the `<BackgroundPaths />` render (line 87). Replace with the page's existing solid background (no extra wrapper needed).
- **`src/pages/ResetPassword.tsx`** — remove the import (line 8) and the `<BackgroundPaths />` render (line 187). Same treatment as Onboarding.
- **`src/pages/Auth.tsx`** — remove the stale comment on line 415 that mentions BackgroundPaths.

After these edits, `rg "BackgroundPaths|background-paths"` must return zero results.

### 2. Auto-open login modal on /auth

In `src/pages/Auth.tsx`:
- Locate the modal-open state (currently triggered by the "START HERE" / login CTA).
- Initialize that state to `true` when the route is `/auth` (use `useLocation` or simply default the `useState` to `true` since this page is only reached via `/auth`).
- Keep the close handler intact so users can dismiss the modal and explore the cream Arc landing underneath if they want.
- Confirm the modal's `fixed inset-0 z-40 bg-black/55 backdrop-blur-[5px]` overlay still renders correctly above the Arc layout on first paint (no flash of empty cream).

### 3. Verification

- Visit `/auth` → cream Arc landing renders with the dark login modal already open and focused on the email field.
- Dismiss modal → cream Arc landing visible; clicking the page's login CTA reopens the modal.
- Visit `/`, `/foyer`, `/onboarding`, `/reset-password`, `/home` → no visual regressions, no console errors about missing `BackgroundPaths`.
- `rg BackgroundPaths` returns nothing.

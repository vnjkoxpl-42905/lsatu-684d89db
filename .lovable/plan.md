## What went wrong

The previous turns confused two different pages:

1. **`src/pages/Structure.tsx`** — the actual updated Structure bootcamp. 8 modules: Foundations, 2-Part Check, FABS, X-Ray the Structure, Argument Shapes, Trojan Horse, 7 Traps, Prove It · Simulator. This is the one you want to keep.
2. **`src/pages/MainConclusionBootcamp.tsx`** (mounted under `/bootcamp/structure-v2/*`) — the older Main Conclusion bootcamp, which the card on the Bootcamps page was mislabeled as "Structure (Preview)". This is what's currently rendering when you click into Structure, because `/bootcamp/structure` was redirected to `/bootcamp/structure-v2`.

So you're seeing the old Main Conclusion bootcamp under what looks like a Structure URL.

## Fix

**1. `src/App.tsx`**
- Re-import `Structure` from `./pages/Structure`.
- Replace the redirect `/bootcamp/structure → /bootcamp/structure-v2` with a real route that renders `<Structure />` (gated by `has_bootcamp_access`).
- Remove the `/bootcamp/structure-v2/*` route and the `MainConclusionBootcamp` import (no longer used in the bootcamps surface).
- Update the legacy `/bootcamp/main-conclusion-role` redirect to point to `/bootcamp/structure` instead of `/bootcamp/structure-v2`.

**2. `src/pages/Bootcamps.tsx`**
- Replace the `structure-v2` card with a single `structure` entry:
  - id: `structure`
  - title: `Structure`
  - route: `/bootcamp/structure`
  - Remove the `PREVIEW` badge and the "in active development" copy. Use accurate stats reflecting the 8-module Structure page.

**3. No deletions yet**
- Leave `src/pages/MainConclusionBootcamp.tsx` and `src/bootcamps/main-conclusion/` on disk for now (they're large and may have shared assets). They simply won't be routed to. If you confirm later, we can delete them in a follow-up.

## Result

- `/bootcamp/structure` renders the real, updated 8-module Structure bootcamp from `Structure.tsx`.
- The Bootcamps list shows three entries: Causation Station, Abstract, Structure.
- The old Main Conclusion content stops appearing anywhere in the bootcamp flow.
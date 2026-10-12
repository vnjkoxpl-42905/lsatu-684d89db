# Phase 0 — Stop-the-Bleeding (completion record)

Executes Phase 0 of `COMPREHENSIVEAUDIT.md`. App-code fixes done + verified by Claude Code. Edge-function deploys + H18 auth are in `PHASE0-LOVABLE-DEPLOY.md` (Lovable executes).

Date: 2026-07-09. Branch: main (uncommitted at time of writing).

---

## What was fixed (app code, done in repo)

| ID | File | Change |
|----|------|--------|
| **C145** | `src/components/hub/StudentOverview.tsx` | Added missing `import { formatRelativeShort } from '@/lib/time'`. Was a guaranteed `ReferenceError` crash on any student with dated assignments. |
| **C3** | `src/pages/Drill.tsx` (~2418, ~2443) | Blind Review `blind_review_sessions` + per-`attempts` inserts now destructure `{ error }` and `throw` on failure, so the existing catch/toast fires instead of silently losing a full BR. |
| **C2** | `src/components/drill/LRSectionResults.tsx` (~184) | `section_history` insert now checks `{ error }` and throws; the existing catch toasts. |
| **H10** | `src/components/drill/LRSectionResults.tsx` (~59, ~156) | Replaced the ineffective `savingToHistory` **state** guard with a `savedRef = useRef(false)` set before any await, killing StrictMode double-fire + remount duplicate `section_history` rows / duplicate WAJ logs. |
| **C1** | `main-conclusion/persistence/*` + `hooks/useModuleProgress.ts` | Added `ready(): Promise<void>` to the `Persistence` interface (all 4 impls). `SupabaseSyncedPersistence` resolves it when the initial cloud `hydrate()` settles. `useModuleProgress` now `await persist.ready()` before deciding the row is missing, so a cold cross-device load no longer fabricates a default row that clobbers real cloud progress. |
| **H17** | `supabase/functions/gemini-proxy/index.ts` | `mapEmbedModel` now honors `body.model`, defaults to `gemini-embedding-001`, and `handleEmbeddings` passes `outputDimensionality: 3072` so embeddings match the DB `vector(3072)` column. (Source only; needs Lovable deploy to take effect.) |
| **H19** | `supabase/functions/tutor-chat/index.ts` (~498) | The `events` `coaching_request` insert is now wrapped in the existing `runInBackground(...)` with error logging, so it actually executes instead of being a never-awaited lazy builder. (Source only; needs Lovable deploy.) |

## What is NOT done (needs Lovable — see PHASE0-LOVABLE-DEPLOY.md)

- Deploy `gemini-proxy` (H17) and `tutor-chat` (H19) so the source edits take effect.
- **H18** (gemini-proxy unauthenticated → unbounded LLM spend): deliberately deferred. Needs a new `EDGE_INTERNAL_KEY` secret + ~12 caller updates deployed atomically. Confirm the approach before shipping.

## Verification done by Claude Code

- `npx tsc --noEmit -p tsconfig.app.json` → **0 errors** (was TS2304 on C145; the audit's own C145 verify step).
- `npx vitest run src/bootcamps/main-conclusion` → **20 files, 98 passing / 1 skipped** (Persistence-interface change broke no mocks).
- `npx vite build` (heap bumped) → completes, `dist/index.html` produced (source changes bundle cleanly).
- Dev server + Playwright, **logged in as admin** (`contact@aspiringattorneys.com`): boots to `/auth` → signed in → `/mainhub` → `/admin/ta` (Student Hub) all with **0 console errors**.
- **C145 live-verified:** opened the **Overview** tab (which renders `StudentOverview`, the crash file) for multiple real students (C. Alexander, Isabella Lorenzo) — the component mounts and renders its Assignments section with **0 console errors**, no `formatRelativeShort is not defined`. Screenshot: `c145-studentoverview-verified.png` (repo root). Note: none of the dev-DB students currently have a `ta_assignment` with a non-null `assigned_at`, so the exact `AssignmentRow` line 380 branch could not be forced from data; however `tsc` proves the identifier is now bound (TS2304 gone), so the ReferenceError is structurally impossible. If you want a 100% live exercise of that line, assign a TA drill to a test student and reopen their Overview.

## Verification still owed (needs authenticated test student — Joshua)

These save-path fixes were verified by tsc + static reasoning, NOT by live click-through (no seeded student/data available in this session):

1. **C3:** As a test student, finish a full Blind Review; confirm rows land in `blind_review_sessions` + `attempts`. Then force a failure (e.g. temporarily break RLS) and confirm the "Failed to save blind review results" toast now fires.
2. **C2/H10:** Complete an LR section; confirm exactly **one** `section_history` row and no duplicate WAJ entries (re-enter the results route to confirm no second insert). Force an insert failure and confirm the "Failed to save section results" toast fires.
3. **C1:** Sign in on device A, make bootcamp progress, sign in on device B fresh; confirm B hydrates real progress and does not overwrite it with a default row. Check `bootcamp_kv` for the user has no clobbered `module_progress`.
4. **H17/H19:** Per `PHASE0-LOVABLE-DEPLOY.md` after deploy.

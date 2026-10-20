# LSAT U Repo Audit — April 2026

**Repo anchor:** `vnjkoxpl-42905/lsatu-684d89db` at HEAD `9165b2c` (Merge PR #23 foyer-ring-inspiration).
**Audit date:** 2026-04-19.
**Supersedes:** `lsatu-fix-playbook.md` (Jan 2026). Where this document disagrees with the old playbook, this document wins because it was verified against the current repo state.

## Files in this bundle

| File | Purpose | Use it when |
|---|---|---|
| `01-scan-auth-session-permissions.md` | Auth flow, session death handling, permissions fetching, provisioning | Touching `AuthContext`, `useUserPermissions`, `ProtectedRoute`, OAuth return-leg, or adding an `on_auth_user_created` trigger |
| `02-scan-drill-surface.md` | `Drill.tsx` (2,194 lines), adaptive engine, attempt persistence, question loading | Any work on `src/pages/Drill.tsx`, `src/components/drill/*`, `src/lib/adaptiveEngine.ts`, `questionLoader.ts`, or the 40/40/20 smart drill |
| `03-scan-foyer-inbox-realtime.md` | Foyer nav, hero ring, inbox, FloatingMessenger, realtime channels, PDF attachments | Any work on Foyer, the mobile nav trap, Ask Joshua flow, messaging, optimistic chat, or `useInbox` |
| `04-scan-admin-bootcamps-content.md` | Admin Dashboard, Classroom (mock data), Schedule (in-memory), Analytics, WAJ, Flagged, Bootcamps, gamification | Any work on admin features, Classroom replacement, Schedule persistence, or deciding the gamification ship/delete call |
| `05-scan-design-system-backend-infra.md` | Tailwind + CSS vars, the `.dark` class bug, edge functions, migration history, build/CI | Any theming work, any edge function work, migration cleanup, or adding CI |
| `master-reference.md` | Consolidated 7-section master reference | Primary context paste for any multi-area task or Claude Code prompt |

## How to use these in a Claude Code prompt

For a narrow task, paste the single relevant scan file.
For a cross-cutting task, paste `master-reference.md` plus the scan(s) most relevant.
Never paste all six at once — it's redundant and burns context.

## Finding IDs

Each scan's findings are numbered `F<scan>.<n>` (e.g., F2.2, F3.4). These IDs are stable. Cite them in future prompts and updates.

## Scan delivery cadence (what was produced and when)

1. Phase A — First overall pass
2. Phase B — Scan plan
3. Scan 1 → Scan 2 → Scan 3 → Scan 4 → Scan 5
4. Final consolidated master reference

All five scans were completed against the checked-out HEAD. No scan was skipped. Partial coverage of specific files is noted per scan under "Known Open Questions" in the master reference.

## Scoring model

Every scan scores five axes out of 100:
- Architecture quality
- Maintainability
- UI/design consistency
- Product vision alignment
- Bug/risk level (higher = healthier)

No combined overall score by design. See master reference §5 for the matrix.

## Severity scale

Severity is a single number /10 blending product impact and technical risk. A 10 is product-breaking trust violation. A 1 is code-hygiene nit. Severity drives the Prioritized Issue List ordering in §6 of the master reference.

## Top-3 issues to fix this week

From the master reference, the three that matter most:

1. **Classroom page ships mock data with fake student scores and fake feedback** (F4.1) — remove immediately, replace with truthful empty state until real backing exists.
2. **Mobile Foyer has no nav surface + Ask Joshua dead-button for new students** (F3.1, F3.4) — two failures compounding at the primary landing page on the most-used device class.
3. **`Drill.tsx` silently swallows DB write errors across 4 paths** (F2.2, F2.3) — bug that quietly damages the core promise of tracking progress.

Everything else can wait or be parallelized.

# Promotion Runbook — `/bootcamp/structure-v2` → `/bootcamp/structure`

**Status:** Pre-staged (2026-05-01). Awaits Joshua Gate 5 walkthrough sign-off + go/no-go.
**Estimated time to execute:** ~30 minutes including post-deploy spot-check.
**Authoritative scope:** swap the v2 preview surface into the main `/bootcamp/structure` URL and decide the disposition of the existing 8-module Structure bootcamp at `src/pages/Structure.tsx`.

---

## Pre-flight (decisions Joshua needs to make BEFORE the runbook executes)

| ID | Decision | Default | Joshua override? |
|---|---|---|---|
| **PR-1** | Disposition of the existing `src/pages/Structure.tsx` + `src/components/structure/**` (the 8-module guided bootcamp currently live at `/bootcamp/structure`) | **Archive** to `src/_archived/structure/` (preserves history; restorable via single git mv) | Delete · Archive · Keep both behind feature flag |
| **PR-2** | Disposition of the v2 card on `/bootcamps` index page | **Remove** (v2 card disappears; existing Structure card description updated to point to the new bootcamp) | Keep both cards · Replace existing card |
| **PR-3** | Branch strategy for the swap | **Feature branch `feat/promote-mc-bootcamp-v1` → PR → merge to main** | Direct push to main (faster, no CI gate) |
| **PR-4** | Lovable preview verification window | **24-hour soak on Lovable preview before declaring v1 shipped** | Ship-and-watch · 1-hour soak · longer soak |
| **PR-5** | Mr. Tannisch orphan stimulus disposition (parked OQ) | **Drop from canonical 20** (already removed from MCFIRST extract; spec listing was wrong) | Keep with new source · Re-author from memory · Drop |
| **PR-6** | Phase D blocking question — promote with stub distractors or wait for Phase D batch? | **Promote with current state** (Simulator stimuli render; distractor batch is Phase D additive work that lands after promotion per Rule 16) | Wait for Phase D · Promote with placeholder UX · Promote as-is |

**Do not run any of the steps below until PR-1 through PR-6 are answered.**

---

## Step 1 — Branch + sed across the bootcamp source

```bash
cd /Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u-current
git checkout -b feat/promote-mc-bootcamp-v1
git pull --ff-only origin main

# Sed-rewrite all `/bootcamp/structure-v2` references inside the bootcamp namespace.
# Scope: src/bootcamps/main-conclusion/ only — never the rest of the repo.
find src/bootcamps/main-conclusion -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 \
  | xargs -0 perl -i -pe 's|/bootcamp/structure-v2|/bootcamp/structure|g'

# Verify no occurrences of the old path remain inside the bootcamp.
! grep -RIn 'structure-v2' src/bootcamps/main-conclusion/
```

The negation grep at the end exits non-zero if ANY occurrences remain. If it errors, stop and investigate before continuing.

---

## Step 2 — Edit `src/App.tsx` route table

Two edits:

1. **Remove** the existing `<Route path="/bootcamp/structure" element={<Structure />} />` registration (or whichever component is currently mounted at that path).
2. **Rename** `/bootcamp/structure-v2/*` → `/bootcamp/structure/*` (keep the same `MainConclusionBootcamp` element + `ProtectedRoute(has_bootcamp_access)` wrapper).
3. **Remove** the `import Structure from '@/pages/Structure'` line (if PR-1 = Archive or Delete).

Per PR-1:
- **Archive:** move the `Structure` import + the file's resolution path. After moving, the import is dead — remove it.
- **Delete:** same as above plus delete the file in Step 4.
- **Keep both behind flag:** wrap the `<Route>` with the flag check; do not remove the import.

---

## Step 3 — Edit `src/pages/Bootcamps.tsx` cards

Per PR-2 (default = Remove v2 card):

1. Delete the `structure-v2` card object from the cards array.
2. Delete the `PREVIEW` badge render block (or whatever badge logic the card added).
3. Update the existing `structure` card object: title stays "Main Conclusion / Argument Structure", description refresh to reflect the new bootcamp surface (lessons + reference + drills + simulator + hard sentences + diagnostics).

If PR-2 = Keep both cards, only update descriptions and leave the card array alone.

---

## Step 4 — Disposition of `Structure.tsx` + `src/components/structure/**`

Per PR-1:

### If Archive (default)

```bash
mkdir -p src/_archived
git mv src/pages/Structure.tsx src/_archived/Structure.tsx
git mv src/components/structure src/_archived/components-structure
```

Then update `src/_archived/README.md` (create if missing) with a one-line note: `Structure.tsx + components-structure: archived 2026-05-DD when Main Conclusion bootcamp v2 was promoted to /bootcamp/structure. Restore via git mv if needed.`

### If Delete

```bash
git rm src/pages/Structure.tsx
git rm -r src/components/structure
```

**Do not delete without an explicit Joshua override on PR-1.** Default is Archive.

### If Keep both

Skip this step entirely. The flag check in Step 2 keeps both routes wired.

---

## Step 5 — Verify

```bash
cd /Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u-current

# Typecheck — must pass clean
npx tsc --noEmit
# expected: exit 0, no errors

# Build — must pass clean
npx vite build
# expected: exit 0, ~140 PWA entries, JS gzip ≤ 750 KB total

# Parity route check — confirms /bootcamp/structure routes resolve
npx tsx scripts/main-conclusion/parity-route-check.ts
# expected: 65/65 routes wired, 0 drift

# Lint — flag any class-name leakage
npm run lint
# expected: clean or only pre-existing warnings
```

If any check fails: stop, fix, re-run all four. **Do not push if any of these are red.**

---

## Step 6 — Manual spot-check on dev server

```bash
npm run dev
```

Walk these URLs in order. Each must render without console errors:

1. `/bootcamps` — confirm the card/badge disposition matches PR-2.
2. `/bootcamp/structure` — should land on the bootcamp Module Index (was `/bootcamp/structure-v2` before).
3. `/bootcamp/structure/lessons` — LessonsIndex with 12 lessons (1.1–1.12 unlocked, 1.13 capstone present).
4. `/bootcamp/structure/lessons/1.1` — Lesson 1.1 renders with cake-on-blocks SVG.
5. `/bootcamp/structure/reference/indicators` — IndicatorVault renders.
6. `/bootcamp/structure/drills/3.1` — Drill 3.1 with Stage 1 + Stage 2 questions (Stage 2 added 2026-05-01).
7. `/bootcamp/structure/drills/3.4` — Drill 3.4 with Stage 1 + Stage 2; Stage 4 still placeholder.
8. `/bootcamp/structure/simulator` — must render `LockedRoute` until Drill 3.4 is cleared.
9. `/bootcamp/structure/diagnostics/dashboard` — Dashboard renders with seed calibration.
10. Cmd+K → confirm command palette opens.
11. `/bootcamp/causation-station` — must still render (preserved untouched).
12. `/bootcamp/abstraction` — must still render (preserved untouched).

If any of these fails, the runbook stops here. Roll back via `git reset --hard HEAD~N` on the feature branch and surface the failure to Joshua before retrying.

---

## Step 7 — Push + PR + Lovable preview soak

```bash
git add -A
git commit -m "feat: promote Main Conclusion bootcamp to /bootcamp/structure"
git push -u origin feat/promote-mc-bootcamp-v1
gh pr create --title "Promote Main Conclusion bootcamp v2 → /bootcamp/structure" --body "..."
```

Per PR-3:
- **Default (feature branch):** open the PR; Lovable spins up a branch-level preview deploy at the PR URL; soak per PR-4 then merge to main.
- **Direct push to main:** skip the PR; `git push origin main` directly. Lovable auto-deploys main → live in 1–3 min.

Per PR-4 (default = 24h soak):
- Lovable preview goes live at the PR URL.
- Monitor for: stale service-worker caches showing old `/bootcamp/structure` (the old 8-module bootcamp), 404s on direct deep-links, persistence-key collisions for users who already had data under the old URL.
- If clean after 24h, merge the PR.

---

## Step 8 — Post-merge spot-check on Lovable production

After Lovable auto-deploys `main`:

1. Hard-refresh `/bootcamp/structure` — the new bootcamp must render.
2. Check the service worker has updated (Workbox `skipWaiting` is in the existing config, so this auto-resolves within an hour).
3. Walk the same 12 URLs from Step 6 against the live preview URL.
4. Confirm `/bootcamp/causation-station` and `/bootcamp/abstraction` still render.

If clean → declare v1 shipped. Update `gate-5-audit.md` Phase I sign-off + `PROJECT_MEMORY.md` Status header.

---

## Rollback plan

If the promotion needs to be undone:

### Quick rollback (within minutes, before Lovable propagates)

```bash
# On main
git revert -m 1 <merge-commit-sha>
git push origin main
```

The revert restores `/bootcamp/structure` to the old 8-module bootcamp + restores the v2 preview at `/bootcamp/structure-v2`. Persistence keys remain stable because all bootcamp persistence is keyed by Supabase user UUID (not by URL path).

### Full rollback (if archived files need to come back)

```bash
git mv src/_archived/Structure.tsx src/pages/Structure.tsx
git mv src/_archived/components-structure src/components/structure
git commit -m "rollback: restore Structure.tsx + components-structure"
```

Then revert the App.tsx + Bootcamps.tsx edits manually.

---

## Promotion checklist (one-shot)

- [ ] PR-1 through PR-6 answered by Joshua
- [ ] Step 1 — branch created, sed pass clean (negation grep returns no matches)
- [ ] Step 2 — App.tsx route swap committed
- [ ] Step 3 — Bootcamps.tsx card disposition committed
- [ ] Step 4 — Structure.tsx disposition per PR-1 committed
- [ ] Step 5 — typecheck + build + parity-route-check + lint all green
- [ ] Step 6 — 12-URL dev-server spot-check clean
- [ ] Step 7 — pushed, PR opened or direct merge per PR-3, soak per PR-4 complete
- [ ] Step 8 — Lovable production spot-check clean
- [ ] PROJECT_MEMORY.md Status header + gate-5-audit.md Phase I sign-off updated
- [ ] BRIDGE_HANDOFF.md "Final state at handoff" table updated to reflect promotion

---

## After promotion — additive work that follows (per Rule 16)

These are NOT blocking the promotion. They land as separate pushes after v1 ships:

1. **Phase D distractor batch.** Joshua provides M4 seeds → Claude scales to 80 distractors → Joshua batch review → drop into `simulator.source.ts`.
2. **Drill stages 3–4 expansion content.** Stage 2 ships at promotion (authored 2026-05-01). Stages 3 and 4 of 3.1–3.3 + Stages 3 of 3.4 still author later. Stage 4 of 3.4 wires the canonical 20 per G2.DRL-3.4.
3. **Drill 3.8 stages 4–6** (Cumulative recall, Full recollection, Final restate).
4. **Trap Master deep-dive worst-case examples** (3 per trait × 7 = 21 examples).
5. **Lighthouse audit pass.**
6. **Vitest + jsdom + testing-library** wired into LSAT U package.json so the bootcamp's 17 unit tests run in CI.
7. **Markdown rendering in Journal** entries (currently plain text).
8. **Light-mode theme** for the bootcamp (currently dark-only by spec).
9. **LLM-backed AI Tutor + transformers.js MiniLM evaluator** for Drill 3.6 (lazy-load gates already in place).

---

End of runbook.

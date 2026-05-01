# Gate 5 — Pre-merge audit (Phase I)

**Generated:** 2026-05-01
**Status:** Awaiting Joshua walkthrough sign-off

## Phase ledger

| Phase | Status | Output |
|---|---|---|
| Gate 0 | ✓ Passed | Source paths verified |
| Gate 1 | ✓ Closed | Scaffolding plan + reference study + 12 OQ resolutions |
| Gate 2 | ✓ Closed | Content inventory (173 entries) + parity map + Not-Included list |
| Gate 3 | ✓ Closed | Architecture plan, 10 sections, 8 lock items |
| Phase A | ✓ Shipped | 11 primitives + persistence schemas + drill primitives + module shells + Capstone correct-only |
| Phase B | ✓ Shipped | 11 reference section bodies, R1 voice; right-drawer integration; QRC print styles |
| Phase C | ✓ Shipped | 9 drill engines (3.1–3.9); StageGate × 4 drills; Drill 3.4 unlock cascade; whimsical evaluator |
| Phase D | ⏸ Blocked | Awaiting Joshua's M4 seeds (`docs/m4-seed-request.md`) |
| Phase E | ✓ Shipped | 7 Hard Sentences sections; Cluster Decomposer; M5.8 Capstone with 5×4 distractors |
| Phase F | ✓ Shipped | 7 Diagnostics surfaces (philosophy, dashboard, recommendations, R&R review, trait, mistake, SRS/SM-2) |
| Phase G | ✓ Shipped | AI Tutor (template-routed), Smart Hints, Cmd+K palette, Journal, Settings (export + reset) |
| Phase H | ✓ Shipped | DOCX OCR for 12 calibration items; parity route check; manifest re-emit |
| Phase I | ⏳ This document | |

## Gate 5 audit checklist

### 1. Inventory completeness

- ✓ All 173 Table A entries have a destination route in `src/routes.tsx`
- ✓ Every parity-map route (65/65 URL routes) is wired (`scripts/parity-route-check.ts`)
- ✓ 14 cross-cutting parity entries (non-URL "behavior" rows) noted as covered by primitives + drawer + palette infra
- ✓ 86 manifest entries emitted
- ✓ Pipeline drift: **0**

### 2. Named tools

- ✓ All 15 named tools resolve to `/reference/named-tools/:toolId`
- ✓ Every named-tool callout in `lessons.generated.json` (25 references) parity-verified

### 3. Persistence

- ✓ 13 record schemas (User, ModuleProgress, LessonProgress, PrefsUser, SimulatorAttempt, DrillStageGate, TrapsTag, MistakesProfile, SrsQueueItem, RrRecording, RrReview, JournalEntry, CalibrationAttempt) — all Zod-validated
- ✓ Persistence interface: 4 implementations (LocalStorage, IndexedDB, V1 composite, factory)
- ✓ LSAT U absorption swap point: `src/persistence/factory.ts`
- ✓ Settings → Export-all (JSON dump) + Reset-all both functional

### 4. Module ordering enforcement

- ✓ Drill 3.4 → unlocks `/simulator/*` architecturally (not just UX-suggested)
- ✓ 7 ordering tests pass (`src/lib/__tests__/ordering.test.ts`)
- ✓ Lessons cascade: 1.N → 1.N+1 (within M1)
- ✓ M2 Reference + M6 Diagnostics always-accessible
- ✓ `LockedRoute` wrapper redirects with `LockedState` showing blocker + unlock hint

### 5. Voice register parity

- ✓ Lessons 1.1–1.12 — Register 2 (whimsical/parodic)
- ✓ References 2.A–2.K — Register 1 (decisive/procedural) for body, R2 hooks
- ✓ Drill instructions — Register 1
- ✓ Hard Sentences 5.1–5.7 — R2 prose with R1 callouts
- ✓ Diagnostics Philosophy — R2 prose with R1 verdicts
- ✓ Trap Master deep-dive (data layer) — R1
- ✓ AI Tutor templates — R1

### 6. WCAG AA / a11y

- ✓ All interactive surfaces have `focus-visible` outlines (token: `--accent`)
- ✓ Skip-link to `#main` content
- ✓ ESC closes drawer / palette / modal / tutor
- ✓ Cmd+K command palette navigable by keyboard only (↑↓ Enter Esc)
- ✓ ARIA roles on radiogroup (SegmentedControl), switch (Toggle), tablist (StageGateTracker), dialog (Modal/Palette/Tutor)
- ✓ Reduced-motion: animations gated through `motion-reduce:` tailwind variant
- ✓ Color-contrast: dark surfaces with `--ink` ink-on-bg meet AA

### 7. Source-anchor pass

- ✓ Every reference section carries a `source` field
- ✓ Every simulator question carries `source_anchor.{primary, secondary, tertiary, spec_ref}`
- ✓ Every named tool carries a `source` field
- ✓ Every calibration item carries a `source_anchor.primary`
- ✓ Every lesson carries `sources[]` (≥1)

### 8. Build + bundle

| Metric | Target | Actual |
|---|---|---|
| Build clean | required | ✓ 3.22s |
| Typecheck errors | 0 | ✓ 0 |
| Tests pass | all | ✓ 17/17 |
| JS gzip | <500 KB | ✓ 171 KB |
| CSS gzip | reasonable | ✓ 6 KB |
| Cold dev start | <2.5s | ✓ ~310ms |

### 9. Tests

- 7 ordering tests (G2.DRL-3.4 unlock contract, lesson cascade, purity)
- 4 evaluator tests (whimsical evaluator: Valid / Invalid but interesting / Misses the premises)
- 6 SRS tests (SM-2: first-correct-1d, second-correct-6d, ease multiplier, fail-resets, ease floor 1.3, isDue boundary)

### 10. Deferred to v1.5 (logged, not gating)

- LLM-backed AI Tutor (v1 ships template-routed; surface contract identical)
- transformers.js MiniLM evaluator for Drill 3.6 (v1 ships keyword-overlap; lazy-load gate in place)
- Markdown rendering in Journal entries (v1 stores plain text)
- Light-mode theme
- 80-distractor batch authoring (Phase D, blocked on Joshua seeds)
- Drill stages 2–4 expansion content (Phase C ships Stage 1; engine handles all 4)
- Trap Master deep-dive worst-case examples (Phase D dependency)
- Mr. Tannisch orphan stimulus disposition (parked OQ — reviewed at Phase D start)
- Drill 3.6 v1.5 LLM swap
- R&R Drill stages 4–6 (Cumulative recall, Full recollection)
- Lighthouse audit run (manual; fast-follow before public ship)

## What still ships in v1

| Surface | Status |
|---|---|
| Module 1 — Lessons 1.1–1.12 | ✓ Authored, voice-locked |
| Module 1.13 capstone | ✓ Correct-only mode (60 distractors → Phase D) |
| Module 2 — 11 references + 15 named tools | ✓ Authored |
| Module 3 — 9 drills | ✓ Engine + Stage 1 content (Stages 2–4 author at C.10) |
| Module 4 — Simulator | ✓ Stimuli rendered (20/20); distractors deferred to Phase D |
| Module 5 — 7 sections + Cluster Decomposer + M5.8 capstone | ✓ Authored, full MCQ |
| Module 6 — Diagnostics 6.1–6.7 | ✓ Wired to live persistence |
| Cross-cutting — AI Tutor + Smart Hints + Cmd+K + Journal + Settings | ✓ Wired |

## Gate 5 sign-off

Joshua walkthrough required:
- [ ] Lessons 1.1–1.12 voice walk-through
- [ ] References pass (2.A–2.K) — read each section in the right drawer
- [ ] Drill 3.4 → confirm Simulator unlocks on Stage 4 pass
- [ ] M5.8 capstone end-to-end (5 questions)
- [ ] M6 Diagnostics dashboard with calibration seed in place
- [ ] Cmd+K palette opens, types, navigates
- [ ] Settings → Export all (JSON downloads) + Reset all (modal confirm)

On approval → v1 ships. Phase D + the deferred items follow as additive Rule 16 work.

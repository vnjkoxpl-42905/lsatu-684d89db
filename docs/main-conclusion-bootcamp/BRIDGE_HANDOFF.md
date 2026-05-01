# Main Conclusion Bootcamp — Bridge Handoff

**Generated:** 2026-05-01
**Author:** Claude Code (Opus 4.7, 1M context)
**For:** Joshua (contact@aspiringattorneys.com) + future Claude Code sessions

---

## TL;DR

The in-progress Claude-built Main Conclusion bootcamp has been bridged into the LSAT U repo as a parallel preview surface at `/bootcamp/structure-v2`. The existing `/bootcamp/structure` (the 8-module guided bootcamp in `Structure.tsx`) is **untouched**.

- **Repo:** https://github.com/vnjkoxpl-42905/lsatu-684d89db
- **Branch merged:** `feat/bootcamp-main-conclusion-bridge` → `main`
- **Merge commit on main:** `b8331cfaecea4f828226bed56b85d06cd86dcebd`
- **Build:** ✓ `npx vite build` clean (139 PWA entries)
- **Typecheck:** ✓ `npx tsc --noEmit` 0 errors
- **Lovable:** auto-syncs from `main` (1–3 min from push to live)

---

## Where things live

### Inside LSAT U repo

```
src/bootcamps/main-conclusion/        ← 105 files, full bootcamp namespace
  components/                          (primitives, workspace-shell,
                                       stage-gate, x-ray-scan, question,
                                       coachs-note, trap-master,
                                       cluster-decomposer, argument-structure-map,
                                       ai-tutor, smart-hints, command-palette)
  modules/
    lessons/                          (LessonsIndex, Lesson, Capstone)
    reference/                        (ReferenceIndex, ReferenceSection,
                                       IndicatorVault)
    drills/                           (DrillsIndex + Drill3_1..3_9)
    simulator/                        (SimulatorShell)
    hard-sentences/                   (HardSentencesIndex + Decomposer)
    diagnostics/                      (Index, Philosophy, Dashboard,
                                       Recommendations, RrReview,
                                       TraitProfile, MistakeProfile, SrsQueue)
    journal/                          (Journal)
    settings/                         (Settings)
  content/                            (8 *.source.ts: lessons, drills, refs,
                                       named-tools, indicators, traps, simulator,
                                       hard-sentences, m5-capstone, schemas)
  data/                               (11 *.generated.json — lessons,
                                       calibration, MCFIRST/DOCX extracts,
                                       manifest with 86 entries)
  hooks/                              (useUser, useModuleProgress, useDiagnostics)
  lib/                                (cn, ids, ordering, srs, diagnostics,
                                       ai-templates/whimsical-evaluator + tests)
  persistence/                        (Persistence interface, LocalStorage,
                                       IndexedDB, V1 composite, factory, records)
  styles/                             (scoped.css ← namespaced under .mc-bootcamp,
                                       tokens.css + base.css preserved as legacy)
  types/                              (source-slots)
  routes.tsx                          (BootcampRoutes — nested <Routes/>)

src/pages/MainConclusionBootcamp.tsx  ← LSAT U page wrapper (auth + namespace
                                       div + <BootcampRoutes/>)

scripts/main-conclusion/              ← Build pipeline (do NOT overwrite root scripts/)
  import-content.ts
  extract-mcfirst.ts                  (pdfjs-dist; not currently wired
                                       into LSAT U build)
  extract-docx.ts                     (mammoth)
  wire-calibration-stimuli.ts
  parity-route-check.ts
  vite-plugin-parity-check.ts
  __smoke__/                          (smoke artifacts)

docs/main-conclusion-bootcamp/        ← Project history (do NOT overwrite root docs/)
  BRIDGE_HANDOFF.md                   ← THIS FILE
  CLAUDE-bootcamp.md                  (was CLAUDE.md in standalone repo)
  PROJECT_MEMORY.md                   (running working doc; 17 Rules Learned)
  MAIN_CONCLUSION_HANDOFF.md          (the original 11-section control doc)
  architecture-plan.md                (Gate 3 deliverable; 10 sections)
  gate-1-open-questions.md
  gate-4-lesson-1.1-handoff.md
  gate-5-audit.md                     (pre-merge audit checklist)
  m4-seed-request.md                  (Phase D unblock — author 2 distractor sets)
  reference-study.md                  (Linear, Readwise, Superhuman, Anki, etc.)
  parity/
    CONTENT_INVENTORY.{json,md}       (Table A: 173 entries)
    CONTENT_PARITY_MAP.{json,md}      (id → source → route → component)
    NOT_INCLUDED_IN_V1.md             (Table B: drops/deferrals)
    README.md
```

### LSAT U files modified by the bridge (only these 5)

| File | Change |
|---|---|
| `src/App.tsx` | +1 import (`MainConclusionBootcamp`), +1 route (`/bootcamp/structure-v2/*` with `ProtectedRoute(has_bootcamp_access)`) |
| `src/pages/Bootcamps.tsx` | +1 card object (`structure-v2` with `PREVIEW` badge), badge render block; existing Structure card unchanged |
| `src/index.css` | +1 `@import` line for `bootcamps/main-conclusion/styles/scoped.css` |
| `tailwind.config.ts` | Additive extends only (mc-accent, bg, surface, ink, role-*, font sizes h1–h3 / body-prose / mono / label, font families mc-sans/serif/mono, radii numeric, screens phone/tablet/desktop, eased timing). **No existing token modified.** |
| `package.json` | +1 dep: `idb: ^8.0.0` |

### LSAT U files preserved (zero changes)

- `src/pages/Structure.tsx` (the live 8-module guided bootcamp)
- `src/components/structure/**` (Simulator.tsx, blocks.tsx, data.ts)
- `src/pages/CausationStation.tsx`
- `src/pages/Abstraction.tsx`
- All other `src/pages/*`, `src/components/**`

---

## Routes

| URL | Component | Status |
|---|---|---|
| `/bootcamps` | `pages/Bootcamps.tsx` | Modified — fourth card added |
| `/bootcamp/structure` | `pages/Structure.tsx` | **Unchanged** — live 8-module bootcamp |
| `/bootcamp/structure-v2/*` | `pages/MainConclusionBootcamp.tsx` → `BootcampRoutes` | **NEW** — preview surface |
| `/bootcamp/main-conclusion-role` | `Navigate to="/bootcamp/structure"` | Unchanged |
| `/bootcamp/causation-station` | `pages/CausationStation.tsx` | Unchanged |
| `/bootcamp/abstraction` | `pages/Abstraction.tsx` | Unchanged |

### Bootcamp internal routes (under `/bootcamp/structure-v2/`)

```
/                                     ← ModuleIndex
/lessons                              ← LessonsIndex
/lessons/1.1 ... /lessons/1.12        ← Lesson
/lessons/1.13                         ← CapstoneRoute (M1 capstone, correct-only mode)
/reference                            ← ReferenceIndex
/reference/indicators                 ← IndicatorVault (full UI)
/reference/2-part-check               ← ReferenceSection (authored body)
/reference/fabs                       ← ReferenceSection
/reference/stimulus-tendencies        ← ReferenceSection
/reference/conclusion-types           ← ReferenceSection
/reference/rebuttal-structure         ← ReferenceSection
/reference/three-traps                ← ReferenceSection
/reference/pronoun-library            ← ReferenceSection
/reference/concession-decoder         ← ReferenceSection
/reference/quick-card                 ← ReferenceSection (printable)
/reference/companion-mode             ← ReferenceSection
/reference/named-tools                ← ReferenceSection
/reference/named-tools/:toolId        ← NamedToolEntry
/drills                               ← DrillsIndex
/drills/3.1 ... /drills/3.9           ← Drill3_X engines
/simulator                            ← SimulatorOverview (locked behind drill 3.4)
/simulator/bank                       ← QuestionBank (locked)
/simulator/trap-master                ← TrapMaster (locked)
/simulator/trap-master/:traitId       ← TraitDeepDive (locked)
/simulator/answer-key-views           ← QuestionBank (locked)
/simulator/hard-mode                  ← HardMode (locked)
/hard-sentences                       ← HardSentencesIndex
/hard-sentences/5.1 ... /5.7          ← HardSentenceSection (M5 bodies)
/hard-sentences/capstone              ← M5 capstone (5 cluster-decomposition MCQs)
/diagnostics                          ← DiagnosticsIndex
/diagnostics/philosophy               ← Philosophy
/diagnostics/dashboard                ← Dashboard (rings + heatmap + seed)
/diagnostics/recommendations          ← Recommendations (rule-based engine)
/diagnostics/rr-review                ← RrReview
/diagnostics/trait-profile            ← TraitProfile
/diagnostics/mistake-profile          ← MistakeProfile
/diagnostics/srs                      ← SrsQueue (SM-2)
/journal                              ← Journal
/settings                             ← Settings (export-all + reset)
```

---

## What's wired vs what's stub

### Fully shipped (Phase A–C, E–G)

- ✓ M1 Lessons 1.1–1.12 — authored, voice-locked Register 2
- ✓ M2 Reference 2.A–2.K — 11 sections authored Register 1
- ✓ M3 Drills — all 9 drill engines wired with Stage 1 sample content; Drill 3.4 unlock cascade end-to-end tested
- ✓ M5 Hard Sentences 5.1–5.8 — 7 sections + Cluster Decomposer + 5×4 MCQ capstone
- ✓ M6 Diagnostics — 7 surfaces wired to live persistence, SM-2 SRS algorithm, rule-based recommendations
- ✓ Cross-cutting: AI Tutor (template-routed), Smart Hints, Cmd+K palette, Journal, Settings (export + reset)
- ✓ Auth bridge — `useAuth().user.id` keys persistence
- ✓ CSS scope — `.mc-bootcamp` namespace, zero leakage to LSAT U
- ✓ Pipeline — 86 manifest entries, 0 drift; DOCX OCR for 12 calibration items captured

### Pending content (Phase D + drill expansion)

- **Phase D — M4 Simulator distractors (BLOCKED on Joshua seeds)**
  - 80 distractors need authoring (4 wrong × 20 questions). See `docs/main-conclusion-bootcamp/m4-seed-request.md`.
  - Joshua provides 2 ground-truth seed sets (MC-SIM-Q11 Rebuttal + MC-SIM-Q20 wildcard); Claude scales to 80.
  - Then: 20 Coach's Notes, Trap Master deep-dive worst-case examples (3 per trait × 7), Hard Question Mode wiring.
- **Drills 3.1–3.4 Stages 2/3/4** — engine handles all 4 stages; only Stage 1 has 5 sample questions per drill. Stages 2–4 are stubbed.
- **Drill 3.4 Stage 4** — should reuse canonical 20 stimuli (per G2.DRL-3.4); content wire pending.
- **Drill 3.6** — additional whimsical premise pairs beyond the 3 currently authored.
- **Drill 3.8 Stages 4–6** — Cumulative recall, Full recollection, Final restate.
- **Drill 3.9** — OCR-source vs hand-authored fallback decision per G2.OCR.
- **R&R audio playback** — blob storage for `rr_recordings`. UI surface is built; playback wires when blob endpoint lands.

### Deferred to v1.5 (logged in `gate-5-audit.md`)

- LLM-backed AI Tutor (lazy-load gate already in `lib/ai-templates/whimsical-evaluator.ts`)
- transformers.js MiniLM evaluator for Drill 3.6 (~50 MB model; bundle gate not yet pulled)
- Light-mode theme for the bootcamp (currently dark-only)
- Lighthouse audit (manual fast-follow)
- Markdown rendering in Journal (currently plain text)

---

## How to continue developing in Claude Code

### Start a session with full context

The bootcamp source of truth is now `src/bootcamps/main-conclusion/` inside the LSAT U repo. Open Claude Code in `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u-current/` and the agent has access to:

- The bootcamp at `src/bootcamps/main-conclusion/`
- Project history at `docs/main-conclusion-bootcamp/PROJECT_MEMORY.md` (running working doc, 17 Rules Learned)
- The original handoff at `docs/main-conclusion-bootcamp/MAIN_CONCLUSION_HANDOFF.md`
- The architecture plan at `docs/main-conclusion-bootcamp/architecture-plan.md`
- The gate-5 audit at `docs/main-conclusion-bootcamp/gate-5-audit.md`
- The M4 seed request at `docs/main-conclusion-bootcamp/m4-seed-request.md`
- The build scripts at `scripts/main-conclusion/`

**Recommended first action in a new session:** read `BRIDGE_HANDOFF.md` (this file) + `PROJECT_MEMORY.md`. They restate the 7-point understanding, gate state, and Rules Learned.

### Editing rules (per CLAUDE-bootcamp.md)

1. Curriculum corpus is the product. Beautiful app + lost questions = failed build.
2. No reviewed source content silently dropped.
3. Persistence is adapter-pattern (`Persistence` interface). Never write to localStorage / IndexedDB / Supabase directly.
4. Joshua edits are authoritative — surface a `JOSHUA OVERRIDE` callout + log to Decisions Log on every edit.
5. Quality bar matches Causation Station + Abstraction.
6. 21st.dev MCP for primitives only. Linear / Readwise / Superhuman / UWorld / Anki / Causation Station / Abstraction for layouts.
7. Voice registers preserved: Register 1 (decisive) for procedural surfaces; Register 2 (whimsical) for narrative surfaces.

### Build / run / test

```bash
cd /Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u-current

# Dev server (ports 8080-ish per Vite default config)
npm run dev

# Production build (PWA, full bundle)
npx vite build

# Typecheck only
npx tsc --noEmit

# Bootcamp content pipeline (regenerates 5 *.generated.json)
npx tsx scripts/main-conclusion/import-content.ts
# (Not in npm scripts. Add `"import:mc": "tsx scripts/main-conclusion/import-content.ts"`
#  to root package.json if Joshua wants it as a project script.)

# DOCX OCR
npx tsx scripts/main-conclusion/extract-docx.ts "<path-to-.docx>"

# MCFIRST PDF extract
npx tsx scripts/main-conclusion/extract-mcfirst.ts

# Calibration stimulus wire-up (one-shot)
npx tsx scripts/main-conclusion/wire-calibration-stimuli.ts

# Route parity check
npx tsx scripts/main-conclusion/parity-route-check.ts
```

**Caveat:** the bootcamp's vitest tests (17 passing) live in `src/bootcamps/main-conclusion/lib/__tests__/` and `lib/ai-templates/__tests__/`. LSAT U does not currently have vitest installed. If you want CI to run these tests, add `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` to `package.json` devDependencies and add a `"test": "vitest run"` script.

### Voice rules — preserved

- **Register 1** (decisive, verdict-style, procedural): Reference, Question Simulator, drill instructions, Diagnostics verdicts, AI Tutor.
- **Register 2** (whimsical, parodic, metaphor-led): Lessons, drill setup prose, Hard Sentences narrative sections, Diagnostics philosophy.
- Tighten ALL-CAPS. Cap confidence-calibration phrasing to once per module. Never rewrite Joshua's voice into generic editor tone.

### Path-alias rules

After the bridge, all bootcamp code uses **fully-qualified `@/bootcamps/main-conclusion/...`** imports. The bootcamp's `routes.tsx` was rewritten from `createBrowserRouter` to `<Routes>` JSX with relative paths nested under the parent route. **Don't add `@/` shortcuts that point inside the bootcamp namespace** — keep the prefix explicit so promotion to a different parent path is a single sed pass.

### Class-name rules

Bootcamp Tailwind classes that conflict with LSAT U have an `mc-` prefix:
- `text-accent` → `text-mc-accent`
- `bg-accent` → `bg-mc-accent`
- `border-accent` → `border-mc-accent`
- `text-success` → `text-mc-success` (and warn/error/info)
- `font-sans` → `font-mc-sans` (and serif/mono)

Bootcamp-only Tailwind classes that are unique (no LSAT U collision) live unprefixed:
- `bg-bg`, `bg-bg-2`, `bg-surface`, `bg-surface-elev`
- `text-ink`, `text-ink-soft`, `text-ink-faint`
- `text-role-conclusion`, `bg-role-premise`, etc.
- `text-h1`, `text-h2`, `text-h3`, `text-body-prose`, `text-mono`, `text-label`, `text-display`
- `rounded-2`, `rounded-3`, `rounded-5`, `rounded-8`
- `phone:`, `tablet:`, `desktop:` breakpoint variants
- `ease-eased` timing function
- `duration-150`, `duration-180`, `duration-220`

These all resolve correctly only inside `.mc-bootcamp` (the CSS vars they reference are scoped).

---

## Auth + persistence

### Auth bridge

The bootcamp's `useUser` hook (`src/bootcamps/main-conclusion/hooks/useUser.ts`) now:
1. Calls LSAT U's `useAuth()` to get the Supabase user
2. Projects `auth.user` → bootcamp's `User` Zod schema (id = Supabase UUID, name from `user_metadata.display_name` / `username` / email fallback)
3. Persists the projected `User` row in the bootcamp's persistence layer (LocalStorage + IndexedDB)
4. Returns `null` while auth is loading or if no user

Auth gating happens in `pages/MainConclusionBootcamp.tsx`: `useEffect(() => { if (!loading && !user) navigate('/auth') })`. Same pattern as `Structure.tsx` and `CausationStation.tsx`.

### Persistence

- Stack: LocalStorage (KV scalar records) + IndexedDB (blobs + bulky drill artifacts) via the `idb` library
- Factory at `src/bootcamps/main-conclusion/persistence/factory.ts` — keyed on Supabase UUID
- All 13 record schemas in `persistence/records.ts` — Zod-validated (User, ModuleProgress, LessonProgress, PrefsUser, SimulatorAttempt, DrillStageGate, TrapsTag, MistakesProfile, SrsQueueItem, RrRecording, RrReview, JournalEntry, CalibrationAttempt)
- **No Supabase writes.** LSAT U absorption to Supabase is a future phase — change `factory.ts` to return a `SupabasePersistence` and nothing else moves.

### Module-progress derivation

Per-user progress row id is deterministic via FNV-1a hash of `user.id` (see `useModuleProgress.ts:progressIdFor`). One stable row per user; never collides because the table key already partitions by user.

---

## Style scoping

All bootcamp tokens (`--accent`, `--ink`, `--role-*`, motion, type scale) are defined in `src/bootcamps/main-conclusion/styles/scoped.css` under the `.mc-bootcamp` selector. The wrapper element in `pages/MainConclusionBootcamp.tsx` applies `className="mc-bootcamp min-h-screen"`.

**Result:** Bootcamp styles only resolve inside `.mc-bootcamp` ancestors. LSAT U's design system is unaffected.

The bootcamp surface stays dark-only even when LSAT U's theme toggle is in light mode — by design (per spec).

---

## Promotion path: `/bootcamp/structure-v2` → `/bootcamp/structure`

When ready (after Phase D + Joshua's M1 voice review):

1. **Sed across the bootcamp source** — rewrite `/bootcamp/structure-v2` → `/bootcamp/structure`:
   ```bash
   cd src/bootcamps/main-conclusion
   find . -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | \
     xargs -0 perl -i -pe 's|/bootcamp/structure-v2|/bootcamp/structure|g'
   ```
2. **Edit `src/App.tsx`** — swap the `/bootcamp/structure-v2/*` route to `/bootcamp/structure/*` (and remove or archive the old `<Structure />` route).
3. **Decide on `Structure.tsx` + `src/components/structure/**`** — archive (move to `src/_archived/structure/`) or delete. **Do not delete without Joshua approval.**
4. **Update `src/pages/Bootcamps.tsx`** — remove the v2 card and update the existing Structure card description to point at the new bootcamp.
5. **Re-run typecheck + build + parity-route-check.**
6. **Push to main.**

Estimated promotion: 30 minutes including review.

---

## Known risks / caveats

| Risk | Mitigation |
|---|---|
| **Class-rewrite blind spots.** ~600 utility classes were renamed via Perl regex. If a class slipped through, an element renders unstyled inside `.mc-bootcamp`. | Spot-check `/bootcamp/structure-v2` and its sub-routes after first deploy. |
| **Service worker / PWA cache** holds the old asset hashes; existing students may see stale UI for up to 24 h. | First-load on Lovable preview is fresh. For prod, Workbox `skipWaiting` is in the existing config; auto-updates within an hour. |
| **Auth user_metadata shape** — projection assumes `display_name` / `username` keys; falls back to `email` then `'Student'`. | If projection misnames users, fix in `useUser.ts:55-58`. |
| **Bundle warnings** for chunks > 500 KB. None are bootcamp-attributable (Spline, mermaid, jspdf, html2canvas). | Code-split deferred — not gating ship. |
| **Vitest not installed in LSAT U.** The bootcamp's 17 unit tests don't run in CI. | Optional — add `vitest` to devDependencies if desired. |
| **idb 8.0.3 was added.** New runtime dep, well-maintained. | Verified resolves cleanly. |
| **PWA precache adds ~150 KB** for bootcamp data files. | Acceptable. First load slightly slower, subsequent loads instant. |
| **Lovable AI editor edits hit `main` directly.** | Prefer Claude Code on a feature branch for bootcamp edits to preserve clean authorship. The `.mc-bootcamp` namespace makes ownership obvious. |
| **Mr. Tannisch orphan stimulus** parked OQ. | Surface at Phase D start. |
| **All 12 calibration items captured but not Joshua-reviewed.** Stimuli came from DOCX OCR (mammoth) — heuristic match for M5; Q1-Q7 deterministic for M1. | Joshua to review during M1.13 walkthrough. |

---

## Joshua deliverables still pending

| Item | Where | Unblocks |
|---|---|---|
| **M1 batch review** | Walk Lessons 1.1–1.12 in the running app | Voice lock for all subsequent prose |
| **M4 seeds** | `docs/main-conclusion-bootcamp/m4-seed-request.md` — author 2 distractor sets | Phase D execution (80-distractor batch) |
| **G1.4** | Causation Station + Abstraction URLs | UX refinements for AI Tutor surface |
| **G3.UX-RESEARCH** | UX/UI Deep Research packet | Surface-level polish |
| **Promotion go/no-go** | After Gate 5 walkthrough | Promotion of v2 → main slot |

---

## Direct path to v1 production

```
1. Lovable auto-deploys main → preview URL goes live (1–3 min)
2. Joshua walks /bootcamps + /bootcamp/structure-v2 end-to-end
3. Joshua provides M4 seeds (m4-seed-request.md)
4. Phase D executes (Claude) → 80 distractors + Coach's Notes + Trap Master examples
5. Joshua batch-reviews distractors → joshua-reviewed → locked
6. Gate 5 walkthrough (gate-5-audit.md checklist)
7. Promote /bootcamp/structure-v2 → /bootcamp/structure
8. v1 ships
```

---

## Commit + branch trail

```
b8331cf  (HEAD -> main, origin/main)  Merge: Main Conclusion bootcamp preview at /bootcamp/structure-v2
5242d0b  (feat/bootcamp-main-conclusion-bridge)  feat: Main Conclusion bootcamp preview at /bootcamp/structure-v2
c9ff3cd  Redesign Structure bootcamp as guided 8-module flow              ← Pre-bridge main HEAD
52931e1  Replaced Main Conclusion w/ Structure
```

Feature branch `feat/bootcamp-main-conclusion-bridge` is **preserved locally** (not pushed to origin). Push it if you want a branch-level Lovable preview deploy:
```bash
cd /Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u-current
git push -u origin feat/bootcamp-main-conclusion-bridge
```

---

## Project memory + decisions log

The bootcamp's `PROJECT_MEMORY.md` (now at `docs/main-conclusion-bootcamp/PROJECT_MEMORY.md`) carries:
- Status header (current gate)
- Decisions Log (every approved decision with date + rationale)
- 17 Rules Learned (cross-cutting rules — Rule 14 = Joshua edits authoritative; Rule 17 = recommendation format)
- Lessons For Next Topic Project (template observations)
- Build Progress per gate

**Update protocol when continuing:**
- Append to Decisions Log on every approved decision (don't edit historical rows)
- Update Status header on every gate close
- Add to Rules Learned whenever a pattern emerges
- Add to Lessons For Next Topic Project whenever something would have saved a round trip

---

## Contact + ownership

- **Joshua F.** — contact@aspiringattorneys.com — product owner, voice authority, content authority
- **Claude Code (Opus 4.7, 1M context)** — primary builder
- **Lovable** — deploy/preview/edit surface, syncs from `main`
- **GitHub** — source of truth (`https://github.com/vnjkoxpl-42905/lsatu-684d89db`)

---

## Final state at handoff

| Surface | State |
|---|---|
| `/bootcamp/structure` (live) | Untouched — 8-module guided bootcamp |
| `/bootcamp/structure-v2` (preview) | Live, in active development |
| `main` branch on origin | Up to date — `b8331cf` |
| Feature branch | `feat/bootcamp-main-conclusion-bridge` preserved locally |
| Lovable | Auto-syncs from main |
| Build | ✓ |
| Typecheck | ✓ |
| All four pre-existing bootcamps | Unchanged |

End of handoff.

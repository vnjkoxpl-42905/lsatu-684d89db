# WORKSPACE MAP — Main Conclusion Bootcamp
> Generated: 2026-05-01 | Repo: lsatu-684d89db | For: ChatGPT / cross-agent handoff

---

## 1. Active Working Directory

```
/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u-current
```

> **Critical:** Always start sessions from `lsat-u-current`, not from inside `docs/main-conclusion-bootcamp/` or any subdirectory.

---

## 2. Git Branch

```
main
```

---

## 3. Latest Commit SHA

```
2767e80e8c71802f0fcab537d4b38e364ed90cfc
```

Remote origin: `https://github.com/vnjkoxpl-42905/lsatu-684d89db.git`

---

## 4. Git Status Summary

Working tree clean at time of map generation. No staged or unstaged changes.

---

## 5. Source-of-Truth Folders

| Path | Role |
|---|---|
| `src/bootcamps/main-conclusion/` | All bootcamp runtime source (components, modules, content, data, hooks, lib, persistence, routes) |
| `docs/main-conclusion-bootcamp/` | All planning docs, handoffs, parity maps, gate docs, architecture notes |
| `scripts/main-conclusion/` | Build-time scripts: extraction, import, parity checks, calibration wiring |
| `src/pages/MainConclusionBootcamp.tsx` | Top-level page component; mounts the bootcamp into the LSAT U app shell |
| `src/App.tsx` | Root router; registers the `/bootcamp/main-conclusion` route |
| `src/pages/Bootcamps.tsx` | Bootcamp index page; shows the card/entry point for this bootcamp |

---

## 6. Compact Folder Trees

### `src/bootcamps/main-conclusion/`

```
src/bootcamps/main-conclusion/
├── App.tsx                          # Bootcamp-scoped router root
├── routes.tsx                       # Route definitions for all modules
├── components/
│   ├── ai-tutor/                    # AI Tutor panel + prompt templates
│   ├── argument-structure-map/      # CakeOnBlocks visual
│   ├── cluster-decomposer/          # ClusterDecomposer interactive
│   ├── coachs-note/                 # CoachNoteCard
│   ├── command-palette/             # CommandPalette
│   ├── primitives/                  # Badge, Button, Card, Chip, Input, Modal, Toggle, Tooltip, etc.
│   ├── question/                    # QuestionCard
│   ├── smart-hints/                 # SmartHints + hints data
│   ├── stage-gate/                  # StageGateTracker
│   ├── trap-master/                 # TraitDeepDive, TraitTag
│   ├── workspace-shell/             # LeftRail, RightDrawer, WorkspaceShell, LockedRoute
│   └── x-ray-scan/                  # XRayScanToggle
├── content/                         # Source data files (.source.ts) — human-authored content
│   ├── drills.source.ts
│   ├── hard-sentences.source.ts
│   ├── indicators.source.ts
│   ├── m5-capstone.source.ts
│   ├── named-tools.source.ts
│   ├── references.source.ts
│   ├── schemas.ts                   # Zod schemas for all content types
│   ├── simulator.source.ts
│   └── traps.source.ts
├── data/                            # Generated JSON artifacts (output of scripts)
│   ├── lessons.generated.json
│   ├── manifest.generated.json
│   ├── calibration.generated.json
│   ├── indicator-vault.generated.json
│   ├── named-tools.generated.json
│   ├── references.generated.json
│   ├── simulator.generated.json
│   ├── traps.generated.json
│   ├── mcfirst.extracted.json
│   ├── main_conclusion_student_dup1.extracted.json
│   └── Cluster-Sentences-Review.extracted.json
├── hooks/                           # useDiagnostics, useModuleProgress, useUser
├── lib/                             # cn, diagnostics, ids, ordering, srs + tests
│   ├── ai-templates/                # whimsical-evaluator + tests
│   └── __tests__/
├── modules/                         # Feature modules by nav section
│   ├── diagnostics/                 # Dashboard, MistakeProfile, Philosophy, Recommendations, RrReview, SrsQueue, TraitProfile
│   ├── drills/                      # Drill3_1 through Drill3_9 + DrillsIndex
│   ├── hard-sentences/
│   ├── journal/
│   ├── lessons/                     # Lesson, LessonsIndex, Capstone
│   ├── reference/                   # IndicatorVault, ReferenceIndex, ReferenceSection
│   ├── settings/
│   ├── simulator/
│   ├── ModuleIndex.tsx
│   └── Placeholder.tsx
├── persistence/                     # IndexedDB + LocalStorage adapters, factory, records
├── styles/                          # base.css, print.css, scoped.css, tokens.css
└── types/
    └── source-slots.ts
```

### `docs/main-conclusion-bootcamp/`

```
docs/main-conclusion-bootcamp/
├── WORKSPACE_MAP.md                 # THIS FILE
├── BRIDGE_HANDOFF.md                # Cross-session bridge notes
├── CLAUDE-bootcamp.md               # Claude Code working instructions for this bootcamp
├── MAIN_CONCLUSION_HANDOFF.md       # Primary handoff doc
├── PROJECT_MEMORY.md                # Running memory / state log
├── architecture-plan.md             # Original architecture decisions
├── gate-1-open-questions.md         # Gate 1 blockers
├── gate-4-lesson-1.1-handoff.md     # Gate 4 lesson handoff
├── gate-5-audit.md                  # Gate 5 audit log
├── m4-seed-request.md               # Module 4 seed content request
├── reference-study.md               # Reference material
├── scaffolding-plan.md              # Scaffolding decisions
├── chat-export/
│   ├── full-session.jsonl
│   ├── readable-transcript.md
│   └── extract-readable.mjs
└── parity/
    ├── README.md
    ├── CONTENT_INVENTORY.json
    ├── CONTENT_INVENTORY.md
    ├── CONTENT_PARITY_MAP.json
    ├── CONTENT_PARITY_MAP.md
    └── NOT_INCLUDED_IN_V1.md
```

### `scripts/main-conclusion/`

```
scripts/main-conclusion/
├── extract-docx.ts                  # Extracts raw content from source .docx files
├── extract-mcfirst.ts               # Extracts MC-First question set
├── import-content.ts                # Imports extracted JSON into data/
├── parity-route-check.ts            # Verifies all content routes have matching files
├── vite-plugin-parity-check.ts      # Vite plugin wrapper for parity check at build time
├── wire-calibration-stimuli.ts      # Wires calibration stimuli into calibration.generated.json
└── __smoke__/
    ├── dump-mcfirst.ts
    ├── mcfirst.extracted.json
    └── ap-answer-key.extracted.json
```

---

## 7. Key Files and What Each Controls

| File | Controls |
|---|---|
| `src/bootcamps/main-conclusion/routes.tsx` | All URL routes within the bootcamp; add/remove modules here |
| `src/bootcamps/main-conclusion/App.tsx` | Bootcamp-level router; wraps WorkspaceShell around all module routes |
| `src/bootcamps/main-conclusion/content/schemas.ts` | Zod schemas; changing these breaks generated JSON validation |
| `src/bootcamps/main-conclusion/data/manifest.generated.json` | Module/lesson manifest consumed by LessonsIndex and nav |
| `src/bootcamps/main-conclusion/data/lessons.generated.json` | All lesson content served to Lesson.tsx |
| `src/bootcamps/main-conclusion/persistence/factory.ts` | Selects IndexedDB vs LocalStorage adapter; controls all persistence |
| `src/bootcamps/main-conclusion/persistence/records.ts` | Defines all persisted record types |
| `src/bootcamps/main-conclusion/lib/srs.ts` | Spaced-repetition scheduling logic |
| `src/bootcamps/main-conclusion/lib/ordering.ts` | Question and drill ordering logic |
| `src/pages/MainConclusionBootcamp.tsx` | Mounts the bootcamp into the LSAT U app shell; handles auth gate |
| `src/App.tsx` | Root router; `/bootcamp/main-conclusion` route lives here |
| `src/pages/Bootcamps.tsx` | Bootcamp directory card; entry point visible to logged-in users |
| `docs/main-conclusion-bootcamp/parity/CONTENT_PARITY_MAP.md` | Human-readable map of every content item vs. implementation status |
| `scripts/main-conclusion/parity-route-check.ts` | Automated parity enforcement; fails build if routes diverge |

---

## 8. Local-Only Files (Not Pushed)

| File | Reason |
|---|---|
| `.env` | Supabase URL + anon key; gitignored, must be present for `vite dev` |
| `.claude/settings.local.json` | Claude Code personal overrides; explicitly gitignored |
| `node_modules/` | npm install artifacts; gitignored |
| `dist/` | Build output; gitignored |

---

## 9. Environment / Config Files (Names Only)

```
.env
.env.example
eslint.config.js
playwright.config.ts
postcss.config.js
tailwind.config.ts
tsconfig.json
tsconfig.app.json
tsconfig.node.json
vite.config.ts
vitest.config.ts
```

No values are listed here. Never commit `.env`.

---

## 10. Build Commands

```bash
# Install dependencies
npm install

# Type-check only (no emit)
npx tsc --noEmit

# Production build
npx vite build
```

Dev server: `npm run dev` (Vite, port 5173 by default).
Tests: `npx vitest run` (unit) | `npx playwright test` (e2e).

---

## 11. Known Risks and Current Unfinished Work

| Item | Status / Risk |
|---|---|
| Generated JSON files are committed | `data/*.generated.json` are in the repo; must re-run scripts after any `.source.ts` edit or content will drift |
| `strict: false` in tsconfig | Type safety not enforced at compile time; schema drift can survive silently (mirrors LSAT U main audit risk F2.13) |
| No CI pipeline | No automated type-check or test gate on push; regressions can reach main |
| Parity map is partially manual | `CONTENT_PARITY_MAP.md` may lag behind actual implementation; verify with `parity-route-check.ts` |
| Gate 5 audit incomplete | `gate-5-audit.md` documents open items; some module stubs remain as `Placeholder.tsx` |
| Persistence layer untested at scale | IndexedDB adapter has no integration test coverage; data loss risk on schema change |
| `.env` required locally | New machines need `.env.example` filled in; no setup script exists |

---

## 12. Instruction for Future Claude Code Sessions

> **Start from `lsat-u-current`, not `main-conclusion-bootcamp`.**
>
> Every Claude Code session must open with:
> ```
> cd /Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u-current
> git pull
> ```
> Do not `cd` into `docs/main-conclusion-bootcamp/` or `src/bootcamps/main-conclusion/` as your working root. All git operations, file writes, and script executions must run from `lsat-u-current`. Subdirectory paths are always relative to this root.

---

*This file is committed and repo-visible. Update it whenever major structural changes land.*

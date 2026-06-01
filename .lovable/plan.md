## Goal

Replace the current Intro to LR drill list (3.1 Indicator Recognition, 3.2 Structure Reading, 3.3 First-Sentence, 3.4 Rebuttal, 3.7 Pronoun Replacement) with a clean 5-step student-facing sequence, built natively in LSAT U's design system using mechanics from the reference HTML bootcamps in `public/references/bootcamps/`.

The Lessons (1.x notes) and Reference/Indicator Vault/Flashcards/Simulator/Hard-Sentences/Diagnostics surfaces are **out of scope** — untouched.

## New drill sequence

| # | Slug | Title | Source ref | Mechanic |
|---|------|-------|------------|----------|
| 1 | `main-conclusion-lab` | Main Conclusion Lab | `introconclusiondrill/index.html` | 20-question click-the-main-conclusion. Wrong → hint. Right → reveal role map. |
| 2 | `argument-structure-lab` | Argument Structure Lab | `structuredrill/index.html` | Multi-step: select MC → classify First-sentence vs Rebuttal → select supporting claim / opposing viewpoint. |
| 3 | `structure-classification` | First-Sentence vs Rebuttal | `structuredrill/index.html` | Focused classification reps (subset of #2's classifier step). |
| 4 | `x-ray-review` | X-Ray Review Mode | `lrfoundational/index.html` | Stock Analysts X-Ray, Concession/Pivot X-Ray, role reveal — demo/review interactions. |
| 5 | `mixed-structure-check` | Final Mixed Structure Check | `structuredrill/index.html` | Capstone mixed reps before unlocking Simulator. **Gates simulator** (replaces old 3.4 gate). |

`arguments/index.html` ("Arguments Foundations") is **only** used for small in-lesson micro-interactions (Claim Bucket Inspector, Trojan Horse / HOWEVER reveal, Referential / FABS hover). Those are not core drills and are not added in this pass — noted as a follow-up.

## Files to create

```
src/bootcamps/main-conclusion/content/
  newDrills.source.ts         # Extracted question banks for all 5 drills (TS, typed)

src/bootcamps/main-conclusion/components/interactive-drills/
  ClickConclusionRunner.tsx   # Mechanic for drills 1 & 2 step-1 & 4 reveal
  StructureFlowRunner.tsx     # 3-step flow for drill 2 (MC → class → support)
  ClassifierRunner.tsx        # Reuse StructureClassifier for drill 3
  XRayReviewRunner.tsx        # Annotated reveal-style review for drill 4

src/bootcamps/main-conclusion/modules/drills/
  MainConclusionLab.tsx        # drill 1
  ArgumentStructureLab.tsx     # drill 2
  StructureClassification.tsx  # drill 3
  XRayReview.tsx               # drill 4
  MixedStructureCheck.tsx      # drill 5 (gates simulator)
```

## Files to edit

- `src/bootcamps/main-conclusion/modules/drills/DrillsIndex.tsx` — rewrite `DRILLS` array + `GROUPS` to the new 5 entries; new routes & ids (`MC-DRL-MCL`, `MC-DRL-ASL`, `MC-DRL-CLS`, `MC-DRL-XRY`, `MC-DRL-MIX`); `MC-DRL-MIX` gets `gates_simulator: true`.
- `src/bootcamps/main-conclusion/modules/drills/DrillShell.tsx` — switch on new slugs (`main-conclusion-lab` etc) and render the new lab components. Keep old `3.1`/`3.2`/`3.3`/`3.4`/`3.5`/`3.6`/`3.7`/`3.8`/`3.9` slugs as **silent redirects** to the new lab nearest in purpose so no in-product links break.
- `src/bootcamps/main-conclusion/lib/runner.ts` (if it lists drill ids) — update completion order to the new ids.
- `src/bootcamps/main-conclusion/lib/` simulator-gate check — switch the gating drill id from `MC-DRL-3.4` to `MC-DRL-MIX`.
- IntegratedPathRail / NewGuidedIntro (if they reference old drill ids/titles) — point to new slugs only where the rail currently shows the old drill names. Lessons untouched.

## Files to delete (after rail is repointed)

- `Drill3_1.tsx`, `Drill3_2.tsx`, `Drill3_3.tsx`, `Drill3_4.tsx`, `Drill3_5.tsx`, `Drill3_6.tsx`, `Drill3_7.tsx`, `Drill3_8.tsx`, `Drill3_9.tsx` — no longer reachable from the menu. (Question content is migrated into `newDrills.source.ts` first so nothing is lost.)

## Content extraction approach

Each `public/references/bootcamps/*/index.html` is parsed once with a node script to pull stimulus text, claim spans, MC indices, classifier labels, hint text, and reveal annotations into typed TS arrays in `newDrills.source.ts`. The static HTML files themselves stay in place (kept as design references) but **none of their CSS or class names ship into the app** — all new components use LSAT U / mc-bootcamp tokens (`Button`, `Card`, `Badge`, `PageHeader`, `font-mc-serif`, `text-ink`, etc.).

## Design system rules

- Reuse: `Button`, `Card`, `Badge`, `PageHeader`, `InteractiveDrillRunner` scaffolding, `StructureClassifier`.
- Tailwind tokens only; no raw hex; no imports from `public/references/...` CSS.
- Existing `.mc-bootcamp` scoped styling continues to wrap via the `IntroToLrBootcamp` wrapper.
- Mobile: 16px+ inputs, bottom-sheet patterns where existing drills use them.

## Progress / completion

- New drill ids registered in `useModuleProgress` ledger via the same `markDrillComplete(id)` calls used by current drills.
- Simulator gate updated so completing `MC-DRL-MIX` unlocks `/bootcamp/intro-to-lr/simulator`.
- Path rail "next step" logic continues to work via the rewritten `DRILLS` array order.

## Verification

1. `npm run build` — must pass.
2. Manually walk `/bootcamp/intro-to-lr/drills` → each of the 5 new cards opens and completes.
3. Old URLs `/drills/3.1` … `/drills/3.9` redirect silently to a current lab.
4. Simulator stays locked until `MC-DRL-MIX` is complete, then unlocks.
5. No "3.1 / 3.2 / 3.4 / 3.7" labels visible anywhere in the main student path (rail, drills hub, breadcrumbs).

## Out of scope

- Lesson notes (`/lessons/notes/*`).
- Reference library, flashcards, indicator vault.
- Simulator internals, Hard Sentences, Diagnostics, Journal, Settings.
- Arguments Foundations micro-interactions (Claim Bucket / Trojan Horse / FABS hover) — separate follow-up once these 5 drills land.

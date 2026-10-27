# Guided Drill Routing Audit - 2026-06-30

Scope: repo-grounded audit of guided-drill launch pages, routing, assignment handoff, completion plumbing, and question-pool configuration.

## Executive Result

- Static launch pack is internally complete: 108 manifest entries, 108 HTML files, no missing file paths.
- Static page format/wiring passes: every page has the routed start signal and iframe-interceptable start/return controls.
- Route shell exists: `/guided-drills/:slug` and `/guided/:assignmentId` both render `GuidedDrillStart` inside `QuestionBankProvider`.
- Assignment route wiring exists: teacher/admin assignment creates `guided_drill_assignments`, creates a `classroom_items` row, and routes students to `/guided/:assignmentId?returnTo=/classroom`.
- Question-pool capacity passes for the local seed: all 114 seed rows resolve to at least their configured `question_count` from the loaded LR bank.
- Main problem: the approved static HTML pack is mostly not connected to the current seed/DB-style guided-drill rows. Only 18 of 108 static manifest entries match the local seed by the same slug/title rules used by `findGuidedDrillHtmlByDrill`. The other 90 will not be used for week-prefixed routed drill rows unless the live DB has alternate clean slugs or `source_file` values pointing directly at the HTML filenames.
- Completion sync risk: `/drill` marks `guided_drill_assignments.status = completed`, but I did not find a matching `syncClassroomItemStatusBySource('guided_drill_assignments', ...)` call for guided-drill completion. The source assignment can complete while the Classroom feed row remains stale.

## Files Checked

- `src/App.tsx`
- `src/pages/GuidedDrillStart.tsx`
- `src/pages/Drill.tsx`
- `src/lib/guidedDrills.ts`
- `src/lib/guidedDrillsLocal.ts`
- `src/lib/guidedDrillNavigation.ts`
- `src/lib/classroomItems.ts`
- `src/lib/teacherAssignResource.ts`
- `src/data/guidedDrillHtmlManifest.ts`
- `src/data/guidedDrillsLocalSeed.ts`
- `data/guided-drills/_seed.json`
- `public/guided-drill-html/*.html`
- `supabase/migrations/20260620230000_guided_drills_lsatlab_backfill_and_import.sql`
- `supabase/migrations/20260624000000_guided_drills_taxonomy_final.sql`

## Route And Handoff Contract

`GuidedDrillStart` resolves the launch page in this order:

1. `findGuidedDrillHtmlByDrill(drill)`:
   - exact `source_file` basename match against manifest `sourceFile`
   - then slug match
   - then normalized title match
2. `findGuidedDrillHtmlBySlug(slug)`
3. fallback generated launch HTML from `instruction_card`

That means a guided-drill DB row with slug `w4-01-reconcile-the-pivot`, title `Reconcile the Pivot`, and source file `00_pre_week_4_blue_lr_guided_drills.md` will not use `12_reconcile_the_pivot_drill_one.html`; it falls back to generated HTML.

## Static Pack Checks

- Manifest entries: 108
- HTML files: 108
- Missing files: 0
- Extra HTML files not in manifest: 0
- Pages missing `data-start-drill="true"`: 0
- Pages missing `lsatu:start-guided-drill` postMessage hook: 0
- Pages missing `data-return="true"`: 0

## Question-Pool Checks

- Local seed rows: 114
- LR questions loaded from `public/data/PT*-S*-LR.json`: 3,964
- Seed rows with insufficient pool capacity: 0
- Seed rows with empty usable bank filters: 0

This means the current local seed can build routed drills from filters. The issue is not pool capacity; it is static-page association and completion-status sync.

## Static Pages That Do Match Seed Rows

| Order | Static title | Seed slug | Static questions | Seed count | Note |
|---:|---|---|---:|---:|---|
| 1 | First Sentence Conclusions | `w1-01-first-sentence-conclusions` | 6 | 6 | Also has Intro to LR practice override for clean slug. |
| 2 | The Core Connection | `w1-02-the-core-connection` | n/a | 7 | Count not listed in static manifest. |
| 4 | Framework Sampler | `w1-04-framework-sampler` | n/a | n/a | RC/static card, not normal LR pool. |
| 8 | Sampling | `w2-01-sampling` | 10 | 10 | Connected by normalized title only. |
| 17 | Causal Chains | `w2-10-causal-chains` | 3 | 3 | Connected by normalized title only. |
| 27 | Break the Comparison | `w3-05-break-the-comparison` | 8 | 8 | Connected by normalized title only. |
| 29 | Rebuttal Conclusions | `w3-07-rebuttal-conclusions` | 6 | 4 | Mismatch: manifest and Intro pool say 6; seed/migration row says 4. |
| 60 | Most Supported Causal Difference Maker | `w5-12-most-supported-causal-difference-maker` | 4 | 4 | Connected by normalized title only. |
| 64 | Assumes Similarity Mini Set | `w7-03-assumes-similarity-mini-set` | 5 | 5 | Connected by normalized title only. |
| 67 | Causal Chains Mini Set | `w7-06-causal-chains-mini-set` | 4 | 4 | Connected by normalized title only. |
| 77 | Relative vs Absolute | `w8-05-relative-vs-absolute` | 7 | 7 | Connected by normalized title only. |
| 78 | Science Strengthen Weaken | `w8-06-science-strengthen-weaken` | 8 | 8 | Connected by normalized title only. |
| 81 | Most Supported Causal | `w8-09-most-supported-causal` | 5 | 5 | Connected by normalized title only. |
| 82 | Quantifiers Trait Overlap Inferences | `w8-10-quantifiers-trait-overlap-inferences` | 8 | 8 | Connected by normalized title only. |
| 89 | Science Sufficient Assumption | `w9-02-science-sufficient-assumption` | 6 | 6 | Connected by normalized title only. |
| 91 | Weaken Explain Curious Fact | `w9-04-weaken-explain-curious-fact` | 5 | 5 | Connected by normalized title only. |
| 94 | Strengthen Weaken Science | `w9-07-strengthen-weaken-science` | 10 | 10 | Connected by normalized title only. |
| 95 | Anti Causal Hard Mini Set | `w9-08-anti-causal-hard-mini-set` | 3 | 3 | Connected by normalized title only. |

## Static Pages Not Connected To Seed/DB-Style Rows

These static pages exist and are formatted correctly, but no current local seed row matches them by routed slug or normalized title. A routed DB row with the current week-prefixed slugs will not reach these pages through `findGuidedDrillHtmlByDrill`.

| Order | Static title | Public slug | Questions | Status |
|---:|---|---|---:|---|
| 3 | Assumption Family Drill One | `assumption-family-drill-one` | 9 | no seed/DB-style row match by routed slug/title |
| 5 | Paradox Drill One | `paradox-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 6 | Explain Curious Fact Drill One | `explain-curious-fact-drill-one` | 8 | no seed/DB-style row match by routed slug/title |
| 7 | Flaw Drill One | `flaw-drill-one` | 7 | no seed/DB-style row match by routed slug/title |
| 9 | Abstract and Flaw Drill One | `abstract-and-flaw-drill-one` | 10 | no seed/DB-style row match by routed slug/title |
| 10 | Must Be True Drill One | `must-be-true-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 11 | Conditional Logic Drill One | `conditional-logic-drill-one` | 9 | no seed/DB-style row match by routed slug/title |
| 12 | Reconcile the Pivot Drill One | `reconcile-the-pivot-drill-one` | 5 | no seed/DB-style row match by routed slug/title |
| 13 | Missing Links Drill One | `missing-links-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 14 | Necessary Assumption Drill One | `necessary-assumption-drill-one` | 10 | no seed/DB-style row match by routed slug/title |
| 15 | Assumption Family Drill Two | `assumption-family-drill-two` | 6 | no seed/DB-style row match by routed slug/title |
| 16 | Most Supported Drill One | `most-supported-drill-one` | 8 | no seed/DB-style row match by routed slug/title |
| 18 | Assumption Family Drill Three | `assumption-family-drill-three` | 8 | no seed/DB-style row match by routed slug/title |
| 19 | Missing Links Color Coding | `missing-links-color-coding` | 9 | no seed/DB-style row match by routed slug/title |
| 20 | Principle Conform Drill One | `principle-conform-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 21 | Principle Strengthen Drill One | `principle-strengthen-drill-one` | 4 | no seed/DB-style row match by routed slug/title |
| 22 | Strengthen Drill One | `strengthen-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 23 | EXCEPT Drill One | `except-drill-one` | 5 | no seed/DB-style row match by routed slug/title |
| 24 | Anti Causal Drill One | `anti-causal-drill-one` | 5 | no seed/DB-style row match by routed slug/title |
| 25 | Explain Curious Fact Easier Drill One | `explain-curious-fact-easier-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 26 | Analogies Drill One | `analogies-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 28 | Agree Disagree Drill One | `agree-disagree-drill-one` | 8 | no seed/DB-style row match by routed slug/title |
| 30 | Describing Arguments Drill One | `describing-arguments-drill-one` | 5 | no seed/DB-style row match by routed slug/title |
| 31 | Assumption Family Drill Four | `assumption-family-drill-four` | 6 | no seed/DB-style row match by routed slug/title |
| 32 | Fill in the Blank Logical Completion Drill One | `fill-in-the-blank-logical-completion-drill-one` | 4 | no seed/DB-style row match by routed slug/title |
| 33 | Complete the Analogy Drill One | `complete-the-analogy-drill-one` | 5 | no seed/DB-style row match by routed slug/title |
| 34 | Conditional Logic Drill Two | `conditional-logic-drill-two` | 7 | no seed/DB-style row match by routed slug/title |
| 35 | Weaken and Comparison | `weaken-and-comparison` | 6 | no seed/DB-style row match by routed slug/title |
| 36 | Complete the Analogy Drill Two | `complete-the-analogy-drill-two` | 9 | no seed/DB-style row match by routed slug/title |
| 37 | Role and Main Conclusion Drill One | `role-and-main-conclusion-drill-one` | 7 | no seed/DB-style row match by routed slug/title |
| 38 | Reconcile the Pivot Timed Drill | `reconcile-the-pivot-timed-drill` | 5 | no seed/DB-style row match by routed slug/title |
| 39 | Blended Set Parallel and Paradox | `blended-set-parallel-and-paradox` | 6 | no seed/DB-style row match by routed slug/title |
| 40 | Principle Strengthen Drill Two | `principle-strengthen-drill-two` | n/a | no seed/DB-style row match by routed slug/title |
| 41 | Principle Strengthen Application Drill One | `principle-strengthen-application-drill-one` | n/a | no seed/DB-style row match by routed slug/title |
| 42 | Reconcile the Pivot Drill Two | `reconcile-the-pivot-drill-two` | 9 | no seed/DB-style row match by routed slug/title |
| 43 | Causal Chains Drill Two | `causal-chains-drill-two` | 9 | no seed/DB-style row match by routed slug/title |
| 44 | Causal Difference Maker Drill One | `causal-difference-maker-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 45 | Missing Links Color Coding Drill Two | `missing-links-color-coding-drill-two` | 7 | no seed/DB-style row match by routed slug/title |
| 46 | Assumption Family Medium Drill One | `assumption-family-medium-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 47 | Famous Flaw Drill One | `famous-flaw-drill-one` | 12 | no seed/DB-style row match by routed slug/title |
| 48 | Intermediate Conclusion Drill One | `intermediate-conclusion-drill-one` | 5 | no seed/DB-style row match by routed slug/title |
| 49 | Causal Difference Maker Drill Two | `causal-difference-maker-drill-two` | 6 | no seed/DB-style row match by routed slug/title |
| 50 | Conditional Logic Drill Four | `conditional-logic-drill-four` | 9 | no seed/DB-style row match by routed slug/title |
| 51 | Anti Causal Drill Two | `anti-causal-drill-two` | 8 | no seed/DB-style row match by routed slug/title |
| 52 | Explain Curious Fact Medium Drill One | `explain-curious-fact-medium-drill-one` | 6 | no seed/DB-style row match by routed slug/title |
| 53 | Assumption Family Medium Drill Three | `assumption-family-medium-drill-three` | 6 | no seed/DB-style row match by routed slug/title |
| 54 | Causal Difference Maker Drill Three | `causal-difference-maker-drill-three` | 10 | no seed/DB-style row match by routed slug/title |
| 55 | Describing Arguments Drill Two | `describing-arguments-drill-two` | 10 | no seed/DB-style row match by routed slug/title |
| 56 | Agree Disagree Drill Two | `agree-disagree-drill-two` | 5 | no seed/DB-style row match by routed slug/title |
| 57 | Conditional Logic Medium Drill One | `conditional-logic-medium-drill-one` | 10 | no seed/DB-style row match by routed slug/title |
| 58 | Evaluate Drill One | `evaluate-drill-one` | 7 | no seed/DB-style row match by routed slug/title |
| 59 | Evaluate Drill Two | `evaluate-drill-two` | 4 | no seed/DB-style row match by routed slug/title |
| 61 | Conditional Logic Medium Drill Two | `conditional-logic-medium-drill-two` | 7 | no seed/DB-style row match by routed slug/title |
| 62 | Explain Curious Fact Medium Drill Two | `explain-curious-fact-medium-drill-two` | 7 | no seed/DB-style row match by routed slug/title |
| 63 | Complete the Analogy Drill Three | `complete-the-analogy-drill-three` | 8 | no seed/DB-style row match by routed slug/title |
| 65 | Conditional Logic Medium Drill Three | `conditional-logic-medium-drill-three` | 7 | no seed/DB-style row match by routed slug/title |
| 66 | Explain Curious Fact Medium Drill Three | `explain-curious-fact-medium-drill-three` | 7 | no seed/DB-style row match by routed slug/title |
| 68 | Evaluate Drill Three | `evaluate-drill-three` | 7 | no seed/DB-style row match by routed slug/title |
| 69 | Conditional Logic Medium Drill Four | `conditional-logic-medium-drill-four` | 9 | no seed/DB-style row match by routed slug/title |
| 70 | Intermediate Conclusions Drill Two | `intermediate-conclusions-drill-two` | 5 | no seed/DB-style row match by routed slug/title |
| 71 | Describing Arguments Drill Three | `describing-arguments-drill-three` | 6 | no seed/DB-style row match by routed slug/title |
| 72 | Causal Chains Drill Three | `causal-chains-drill-three` | 8 | no seed/DB-style row match by routed slug/title |
| 73 | Famous Flaws Medium Drill One | `famous-flaws-medium-drill-one` | 5 | no seed/DB-style row match by routed slug/title |
| 74 | Conditional Logic Medium Drill Six | `conditional-logic-medium-drill-six` | 8 | no seed/DB-style row match by routed slug/title |
| 75 | Must Be False Medium Drill One | `must-be-false-medium-drill-one` | 4 | no seed/DB-style row match by routed slug/title |
| 76 | Parallel Flaw Famous Flaws Drill Two | `parallel-flaw-famous-flaws-drill-two` | 5 | no seed/DB-style row match by routed slug/title |
| 79 | Principle Conform Principle in Stimulus Drill One | `principle-conform-principle-in-stimulus-drill-one` | 8 | no seed/DB-style row match by routed slug/title |
| 80 | Principle Conform Principles in Answers Drill One | `principle-conform-principles-in-answers-drill-one` | 5 | no seed/DB-style row match by routed slug/title |
| 83 | Must Be False Medium Drill Two | `must-be-false-medium-drill-two` | 4 | no seed/DB-style row match by routed slug/title |
| 84 | Explain Curious Fact Medium Drill Four | `explain-curious-fact-medium-drill-four` | 5 | no seed/DB-style row match by routed slug/title |
| 85 | Assumes Similarity Drill One | `assumes-similarity-drill-one` | 7 | no seed/DB-style row match by routed slug/title |
| 86 | Anti Causal Drill Three | `anti-causal-drill-three` | 6 | no seed/DB-style row match by routed slug/title |
| 87 | Conditional Logic Medium Drill Five | `conditional-logic-medium-drill-five` | 10 | no seed/DB-style row match by routed slug/title |
| 88 | Abstract and Flaw Drill Two | `abstract-and-flaw-drill-two` | 10 | no seed/DB-style row match by routed slug/title |
| 90 | EXCEPT Drill Two | `except-drill-two` | 5 | no seed/DB-style row match by routed slug/title |
| 92 | Conditional Logic Harder Drill One | `conditional-logic-harder-drill-one` | 8 | no seed/DB-style row match by routed slug/title |
| 93 | Must Be False Harder Drill Two | `must-be-false-harder-drill-two` | 6 | no seed/DB-style row match by routed slug/title |
| 96 | Conditional Logic Harder Drill Two | `conditional-logic-harder-drill-two` | 7 | no seed/DB-style row match by routed slug/title |
| 97 | Quantifiers Drill Two | `quantifiers-drill-two` | 8 | no seed/DB-style row match by routed slug/title |
| 98 | Explain Curious Fact Harder Drill One | `explain-curious-fact-harder-drill-one` | 5 | no seed/DB-style row match by routed slug/title |
| 99 | EXCEPT Drill Three | `except-drill-three` | 5 | no seed/DB-style row match by routed slug/title |
| 100 | Conditional Logic Harder Drill Three | `conditional-logic-harder-drill-three` | 6 | no seed/DB-style row match by routed slug/title |
| 101 | Principle Strengthen Drill Three | `principle-strengthen-drill-three` | 7 | no seed/DB-style row match by routed slug/title |
| 102 | Explain Curious Fact Harder Drill Two | `explain-curious-fact-harder-drill-two` | 8 | no seed/DB-style row match by routed slug/title |
| 103 | Assumption Family Harder Drill One | `assumption-family-harder-drill-one` | 7 | no seed/DB-style row match by routed slug/title |
| 104 | Speedwalking LR Drill One | `speedwalking-lr-drill-one` | 15 | no seed/DB-style row match by routed slug/title |
| 105 | Assumption Family Harder Drill Two | `assumption-family-harder-drill-two` | 10 | no seed/DB-style row match by routed slug/title |
| 106 | Explain Curious Fact Harder Drill Three | `explain-curious-fact-harder-drill-three` | 5 | no seed/DB-style row match by routed slug/title |
| 107 | Conditional Logic Harder Drill Four | `conditional-logic-harder-drill-four` | 7 | no seed/DB-style row match by routed slug/title |
| 108 | Speedwalking LR Drill Two | `speedwalking-lr-drill-two` | 15 | no seed/DB-style row match by routed slug/title |

## Current Failure Modes

1. Most routed catalog rows will not display the approved static page.
   - Teacher/admin surfaces open `/guided-drills/${d.slug}` from the DB row.
   - DB/local seed slugs are mostly week-prefixed (`w4-01-...`).
   - Manifest slugs are clean public slugs (`reconcile-the-pivot-drill-one`).
   - `source_file` in the seed/migrations points to markdown/source labels, not the HTML filenames.

2. Direct clean static routes may not build a real drill unless there is a DB row or bootcamp practice override for that clean slug.
   - `first-sentence-conclusions` and `rebuttal-conclusions` have Intro to LR practice-pool overrides.
   - Most other clean manifest slugs depend on a matching `guided_drills.slug`, which the local seed/migrations do not provide.

3. Rebuttal Conclusions has inconsistent counts.
   - Static manifest: 6 questions.
   - Intro to LR practice pool: 6 qids.
   - Local seed/migration row `w3-07-rebuttal-conclusions`: 4 questions.

4. Classroom status may not update when a guided drill is completed.
   - `/drill` updates `guided_drill_assignments`.
   - The helper `syncClassroomItemStatusBySource` exists but is not used in the guided completion branch.

## Recommended Fix Plan

1. Add an explicit static launch mapping field to the guided-drill data model or bundled seed, such as `launch_html_source_file`, rather than relying on fuzzy title matching.
2. Backfill each routed seed/DB row to point at the intended `public/guided-drill-html/*.html` file.
3. Update `findGuidedDrillHtmlByDrill` to prefer that explicit field while keeping current slug/title fallback.
4. Fix the Rebuttal Conclusions count so the DB/seed row agrees with the static page and Intro to LR pool, unless 4 is intentionally the teacher-library version and 6 is intentionally bootcamp-only.
5. In `/drill` guided completion, call `syncClassroomItemStatusBySource('guided_drill_assignments', guidedAssignmentId, 'completed')` after the source assignment update succeeds.
6. Add regression tests:
   - every seed/local guided drill resolves either a static launch page or intentionally falls back to generated HTML with a documented reason;
   - every manifest page is either mapped to a routed drill or marked static-preview-only;
   - guided completion syncs the classroom row.


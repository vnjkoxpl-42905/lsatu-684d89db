# Conditional drill integration: local verification

Verified 2026-10-27. Expanded implementation is local and uncommitted in `codex/conditional-full-20261025`, based on `bebb4948771d18d323a865f27e26fccfba756b64`. No deployment or production assignment writes were made for this scope.

## What students can find in the bootcamp

The Practice centre reuses the existing conditional engines inside the course shell: Conditional Rephrase (62 exercises), Linking (8), Missing Links (22), Must Be True (10), indicator sorting, diagram practice, translation flashcards, Unless, existing course drills and 13 conditional guided sets. Linking and Missing Links remain distinct. The Desktop Missing Links 12 are already represented in the shared bank of 22; they are not copied into another published collection.

Individual assignment targets retain supported topic and mode settings. Full-course, restricted lesson and exact activity grants are checked separately. Existing IDs, historical requirements, assignment records and saved runs are preserved. Legacy slug-based unfinished guided sittings are readable saved work with a new-attempt option, rather than an unusable Continue action.

Mixed Negation Station and Spot the Relationship, causal material, broader sufficient/necessary-assumption guided sets and the two unapproved quantifier guided sets are excluded. Existing course quantifier lessons remain unchanged.

## Writing and interface checks

Flashcards retain recall before reveal, with separate comparison statements using vs, complete English conditions, useful group/stage/review filters and shared actor/card ratings. Diagram practice preserves a wrong arrangement for repair and gives hints before reveal. Embedded practice uses the course typography, spacing, background and heading hierarchy. No student-facing em dashes were introduced.

Local browser checks exercised Rephrase wrong answer, hint, repair, reload and history continuation; Missing Links wrong answer, hint and correction; sorting repair; diagram repair; comparison cards and cross-filter ratings; the guided library; the restricted Group 3 fixture; and the local teacher configuration form without submitting assignments.

Measured responsive widths were 374, 768, 981, 1281 and 900 CSS pixels, with no horizontal overflow. Comparison cards stack on narrow screens. Reduced-motion transitions measured 0s. Screenshots are evidence of these local preview states, not signed-in production acceptance.

- `contrast-desktop.png`: comparison flashcard in the centre.
- `contrast-mobile.png` and `contrast-mobile-full.png`: narrow comparison layout.
- `rephrase-integrated.png`: shared Rephrase engine inside the bootcamp.
- `responsive-matrix.json`: measured layout and motion results.

## Checks and review limits

Final current-source `npm run typecheck` and `npm run build` both exited 0. Logs are in the Windows Temp folder as `conditional-typecheck-release-ready-20261027.log` and `conditional-build-release-ready-20261027.log`.

Targeted regressions passed: final targeted run 71 tests; identity/route fixes 96; shared runtime/deck fixes 42; guided fixes 46; refresher fixes 14; assignment/registry checks 75. These overlap and must not be summed as unique coverage. An earlier broad run passed 969 of 978 tests; all nine observed failures were subsequently resolved and affected files rerun. There was no final all-green rerun of the entire broad set.

The plan received independent approval. Two implementation inspections requested revisions; all concrete findings were addressed and regression tested. Final fixes were not independently inspected again. See the implementation review log for findings and dispositions.

The existing `VITE_CONDITIONAL_FULL_COURSE_ASSIGNMENTS_RELEASED` gate remains off locally. The new teacher activity assignment option remains gated. Signed-in student launches, live RLS acceptance and production assignment creation were not exercised. Source policy inspection and local tests do not establish those runtime outcomes.

Preview: http://127.0.0.1:8099/dev/conditional-opening-preview?page=centre&edition=full-conditionals-v3

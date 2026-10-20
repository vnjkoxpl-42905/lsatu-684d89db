# RC landing polish verification

2026-10-20. Scope: RC Practice landing only. LR components, shared assignment implementation, builder selection logic and Reading Center RC Recall are unchanged. This pass is local and has not been published.

## Design contract and changes

The live LR Practice page was inspected as the reference for its light host, neutral dark surfaces, restrained controls and type hierarchy. RC retains two equally prominent entry choices. The hero uses shorter parallel descriptions, 15px body copy and aligned 46px actions. Spacing now follows a 16/24/32px rhythm, with 18px panel and 12px row corners. The RC-only page heading and primary tabs share the same content width as the drill canvas. Lookup joins the existing destination navigation and section switch rather than consuming an independent band.

Lower panels have matching 24px padding, 32px heading rows and 16px content gaps. They align their headings and first content rows without forcing equal panel heights. Known single-passage resumes use structured index metadata for a prominent 18px title and separate 13px source, never parsing authored titles. Exact first-answer counts receive natural display wording; qualified draft, hidden-result and failed-read messages remain intact. Continue is visible on the whole clickable resume row.

Assignment titles use readable 14px text, two lines on desktop and unrestricted wrapping on narrow panels. Status has its own aligned column on wide layouts and moves below the copy on narrow layouts. Existing view-all and row destinations are preserved. RC-scoped surface/focus/hover refinements introduce no motion.

## Current-run screenshot comparison

The live RC and LR pages were inspected first. Live browser zoom prevented exact 320px capture, so the repeatable five-width baseline is rendered from immutable commit e5e25c7c with its original component and CSS. Both baseline and current screenshots use the same synthetic account, long assignments, real QuestionJump/AssignedWorkPanel and light host scaffold. The harness removes current RC CSS in baseline mode to avoid contamination. It is not the full signed-in application shell.

| CSS viewport | Before | After |
| --- | --- | --- |
| 1440 | [Before](rc-polish-baseline-1440.jpg) | [After](rc-polish-after-1440.jpg) |
| 1024 | [Before](rc-polish-baseline-1024.jpg) | [After](rc-polish-after-1024.jpg) |
| 768 | [Before](rc-polish-baseline-768.jpg) | [After](rc-polish-after-768.jpg) |
| 390 | [Before](rc-polish-baseline-390.jpg) | [After](rc-polish-after-390.jpg) |
| 320 | [Before](rc-polish-baseline-320.jpg) | [After](rc-polish-after-320.jpg) |

All ten screenshots were captured and visually inspected. Measured innerWidth equals each requested width. Settled document and RC-root layouts have no horizontal overflow. At 1440 and 1024, both hero buttons share their y coordinate, both lower headings share their y coordinate, and both first content rows share their y coordinate. At 768 the lower panels stack before assignment text gets cramped; at 390 and 320 navigation remains in two intentional rows. A shared mobile switch width caused clipping during the first pass and was corrected with an RC-scoped width override, then recaptured. Layout measurements are in rc-polish-layout-metrics.json.

## Interaction and automated checks

- 137 focused tests passed: 46 AcademyMainhub routing/presentation, 84 RC builder safeguards, 7 saved-set controls. New tests cover structured title/source, zero/singular/plural progress, preserved qualified details, one lookup control in navigation, and unchanged lookup return routing.
- Typecheck passed. Production build passed including generated bank/index identity checks and postbuild content scan. Existing build warnings remain (Browserslist age, ambiguous Tailwind classes, missing noise asset and bundle splitting).
- Keyboard Enter opened the real RC-scoped finder; Escape closed it. Tab from the section switch reached the automatic action with a visible light outline and 4px offset. Enter opened automatic and manual setup; Back returned to the landing page. Empty manual selection kept Preview disabled.
- Manual selection of passage 1188 previewed 1 passage and 3 questions. Simulated launch preserved passage 1188, manual source, unlimited timing and per_passage reveal.
- Empty resume/assignment states and failed resume/assignment states were inspected. Errors retained retry controls and available assignments; no fabricated progress appeared. Fixture retry controls are not evidence of real network recovery.
- Completed-history control reached the completed view. View-all assigned work remains visible with more than three open assignments. Production assignment navigation is unchanged.

## Limits

Account adapters, finder bank, persistence and assignment data in the comparison harness are synthetic. No new signed-in production persistence, real request recovery, screen-reader speech, physical-device or concurrent-session acceptance is claimed. The production LR page was read-only throughout. No additional Claude review was requested or run.

Docked-container check: at a 1440px browser viewport with a 720px host, the RC content container measured 672px wide and had scrollWidth672px. The lower panels stacked and both hero actions remained aligned. Evidence: rc-polish-docked.jpg. Temporary viewport emulation was reset after verification.

# Home chapter choices, 2026-10-27

Replaced the three arrow links with equally weighted destination controls. Each has a title and a short purpose: Lessons / Read and learn; Drills / Practise the skill; Flashcards / Test your recall. A Choose your work label separates this choice from the completion summary. No selected state is implied on Home. Existing availability and chapter-scoped routes are preserved.

Design sources: ai-os/design/README.md and principles.md, particularly separate surface/control shapes, local pressable controls, restrained depth and visible focus. Read-only independent audit agreed with separate equal controls and no false active-tab state.

Verification: OpeningCourse.navigation tests passed (18 tests); typecheck passed. Browser readback confirmed three chapter-scoped destinations, 76px hit areas and zero arrow SVGs inside the controls. Clicked Chapter 1 Drills and confirmed the 11-drill list; returned Home. Opened round 2 desktop and phone fold and full-page screenshot sheets. Three choices fit on the phone with short descriptions wrapping; chapters with no flashcard collection retain two equally sized choices.

The first automated capture caught the lazy preview before it painted and was discarded as render evidence. The warmed second capture rendered the actual page. Its audit reports 1 FAIL (control shadows) and 6 WARN, not a passing automated visual gate. The 1px contact shadow is deliberately retained under the selected material-depth guidance. Other warnings concern the existing palette, duplicate Inter font aliases, development server, existing control borders, full-course content below the fold and pre-existing panel space. No unrelated hero or course-wide changes made to clear generic heuristics.

Screenshots: .taste-skill/home-choices-20261027-round2/desktop-page-01.jpg and mobile-page-01.jpg. Local and uncommitted; no build rerun for this limited markup/CSS refinement, no publish or account writes.

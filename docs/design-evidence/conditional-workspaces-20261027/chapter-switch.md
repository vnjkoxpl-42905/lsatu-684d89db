# Approved A: direct chapter switch, 2026-10-27

Joshua selected A after comparing direct navigation and true in-card tabs. Applied a single recessed stone track, three compact labelled destination links and a transient shared hover/focus highlight. No permanent selected Home state, radio role, local preview or navigation delay. Two-choice chapters fill the same track evenly. Small phone widths omit icons before shrinking labels. No arrow icons in these choices.

21st.dev visual inspiration: Halaska Segmented Control, https://21st.dev/@halaska-studio/components/segmented-control (MIT). Adapted to existing router links and CSS without copying the full token/theme system, adding dependencies or installing a registry package.

Homepage polish: consistent 20px desktop/16px phone card insets; required-work heading and count; subtler card boundaries and grounded shortcut fills; removed repeated purpose/helper lines; distinguish lesson progress including optional work where its count differs from required lessons. Calculations, availability, saved work and chapter-scoped links are preserved. Source changes: OpeningCourse.tsx and opening-course.css.

Validation: 59 tests passed across OpeningCourse.navigation and OpeningCourse; final typecheck passed. Desktop and 390px phone rendered sheets opened under .taste-skill/chapter-switch-built-20261027. Manual browser confirms three- and two-choice tracks, minimum 44px CSS hit areas, visible keyboard outline and moving focus highlight, no overflowing links at CSS width390, 0s thumb transition with reduced motion, and direct Chapter 1 flashcard collection access with unchanged 1 of 16 progress. Viewport/media emulation restored; Home left open.

The whole-home automated visual audit reports one FAIL for the pre-existing selected Practice and review panel shadows, plus six WARN. It is not a passing automated gate. The retained review-panel depth follows Joshua's preceding explicit request; its palette, font aliases, dev preview and full-course layout warnings remain documented. This revision does not remove approved depth just to clear a generic metric.

Gemini plan review from the preceding design turn timed out, and no independent Gemini approval is claimed. Current implementation follows Joshua's explicit A selection. Production build, signed-in production acceptance and an independent diff review were not rerun for this bounded local refinement. No commit, push, publish or account writes.

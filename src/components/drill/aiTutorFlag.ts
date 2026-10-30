/**
 * One switch for the AI Tutor on the drill surface.
 *
 * Off since 2026-09-12: the generated coaching chat ("Joshua is having trouble
 * connecting") failed on screen while the authored LSAT Lab explanation for
 * the same question already sits in Postgres (`lr_explanations`,
 * `lr_explanation_steps`, `lr_explanation_choice_notes`). The written
 * explanation is the review surface now; the tutor stays in the code so it can
 * come back behind this one constant.
 *
 * Gates mounting and launching, never just initial state:
 *  - the Coach chat overlay (`renderTutorOverlay`) and its launch sites after a
 *    wrong answer (`resolveTutorLaunch`),
 *  - the "Ask Joshua" fallback in the drawer's Explanation tab,
 *  - the voice-coach chip,
 *  - the legacy layout's tutor controls.
 * The `tutor-chat` edge function is untouched; this is the product surface.
 */
export const AI_TUTOR_ENABLED = false;

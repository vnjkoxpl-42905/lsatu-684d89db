/**
 * The one "this is my answer" look, shared by every screen where a student
 * picks an answer: drills, timed sections, practice tests (LR and RC), blind
 * review and the finished-drill review.
 *
 * Before 2026-11-08 a pick was a pale grey card (and in the drill's blind
 * review only a radio dot), easy to lose next to a hovered or crossed-out
 * choice. A pick must read at a glance from across the screen.
 *
 * State order, strongest first, for every choice renderer:
 *   correct (revealed) > wrong pick (revealed) > picked > crossed out > idle
 */

/** The choice card when it is the student's pick. */
export const PICKED_ROW =
  "answer-picked border-[#1f3a5f] bg-[#eaf1fb] ring-2 ring-[#1f3a5f]/25 shadow-sm";

/** The letter badge when it is the student's pick. */
export const PICKED_BADGE = "border-[#1f3a5f] bg-[#1f3a5f] text-white";

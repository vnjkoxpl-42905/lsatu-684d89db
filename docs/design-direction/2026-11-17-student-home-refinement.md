# Student Home design refinement — 2026-11-17

## Direction

A quiet study desk with one prominent next assignment. The original teacher Desk informed the floating controls, editorial greeting and 3D orbit. The approved Eclipse reference informed the black sphere and white corona. Scores, session context, messages and the week support the next action.

The three development previews remain available at `/dev/student-home-preview?variant=focus`, `?variant=score`, and `?variant=agenda`. Focus is the recommended composition. Agenda moves the week ahead of assigned work; Scoreboard gives the metrics more width and a stronger surface. Production default selection is still pending; this change does not enable a preview in production. Teacher implementation was inspected as reference, not redesigned in this change.

## Implementation

- Replaced CSS ellipse markers with an isolated, dynamically imported Three.js scene adapted from the original Desk geometry and camera.
- Added eased pointer response, return to rest, pause/resume, reduced-motion handling, hidden/offscreen suspension and GPU cleanup. Orbit dots are decorative and do not claim to represent student counts.
- Static Eclipse fallback stays until the first successful frame.
- Refined hierarchy, monochrome surfaces, assignment emphasis, compact session/test-date context, message placement, scores, calendar and shortcut dock.
- Container queries handle constrained content widths. Phone artwork is compact so the assignment remains near the top.
- Restricted the Testing Centre dock shortcut to drill access. Disabled exam-history query no longer shows a perpetual loading state without an actor.
- Development fixtures include populated, empty, loading and work-error states via `state=empty|loading|error`.

## Evidence and limits

Original reference viewed running from an ignored local copy of `C:/Users/Joshu/Documents/Claude/08_CHAT_EXPORTS/2026-11-10_lsatu-teacher-home-redesign_files/lsatu-desk.html`. The existing teacher React view and Eclipse source were inspected.

Student preview inspected through the browser at 390, 768, 1100 and 1440 pixels. The 1100-pixel shell retains its sidebar and provides roughly 805 pixels of content as a constrained-width check. No page-level horizontal overflow in the checked states. This is not an authenticated student-data or actual sidecar integration test.

Question Finder opened through the dock; error-state Retry returned to the populated fixture; motion control toggled; reduced-motion media emulation hides the animation control and renders a still scene. Pixel-identical screenshot comparison was inconclusive, so it is not evidence of frame-level pause correctness.

Screenshots: `C:/Users/Joshu/.codex/visualizations/2026/11/17/01a1e97c-ee6d-71b3-878f-7c4a4650063a/student-home-desktop.jpg` and `student-home-phone.jpg`.

69 Home and WeekStrip tests passed. Typecheck and production build passed during implementation; final-build and safe-push results are reported in the chat. Build emits existing chunk-size, Tailwind utility ambiguity, Browserslist and unresolved noise-image warnings.

# Practice and review panel, 2026-10-27

User rejected the white destination boxes and requested engaging controls with depth. The bounded revision makes this panel one charcoal material with faint existing landscape artwork, a raised slate next-drill surface, a muted green Start/Continue drill control, circular icon medallions and transparent destination rows separated by rules. No arrows remain inside the panel. Existing destinations, progress counts and conditional next-drill logic remain intact.

Source scope: OpeningCourse.tsx and opening-course.css. The existing design/principles.md material guidance read in this session directs purposeful surfaces, contact shadows and distinct hover/pressed/focus states. No new artwork or dependency.

Verification: OpeningCourse.navigation tests passed, typecheck passed, diff check passed. Browser readback confirms original destinations and transparent row backgrounds. Phone width 390 has document scroll width 367 (no overflow), with 76px destination hit areas. Opened desktop and phone full-page rendered sheets under .taste-skill/review-desk-20261027. The panel is visibly charcoal and the next action remains prominent on both sizes.

Automated inspection reports 2 FAIL (button shadows and panel shadows), plus 6 WARN. These are not presented as a passing visual gate. The selected project material guidance and this explicit user request authorize restrained contact depth over the generic flat-control rule. Existing palette/font alias/dev preview/full-home-density warnings remain outside this bounded change. Production build and signed-in production checks were not rerun for this local markup/CSS refinement. No commit, push or publish.

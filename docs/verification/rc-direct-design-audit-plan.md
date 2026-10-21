# Direct lookup: final design audit
2026-10-21. Scope: LOCAL prototype only, rc-layout-3.html, rc-layout-3-polish.js/css and narrow shared rc-layout-studies.js/css corrections. Production RC/LR code and old comparison concepts outside scope. No commit, push, deploy or real data writes.

User authorizes refining the whole Direct lookup design then Claude review. No independent plan-review phase requested; final implementation inspection requested. Host/builder Codex, final inspector Claude Opus, maximum2 inspections. Baseline aeecce9bd038eb6e5b637f1ab22f348b2fa860c1; preexisting tracked production edits and historical untracked artifacts preserved.

Acceptance:
- Remove optional question selector and question-focus behaviour from version03; whole passages remain the unit.
- One clear cream Review passages action; Start stays a separate stage. No extra Add/Preview action, visible method toggle, or main saving controls.
- Clearly explain that lookup is optional and Tutor's choice is used when blank. Manual selection remains in Customize drawer; its Apply/Cancel remain predictable.
- Keep black/charcoal/cream palette; use legible neutral text, borders, and distinct disabled states, no orange or cream-filled inputs on the main dark working surface. The established light cream side drawer remains an intentional contrast surface.
- Simplify spacing, typography, and repeated copy across setup, drawer, Review. Preserve other two studies.
- Direct lookup chooses the exact synthetic whole passage at Review; incomplete lookup blocks Review; clearing lookup restores appropriate saved selection/default.
- Review/Edit, manual selection/clear, drawer Apply/Cancel, timing/answers and responsive controls remain usable. No false saving/launch claims.

Verification: node --check both JS modules; Codex browser at1440,980,768,390,320 CSSpx, setup/drawer/review including normalzoom, no page overflow, clear focus, readable targets. Actual sample bank only4 passages; no production persistence, exposure or session claims. Screenshots C:/Users/Joshu/Downloads/RC-Direct-Design-Audit-2026-10-21. Independent inspector should READ screenshots and actual current prototype files, identify actual limits, not audit unrelated preexisting production changes. No generation or source changes during inspection.

Current proof and known limits before final inspection:
- Question DOM/control and focus code removed from version03. Automatic title reflects count. Custom timing now shows minutes input and invalid-value guidance.
- Browser verified automatic2-passage Review, custom9.5-min Review and invalid0 blocks; direct PT141/S3/P2 Review exact matching passage; manual Apply same ID clears stale direct draft; Cancel retains direct draft; clearing all manual passages blocks Review and gives actionable message. Full selection remains whole passages.
- Setup1440,980,768,390,320: document width equals viewport, CSS body zoom1. Captures require DPR1.25 to match Windows125% display scaling; initial DPR1 captures were inaccurate, replaced. Settled drawer captures use reduced motion.
- Proof screenshots setup-[width].jpg, drawer-1440.jpg/drawer-320.jpg, review-1440.jpg/review-320.jpg in C:/Users/Joshu/Downloads/RC-Direct-Design-Audit-2026-10-21. Read these to assess actual visual hierarchy. Native controls remain platform-dependent.
- Existing prototype filter chips/range do not actually filter or persist. Apply notification explicitly states this limitation, rather than claiming successful filtering. Saving and Start remain truthful demo-only notices. Real-source backend behavior is outside this design task. No production build/test suite needed for isolated plain HTML/CSS/JS studies; syntax checks pass.
- Final inspector should examine current prototype source and screenshots, not unrelated earlier RC production changes. Maximum2 final inspections; no independent plan approval is claimed.


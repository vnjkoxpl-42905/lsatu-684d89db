# Editor workspace verification, 2026-10-28

Actual local app: http://127.0.0.1:8099/dev/conditional-opening-preview?page=centre&edition=full-conditionals-v3 . This is the real development route, not the older 8124 prototype.

- Rendered and opened screenshots at 1440, 1307, 940 (docked equivalent), 768 and 390 pixels. No horizontal overflow.
- Wide layout separates navigator, instructions and settings. Medium width uses two regions. Small content width removes desktop navigator from display/tab order and exposes named native selectors.
- Refined after initial inspection: neutral graphite/cobalt palette, explicit ordered instructions, corrected Unless-only copy, plain timing label Untimed then timed, removed decorative indices and arrow.
- Browser verified Missing Links Words config launch and Back draft restore; guided library still has13 Open set links; Unless native entry remains; select focus retained, focus-visible confirmed after keyboard input; reduced-motion transitions disabled; dark host retains readable warm plane.
- Long-title/description phone fixture and CSS layout zoom200% did not overflow. These are local DOM-only stress fixtures, not changed authored product copy. CSS layout zoom is not OS/browser magnification acceptance.
- Opened every final PNG in this folder, including dark-host, keyboard-focus, Unless setup, long content and zoom. Final visual critique: clear relationship between selection and setup, readable instructions, restrained depth; long phone instructions require normal vertical scrolling.

## Proof

114/114 tests pass across13files, including setup/grants, practice persistence, response classification, Refresher/cards, Unless grading and milestones. Full TypeScript typecheck passes. Production build passes; existing large-bundle warning remains. Build knowledge-content gate passes. git diff --check passes (line-ending normalization warnings only). Generated MCP index restored to its clean pre-build baseline.

## Limits

No production deployment or signed-in account acceptance. Dev route is absent in production build, so the earlier production-preview404 is not render evidence. Account-bound Unless timer/unlock acceptance cannot be exercised from this local account-free course preview. Data visuals are current-session or explicitly saved self-ratings; no cross-engine mastery or fabricated trend. See sibling conditional-results-20261028 report for fixture-based feedback evidence.

# Practice centre A: implementation and host verification

Selected by Joshua after two-direction review. Local uncommitted implementation, Codex author. Pre-build commit dbf78f7e68f995e68cdbe9fa1d83337f9d386ad2. Three changed source/test files: ConditionalActivityCentre.tsx, ConditionalActivityCentre.test.tsx and activity-centre.css under src/bootcamps/conditionals/components. No backend or package edits. No publication.

## Checks actually completed
- Four-file targeted suite: original run 44 passed / 2 new fixture failures; both corrected. Final centre file 15/15 passes. The other three files contributed 31 passing tests. All 46 cases therefore pass across these runs; do not imply a single all-green full suite run.
- npm run typecheck passed.
- npm run build passed twice; final postbuild canonical guard scanned 769 files. Existing bundle-size/missing noise asset/Tailwind warnings remain.
- git diff --check passed (line-ending notices only).
- Browser automation via installed Edge against actual local route port8099: ten one-link rows; filtering flashcards and reset; exact named links; keyboard focus-visible; Missing Links entry and back; guided library 13 Open set links; flashcards entry and back; reduced motion transition 0s; dark-host paper/ink; no page overflow at 1440,768,390,940 widths; long two-line title and multi-line description at390.
- runtime.json records measurements. 940px is a narrower canvas approximation, not a physical app-sidecar capture. No account-backed Unless/bank progress or assignment writes exercised.

## Rendered review
Host opened 1440.png,768.png,390.png,940.png,keyboard-focus.png,dark-host.png,long-content-phone.png, all captured from running app with actual activity content. Long-content-phone is deliberate DOM-only stress content, not saved course copy. Focal task is choosing practice; open lists replace white panels, row names lead their descriptions, lower recall/application areas have equal treatment. Main body 16px/1.5; repeated lower section descriptions removed after first render. Warm paper and explicit ink/muted tokens keep contrast consistent even inside dark host. Focus uses outline plus tone step. CSS only touches Home-specific selectors.

Remaining visual limits: tablet and phone are intentionally longer single-column lists; all activity names remain visible. Local preview edition controls at top are dev-only and outside this change. No new entrance motion: controls respond directly, with reduced-motion support. Host did not measure animation natural playback because no new spatial animation was introduced.

## Inspector limitations
Taste app inspector on dev route at1440/768/390: 0 FAIL,3 WARN. Approved warm-paper palette warning retained; Inter/LSATU Inter are existing font aliases plus Georgia; dev-server warning retained. Earlier dev screenshots before final removal of duplicate descriptions were opened, final browser PNGs above supersede them.
Production build preview at8111 returned404 because this development-only route is excluded from the production router. Inspector measured404, which is NOT evidence about the new centre and must not be called a centre pass. No production-render or signed-in acceptance claim. Built source compilation passed; running local dev UI was inspected.

## Fresh Claude inspection request
Inspect all three changed files against pre-build HEAD and the selected-A contract in docs/implementation-plans/2026-10-27-practice-centre-design.md. Open these final screenshots using Read image support if available: 1440.png,390.png,keyboard-focus.png and long-content-phone.png. If image inspection is unavailable, explicitly state that limitation; do not certify visual quality from source alone. Verify one-link accessibility, grant fallback and unchanged imported players/guided library contracts. Report concrete defects only; do not invent a quota.

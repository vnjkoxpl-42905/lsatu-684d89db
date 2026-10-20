# RC concept gallery verification

2026-10-20. Local standalone design artifacts, not production RC implementation. URL: http://127.0.0.1:8096/docs/verification/rc-builder-three-designs.html . Version buttons or ?version=1/2/3 choose the design.

## Checked in Codex browser
- Viewed and captured all three at desktop and 390px mobile.
- All three fit 320px and 768px without horizontal document overflow. Drawer footer fits 320px.
- Options opens from right on desktop and fills mobile viewport.
- Manual search for Game, select Online Game Currencies, Cancel: applied automatic setup unchanged and focus restored.
- Manual selection then Apply: summary becomes one selected passage, preview includes Online Game Currencies.
- Demo Start explicitly reports no drill started and nothing saved.
- Escape closes preview and restores Preview drill focus.
- Shift+Tab from drawer close cycles to Apply; Tab from Apply cycles to close. Background excluded while modal open.
- Screenshots: rc-concept-{1,2,3}-{desktop,mobile}.jpg, rc-concept-drawer-mobile.jpg.
- Reused the app's Google Fonts Outfit family loading convention; no new font package or downloaded font file. Network-unavailable fallback is system sans.

## Review status
Two review rounds completed after Claude authentication recovered. Round 1 used CLI default claude-sonnet-5-5 and returned REVISE. At Joshua's explicit request, round 2 ran in a fresh session with requested alias opus and observed claude-opus-5-5, also returning REVISE. Opus viewed the original mobile/drawer and revised desktop screenshots and preferred concept 3 for separation of setup, selection and action. This is a static screenshot judgment, not a user test or production approval. Earlier authentication failures consumed zero completed rounds. Complete responses and diagnostic paths are recorded in rc-three-concepts-review-log.md.

Round 2 identified a material short-mobile preview scrolling defect and smaller accessibility/copy/search issues. Subsequent host fixes and evidence are recorded below. No third review is authorized, so later fixes must not be described as independently approved.

## Boundaries
Six local sample passages. Automatic filtering is illustrative configuration, not real selection or availability proof. Manual selection and preview use fixture titles; no bank writes, recordings, attempts or saves. Real launch protections, custom timing, all production filter dimensions and saved setups require separate integration after a concept is chosen. Existing production source edits from earlier work are preserved; no LR source changes or publication.

Host repository checks: npm run build passed (including RC indexes and canonical-content verification); git diff --check passed. Existing build warnings concern ambiguous Tailwind utility names, unresolved noise.png, mixed imports and chunk sizes. These checks do not validate production integration of the standalone concepts.

## Follow-up after successful authentication
Round 1 completed with observed claude-sonnet-5-5, verdict REVISE. Source findings and dispositions are in the review log and rc-three-concepts-dispositions.md. User then explicitly selected Opus for round 2.

Host rechecked revised controls in Codex browser: stepper preserves More passages focus, timing preserves select focus, demo completion moves to Back to setup. Requesting two Law passages truthfully reports one matching sample and lists its title. Revised desktop captures: rc-concept-{1,2,3}-revised-desktop.jpg. HTML inline JavaScript syntax check passed through the design worker; git diff --check passed. Inactive manual picks remain retained intentionally, with a drawer explanation; only active mode drives preview.

## Final host corrections after round 2
Accepted R2-1 through R2-7: scrollable preview constrained to viewport, separate non-stacking preview header, count-aware stepper accessible names/manual note, PT-prefixed search, mode-aware copy and logical headings, stable selection toggle labels, explicit Answers label and darker fixture disclaimer. R2-8 documentation is updated here and final screenshots recaptured. These changes have no third independent review.

Browser proof: with six requested passages, 320x568 preview has 536px panel height, 797px scroll content and overflow:auto; Start demo was clicked successfully, focus moved to Back, truthful no-start/no-save status appeared. At 390x667 Start demo likewise clicked successfully. PT101 search returned Native American Burials, Species Gradient, British Abolitionism and P. D. James. Captures: rc-concept-preview-320-final.jpg, rc-concept-preview-390-final.jpg, rc-concept-{1,2,3}-mobile-final.jpg, rc-concept-drawer-mobile-final.jpg. Viewport override reset afterward.

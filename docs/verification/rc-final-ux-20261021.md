# RC builder final UX refinement, 2026-10-21

## Result
Preserved the black-and-cream RC workflow and safeguards. Added isolated locally bundled Outfit, clearer passage/conditions grouping, compact RC-only host framing, primary Build a drill entry, search-first picker with visible metadata and quiet selected indicators, counted Apply action, compact footer, actionable empty-state copy, title-first Review with lightweight reveal actions, and full-width contextual Save name/actions. No changes to LR navigation or Reading Center Recall.

## Typography and layout evidence
Production index.html already loaded Google Outfit. The fixture omitted that loader. CDP platform-font inspection confirmed Arial-BoldMT for the old declared-Outfit builder heading. After the fix, the actual heading and controls use the locally bundled Outfit custom font (platform names Outfit-Thin-SemiBold / Outfit-Thin); the variable font is supplied as RC Outfit to avoid changing LR. The font carries its official OFL license and provenance.

Core sizes: headings26–32px, labels14px, controls15px desktop/16px mobile, review titles18–20px, metadata14px. A legacy flex basis caused oversized mobile Review gaps; corrected. Narrow picker Apply clipping and 320px navigation overlap were caught and corrected visually. Back and content now share one column. Full-width Save field retained the complete typed name at320px.

## Verification
- 449 targeted tests passed across32 files. Affected builder/save suites rerun after final presentation changes:123/123 passed.
- Typecheck passed. Production build and canonical-guide exclusion scan passed. Whitespace check passed.
- Codex Browser: landing, immediate manual shortcut, automatic topic and multi-difficulty controls, mutually dismissible selectors, timing and reveal changes, stable preview IDs after timing edit, search exclusions, selected ordering, Apply/Cancel, clearing a previously previewed manual selection, Review/Edit, exact save and Saved sets reopen, synthetic Start payload, shortfall acknowledgment, preview failure, and launch failure.
- Layout checks at1440,980,768,390,320 CSS pixels, viewport scale1 and DPR approximately1. Setup, Review, landing and picker checked without horizontal page overflow. Drawer footer/button boundaries checked, plus keyboard operation/focus restoration and reduced-motion emulation. Geometry in browser-checks.json.
- Empty-after-review now says Choose at least one passage to continue; Preview is disabled and stale-preview warning absent.
- Existing deferred-loading, exposure recording, eligibility, pending-write, ownership and duplicate-launch safeguards covered by automated regression tests.

## Limits and release state
Browser journeys use real UI components with synthetic backend/account adapters and a fixture host, not a deployed signed-in production session. Production persistence, real student attempts, physical mobile keyboard and actual device behavior were not independently exercised. Loading states were covered with deferred automated tests; fixture requests complete immediately. No production writes or deployment.

Branch codex/rc-workflow-20261021. Changes remain uncommitted; no new commit reference. Existing prior local work preserved. No merge, push or deployment. This UX pass was not sent for another Claude inspection; earlier reviews do not certify later changes.

Interactive HTML is bundled from current components, with synthetic saves/launches labeled. Standalone-file execution remains separate from the tested live localhost preview.

# Direct lookup refinement: local verification
2026-10-21. Local prototype only. No commit, push, deployment, student-data write, exposure or real session launch.

## Design
Removed optional Question selector and its focus logic. Removed comparison-mode navigation from selected version03. Condensed copy and spacing; made optional lookup/default Tutor's choice explicit. One cream Review passages action; separate Start stage. Charcoal main controls with stronger neutral boundaries; intentional cream side drawer. Saving only on Review, readable44px target.

## Interaction repairs
Lookup clearing restores prior auto count or manual IDs even after Review/Edit. Same-ID manual Apply clears stale direct draft; Cancel retains it. Empty manual selection has guidance. Custom minutes required, range1–60 and half-minute increments; missing/invalid values block Review with help. Stage focus moves to headings, nested drawer restores original opener, Escape outside drawer leaves focus in place. Review shows exact passage number.

## Browser proof
Codex browser setup widths1440,980,768,390,320 CSSpx, bodyzoom1; no document horizontal overflow; Question field absent. Windows display scaling required DPR1.25 captures; initial incorrect DPR1 captures replaced. Drawer captured settled with reduced motion. Native select rendering remains platform-dependent.
Checked automatic2 Review; valid9.5min/invalid0/blank custom timing; exactPT141/S3/P2 Review; manual3 and temporaryP4 lookup then clear restores3; auto2 temporaryP2 then clear restores2; stale-draft same-ID Apply/Cancel; empty manual; heading focus; drawer return focus; Escape on Timing stays onTiming; save target44px at320. JS syntax checks pass for both modules. No production build needed for plain prototype assets.

## Independent inspection
Claude Opus, observed claude-opus-5-5. Inspection1 REVISE; all8 findings addressed. Inspection2 APPROVED. Read full five prototype source files and7 setup/drawer/review screenshots. Claude did not run a browser or tests; host performed browser checks. No source changes after final inspection. Full responses/dispositions: rc-direct-design-audit-review.md.

## Remaining limits
Filter chips/range are visual-only and do not persist or filter sample data; Apply reports this truthfully. Sample pool4 passages. Saving and Start display demo-only notices. Minor residual wording consistency: after reviewed direct lookup, Customize describes its transient selection as a manual pick, whereas the help refers to the baseline restored on clear. Selection is preserved. No production/back-end acceptance claimed.

## Artifacts
C:/Users/Joshu/Downloads/RC-Direct-Design-Audit-2026-10-21: before-setup.jpg, setup-1440.jpg, setup-980.jpg, setup-768.jpg, setup-390.jpg, setup-320.jpg, drawer-1440.jpg, drawer-320.jpg, review-1440.jpg, review-320.jpg, widths.json.

# RC version 3 refinement verification

Date: 2026-10-20. Scope: local interactive version 3 concept only. User approved both local refinement and draft manual mode until Apply. LR and production RC source remain outside this change.

## Acceptance checks
- One passage-focused heading, pluralized by active count.
- Main Choose for me / Pick passages; manual action opens passage picker directly.
- Customize drill opens detailed drawer with applied configuration as a draft.
- Main answer-reveal control, count and timing; concise applied-settings summary.
- Apply commits draft mode/settings/picks; Cancel, X, Escape and backdrop discard them.
- Switching automatic restores its preserved settings while retaining inactive manual choices.
- Focus, responsive main layout, drawer/footer and scrollable preview tested in Codex browser.

## Evidence
Codex browser verified main and drawer at actual CSS widths 1440, 885 (docked), 768, 390 and 320. The browser's existing zoom required viewport normalization; dimensions were read back from innerWidth, not assumed from the viewport request. No horizontal overflow at checked widths. Actual narrow viewport 320x568; drawer and footer both fit320px.

- Count2 pluralizes the single heading; count1 singular checked initially.
- Main Timing Standard pace and Show answers At the end remain applied across manual/automatic mode switches.
- Pick passages opens manual draft directly; search PT101 works. Add then Cancel leaves applied automatic settings and no new picks. Reopen has0 picks until explicitly applied.
- Apply two picks sets main count2 and actual topic/difficulty summary. Focus returns to Pick passages.
- Choose for me restores earlier automatic setup and retains inactive manual choices.
- Customize topic Science, level4, previously practiced Apply updates labeled summary. Subsequent Law/Society edits followed by X/Escape/backdrop are discarded; Science remains and focus returns Customize drill.
- Shift+Tab from close wraps to Apply, Tab from Apply wraps to close.
- Mobile Cancel discards a third pick; reopen retains the two prior picks. Main After each question answer setting reaches preview. Demo Start reports nothing started/saved.
- Mobile preview Start and Back remain reachable at390x844 and320x568. Drawer footer fits; scrolling body supports search results and preferences.
- Screenshots: rc-v3-refined-desktop.jpg, rc-v3-refined-drawer-desktop.jpg, rc-v3-refined-mobile.jpg, rc-v3-refined-drawer-mobile.jpg, rc-v3-refined-preview-mobile.jpg.
- HTML script node --check passed through worker. npm run build passed, including RC index and canonical-build verification; existing Tailwind/noise asset/mixed import/chunk warnings persist. Generated MCP build stub restored to unchanged HEAD baseline. Existing production RC edits preserved.

All data remains a local fixture; no real adaptive/history query, recording, saving or drill creation occurs. No new independent Claude round requested or performed; prior two-round review applies only to prior artifact versions. No publication or production replacement.

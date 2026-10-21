# Independent inspection record

2026-10-21. User requested Claude review; requested model Opus, observed `claude-opus-5-5`. Codex and its subagents implemented. No prior plan approval is claimed. Prototype approval is not reused.

## Inspection 1: REVISE

Result: `C:/Users/Joshu/AppData/Local/Temp/platform-rc-opus-inspect-20261021/claudex-1hpnk04u/result.json`.

All seven findings accepted:

| Finding | Disposition |
| --- | --- |
| F1 high: pale error, strict-block and shortfall text on transparent paper canvas | Remap inherited ink roles on the open builder; verify actual failure states. Parent reproduced failed Start message rgb(182,182,179) on paper. |
| F2 high: new light text roles dark-on-dark in dark host | Add theme-aware setup/review/lookup roles; verify `?theme=dark` in real-component fixture. |
| F3 medium: Customize Apply during lookup overwrites inactive drafts | Disable Customize during active lookup with explicit clear-first cue; retain strict requirement and restore prior draft/snapshot when cleared. Regression coverage for both underlying methods. |
| F4 low: legacy 980px max width misaligns Back/content | Remove losing cascade so working content and Back share a column. |
| F5 low: primary fill differs from design records | Update records to actual #131718 primary and a visible hover step. |
| F6 low: Hall scrims use obsolete warm black | Match scrim RGB to new dark ground while preserving authored atmosphere. |
| F7 low: raw saved-history failure at Start | Use actionable no-launch history-check error and regression coverage. |

Additional parent audit: Home has its own old neutral token block, now included in the rollout. Apparent dark-host intermediate cream was verified to be a 300ms transition frame; settled host correctly reads #131718 / #EFEDE6. That intermediate sample did not require a fix.

Reviewer traced RC source/cascade, palette owners and theme switching, and viewed desktop Review. It did not run commands/browser, visually inspect all supplied screenshots, deeply trace prior finder/assignment changes, or verify authenticated persistence. Those limits remain explicit.

## Host proof before fixes

161 targeted tests passed (123 builder, 11 saved controls, 27 question preview); typecheck and production build passed. Build warnings include existing chunk size/dynamic imports, ambiguous Tailwind duration utilities, outdated Browserslist and unresolved noise image. Generated Windows MCP stub restored after build.

Browser proof uses actual RC components with fenced synthetic backend adapters. Direct lookup exact IDs, no reveal/start at Review, clearing to automatic draft, automatic identity after timing/reveal changes, manual ordering/Apply/Cancel/empty, exact saving and synthetic Start payload passed. Manual filtered search explicitly identified excluded passage and offered Adjust passage filters. Index and Start failures left recovery actions available. No real session or backend persistence is claimed.

Setup at 1440,980,768,390,320 CSSpx had scrollWidth equal viewport, zoom1, 44px main controls; rendered font was RC Outfit. Computed canvas #F7F4EE, settings #131718, fields #282B2C. Representative shared CSS gallery verified neutral roles, status distinctions and unchanged saved reader dark/highcontrast. It is not authenticated full-platform acceptance.

Evidence directory: `C:/Users/Joshu/Downloads/Platform-Palette-RC-Implementation-2026-10-21/` (before/after setup, Review, mobile picker, platform role samples).

## Inspection 2: REVISE, followed by host-verified CSS repairs

Result: `C:/Users/Joshu/AppData/Local/Temp/platform-rc-opus-inspect2-20261021/claudex-9bgniyd3/result.json`. Observed model again `claude-opus-5-5`. Claude confirmed the seven first-round findings addressed, then identified four further cascade gaps:

- R1 high: expanded Save input and chips inherited dark-control styles on paper. Accepted and fixed with explicit theme-aware input, placeholder, label and chip roles. Reproduced before correction; after correction typed text reads #252B26 on transparent paper, #EFEDE6 on transparent dark canvas. Captured expanded Save with typed name at1440/320 in both themes.
- R2 medium: inherited ink70/62/60/50, exposure status and recovery chips remained pale on paper. Accepted and completed the role mapping, preserving bright roles inside the dark settings surface. Retry now computes #293328 on paper. Warning edges use a legible shared border role.
- R3 medium: Home completed ticks and primary fills collapsed into dark cards. Accepted and routed fills/text through classroom active roles. Browser dark readback: completed ticks and CTA/Continue #EEEBE2, action text #161D18; incomplete ticks remain rgba(255,255,255,.09).
- R4 low: finder trigger on dark landing still used old muted brown. Accepted and broadened the dark selector. Browser dark landing readback #BABCB5 on #131718.

The two-inspection budget is exhausted. Final CSS repairs were checked by Codex in the browser and parsed/built, but **no independent approval or third inspection is claimed**. No TS behavior changed after the final passing 164-test run (126 builder,11 saved controls,27 question preview). Typecheck passed. Final build outcome is reported in the accompanying verification report.

Additional limit: the unused exported standalone RcHub wrapper is not routed by App.tsx; production consumers of RcHubSurface are embedded. This task verified the routed embedded experience. The obsolete standalone wrapper was not expanded into new scope.

No commit, push or deployment performed.

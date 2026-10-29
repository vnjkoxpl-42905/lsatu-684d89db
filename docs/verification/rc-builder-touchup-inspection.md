# RC builder inspection and local touch-up

2026-10-28. Local work only. Branch codex/rc-builder-touchup-20261028, base 9b1eec11. No commit, push, merge or publication.

## What the inspection found

The reported menu is the direct passage lookup in RcHubSurface. Seven native selects used designed fields but browser-owned popup menus: PT, section, passage, timing, reveal, practice history and sort. These were the confirmed inconsistency. No additional material behavior defect was demonstrated by the source inspection. Narrow timing labels and nested drawer menus need explicit browser checks.

| Flow | Source/test inspection |
| --- | --- |
| Automatic and specific-passage entry | Shared RcHubSurface, route-driven entry and independent drafts retained |
| Direct address lookup | Authoritative index, upstream reset, complete-address requirement, prior reviewed selection restored on Clear |
| Customize | Transactional filters/training drafts, Apply/Cancel/Close/Escape, focus return |
| Passage picker | Search, status/filter exclusions, sort, 12-row pagination, preserved picks and order |
| Conditions | Profile timing loading, URL timing, custom validation, reveal configuration |
| Review | Exact IDs/order/count, Edit/reroll, no automatic text/answer exposure |
| Exposure and protected work | Strict exposure recheck, hidden-result boundaries, assignment/training restrictions |
| Launch and recovery | Shortfall acknowledgment, duplicate Start guard, owner-scoped uncertain-response recovery |
| Saved work | Contextual recipe/fixed saving, exact selection and settings retained |

Read-only recon covered RcHubSurface.tsx, rcBuilderRefinement.css, rc.css, RcHubSurface.test.tsx, saved-set controls and the existing preview harness. Relevant tests include lookup restore, transactional drawer drafts, pagination/search/order, timing, exposure and lost-response recovery. This is scoped RC builder coverage, not an audit of every RC player/backend path.

## Implemented

RcBuilderSelect uses existing Radix primitives without changing shared UI. Lookup fields use paper surfaces and labeled/resettable values; conditions/drawer controls use charcoal surfaces. Menus have explicit portal palettes, a 288px/available-space height limit, trigger width, 44px rows, selected checks, keyboard/typeahead support and focus states. Reset sentinels preserve blank-field behavior. Stale values display placeholders without mutating the parent draft. CSS preserves existing layout and scopes all new treatments to RC.

All seven handlers preserve the original domain logic. Native-select tests now open actual Radix menus, query portaled options globally and check rendered labels. Local jsdom stubs do not affect the global test setup. Regression cases cover stale values, per-field reset, disabled options, dynamic profile labels, keyboard Enter and nested Escape/focus return. The dependent-reset integration case also passes in the final run.

The local harness now supports bank=real (static bank loader only; synthetic account/backend adapters), dark and docked query modes for the remaining checks. The real static bank, dark drawer and docked mode were exercised locally.

## Final verification, 2026-10-29

- Final focused suite: 188 tests passed, zero failed. Typecheck and full production build passed after restoring locked dependencies with bundled Node 24.22.1. No package manifest or lock change. The pre-existing omitted DOM test peer is supplied through an ignored local junction to the existing checkout.
- Browser: actual static-bank PT options 101 to 159 loaded. Keyboard End scrolled to 159; Enter selected it and enabled section while passage/review remained guarded. Phone menu opened within the viewport. Measured CSS widths 390, 320 and 768 had no document horizontal overflow. Inspected paper menu and dark docked drawer, including menu above drawer and Escape closing only menu with focus returned to sort.
- Manual flow: selected Marine ecosystems, Apply preserved it, Review showed exact PT140/S3/P1 and kept text/answers hidden, synthetic Start readback contained passage ID1188, 525 seconds per passage and per-passage reveal. No production write. Emulation cleared.
- Screenshots: rc-touchup-real-menu.jpg, rc-touchup-phone-menu.jpg, rc-touchup-dark-drawer.jpg. These are local harness evidence, not signed-in production acceptance. Small-screen long labels truncate within triggers; full text remains in menus. Touch-device and screen-reader testing were not run.
- Earlier dependency installation failures were environment-only and recovered. Build retains existing chunk-size/Tailwind warnings. First inspection was interrupted by a tool restart. The fresh Claude inspection APPROVED with three low items, now addressed for final reinspection.
- Vite generated a Windows-path MCP stub during this run. Initial attribution as unrelated was wrong. A diagnostic copy was preserved in Temp and the original bundle restored; no backend diff remains.

All changes remain local and uncommitted. Backend/player correctness beyond the scoped builder suite and production release acceptance are outside this proof.

## Final low-item dispositions

F1: menu width now has a viewport-clamped 160px floor and word-safe wrapping. Verified/reset label captured at 320px and 390px.
F2: test helper asserts full rendered labels exactly; the 52.5/70 profile cases explicitly require Profile pace 13:08/17:30. All188 tests reran successfully.
F3: added 320 menu, 768 layout, light docked and middle-of-long-list (124 through128) screenshots. Tablet/phone timing now occupies its own row, avoiding the very narrow half-width control. Existing labels may truncate at constrained dock widths; opening the menu shows the full text. Before/after parity at every viewport and the standalone Taste browser inspector remain unperformed. No claim of exhaustive visual acceptance. Host browser checks are separate from Claude source approval.

Claudex plan round2 was APPROVED, exact hash checked. Final code inspection is read-only and scoped. Full responses, coverage and limitations are preserved in rc-builder-touchup-review-log.md. No physical touch-device or screen-reader pass, production write, commit or publication.

## Completed review

Final Claude source inspection APPROVED with no material defects. Three low observations remain: stable data-value testing hook, mouse-specific jsdom event coverage, and real-drawer Escape integration-test coverage (host browser checked the real drawer; automation covers isolated nesting). Full source limitations and dispositions are in the review log. The final production build/postbuild and188 tests passed after low fixes. Documentation was corrected after inspection to identify the Vite-generated MCP side effect accurately; reviewed application code is unchanged.


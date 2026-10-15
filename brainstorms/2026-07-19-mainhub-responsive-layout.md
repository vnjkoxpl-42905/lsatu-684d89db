# Mainhub Responsive Layout: Brainstorm / Discovery Notes

Date: 2026-07-19 · Goal: Confirm the mainhub template structure (sidebar / hero / practice grid / messages sidecar) holds at every viewport size and every sidecar slider width, and decide what "holds" means.

## Context (from code + live review before the grill)

- Shell: fixed 240px sidebar (hidden <768px, becomes hamburger Sheet) + center stage + resizable sidecar (360–640px, capped at 45vw, width persisted in localStorage).
- Mainhub uses container queries (@900 / @980 / @1090 / @1220 on the center stage), so it adapts to the sidecar slider, not just window width. Good architecture.
- Verified live: 1680px default sidecar = 3-col hero, correct. 1280px + maxed sidecar = graceful single-column collapse.
- Untested / suspect: 768–1024px windows with sidecar open (center stage can shrink to ~150–300px); mobile <768; advanced-filter grid breakpoint @1408 may be unreachable; `maxSidecarWidth` floor of 420px lets the sidecar exceed 45vw on narrow windows.

## Summary / key decisions

1. Guarantee covers both window resizing and the sidecar drag slider (Q1).
2. The 3-column hero template is the default look and always wins; the Messages sidecar gives way, never the middle (Q3, Q4).
3. Docked sidecar requires window ≥ ~1520px (sidebar 240 + sidecar min 360 + middle 900 + chrome). Below that it auto-hides and opens as a floating overlay drawer (existing `presentation="floating"` mode of StudySidecar) (Q4).
4. When docked, the drag slider max is capped at `min(640, window − sidebar − chrome − 900)` so the slider physically cannot collapse the template; the old `Math.max(420, …)` floor bug is removed (Q2, Q5).
5. Mobile (<768px) verified healthy as-is; no changes (Q1, evidence).
6. Fix lives in StudentShell, so it protects every page rendered in the shell, not just /mainhub.
7. Q6 backstop: nothing else flagged ("that should be good"). Next step: implement, verify with browser resize sweep, push to main.

## Q&A log

### Q1 — Scope of "sliders"

- Asked: Does the guarantee cover just the sidecar drag handle, or window resizing too?
- Captured: **Confirmed both.** At any window ≥~768px and any sidecar width, the template must degrade in a defined order (3-col hero → stacked hero; 2-col practice grid → 1-col) with no overlap, clipping, or horizontal scroll. Mobile (<768) gets its own sanity check (sidebar → hamburger Sheet).

### Q2 — Minimum center-stage width

- Asked: Should the sidecar be allowed to squeeze the center stage to ~290px, or should there be a floor?
- Captured: **Decision: put a floor under the middle.** Change `maxSidecarWidth` in StudentShell.tsx to also subtract the sidebar (240px) and a center floor (~400–420px): `min(640, windowWidth − 240 − ~420)`, still respecting the 360px sidecar minimum. No overlay-drawer behavior.

### Q3 — Narrow desktop band (768–~1050px)

- Asked: What happens when sidebar + sidecar + usable middle can't all fit?
- Captured: **Decision: auto-hide the docked Messages panel when the window is too narrow.** Joshua's framing (verbatim, cleaned): "the default for anyone opening is that the middle part is clear as I initially sent you — it should always auto-adjust to show this." The middle/template look wins; the Messages panel gives way. When toggled open in the narrow band it should overlay as a drawer rather than push content.

### Q4 — Auto-hide cutoff

- Asked: Where is "too narrow"? Template-strict (~1520px, Messages floats as drawer below that, including 13" laptops) vs softer (~1100px, middle allowed to stack).
- Captured: **Decision: Option A — template always wins.** Below ~1520px window, the docked Messages panel starts hidden and opens as a floating overlay drawer. The 3-column hero template must always be what a visitor sees by default.

### Q5 — Slider cap on wide screens

- Asked: Should the drag handle's max width also be capped so the middle always keeps its 900px (template physically unbreakable via slider)?
- Captured: **Decision: cap the drag.** Sidecar max = min(640, window − sidebar − gaps − 900), never below its 360 min (and if even 360 doesn't fit, it's in auto-hide territory per Q4). On ~2000px windows behavior is unchanged; on ~1600px the panel stops growing sooner.

## Evidence log (live browser sweep)

- 1680px, sidecar 420: 3-col hero, 2-col practice grid. Correct.
- 1280px, sidecar maxed (~576): center stacks to single column. Graceful.
- 1024px, sidecar clamped to ~460: center stage ~290px — no overlap/h-scroll, but phone-column feel, search placeholder clips, robot torso crops. Structurally holds, visually squeezed.
- 390px mobile: healthy. Hamburger Sheet sidebar, fully stacked hero, full-width console, no overflow.
- **768px, sidecar open: BROKEN.** Center stage collapses to a ~55px sliver (one letter per line). Cause 1: `maxSidecarWidth` uses `Math.max(420, min(640, 45vw))` — the 420 floor overrides the 45vw cap on narrow windows (45vw@768 = 345, but it still allows 420). Cause 2: nothing auto-closes the docked sidecar when sidebar (240) + sidecar (≥360) + usable center can't fit.

## Open flags (pending input)

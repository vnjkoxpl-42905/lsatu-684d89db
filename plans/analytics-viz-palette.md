> **SUPERSEDED 2026-08-26.** Merged into `docs/chart-palette.md`, which is now the single
> palette spec. This file is kept for its reasoning trail — the failed bronze-harmonised
> attempt and the series-count ceiling derivation are recorded here and not repeated there.
> Do not take hex values from this file; take them from `docs/chart-palette.md`.

# Analytics viz palette — validated, not hand-picked

Computed 2026-08-26 with the `dataviz` skill's `validate_palette.js` against LSAT U's
actual dark card surface `#121212`. Every value below **passed the six checks**.
Do not substitute a hue by eye — re-run the validator.

```
node scripts/validate_palette.js "<hex,…>" --mode dark --surface "#121212" [--pairs all] [--ordinal]
```
(skill base: `/private/tmp/claude-501/bundled-skills/2.1.240/…/dataviz`)

---

## The finding that shapes the whole design

I first tried a hand-picked "bronze-harmonised" set tuned to LSAT U's accent
(`#d98c4a,#5b9dd9,#3fae87,#b17fd4`). It **failed** — lightness band out of range on all
four, and normal-vision ΔE 14.9 between the jade and the dusty blue, i.e. two of the four
series are hard to tell apart *even with full colour vision*. Muting hues toward the
editorial register pushes them under the chroma/lightness floors. This is exactly the
trap the skill exists to catch.

So the palette below is the skill's validated dark steps, adopted as-is.

### Series-count ceiling — a hard constraint

| Chart form | Pairs that can touch | Max series | Verdict |
|---|---|---|---|
| Bars, stacks, lines, grouped bars | adjacent only | **4** | slots 1–4 PASS (worst adjacent CVD ΔE 8.4, normal 19.8) |
| Scatter, bubble, small multiples, **3D point/mesh fields** | any two | **3** | slots 1–3 PASS (worst CVD ΔE 9.4, normal 20.9) |

Slots 1–4 under all-pairs **FAIL**: `#c98500` ↔ `#d95926` at CVD ΔE 4.8 / normal 10.6.
Yellow beside orange collapses.

**Consequence for the 3D hero:** it must NOT colour the four question-type families by
categorical slot. Any two mesh faces can end up adjacent as the camera orbits, which is
the all-pairs case, and four families breaks it. The hero encodes **accuracy by the
diverging ramp** (the actual magnitude) and separates families by **position/axis**,
not hue. This is better dataviz anyway — colour spent on magnitude, not on re-encoding
what position already shows.

---

## Categorical — series identity

Only for plots with 2+ real series (e.g. a trend line per family). **Not** for the
breakdown table: those bars are all one measure, so they take slot 1 and the family is
carried by the group heading. Never colour nominal bars by their value.

| Slot | Hue | Dark hex | Use |
|---|---|---|---|
| 1 | blue | `#3987e5` | Assumption / Objection family · default single series |
| 2 | orange | `#d95926` | Inference family |
| 3 | aqua | `#199e70` | Match family |
| 4 | yellow | `#c98500` | General / Other — **adjacent-form only** |

Fixed order. Never cycled. A 5th series folds to "Other" or facets.

## Sequential — magnitude (heatmaps, cell fills, density)

One hue, blue, light→dark. Full range `100→700`:

`#cde2fb · #b7d3f6 · #9ec5f4 · #86b6ef · #6da7ec · #5598e7 · #3987e5 · #2a78d6 · #256abf · #1c5cab · #184f95 · #104281 · #0d366b`

## Ordinal — difficulty L1→L5  ✅ PASS

`#b7d3f6 · #86b6ef · #5598e7 · #2a78d6 · #184f95`

Monotone lightness, all adjacent ΔL ≥ 0.06, dark end `#184f95` clears the surface at
2.31:1. Difficulty is ordinal, not categorical — swapping L2 and L4 would change the
meaning, so the order must be visible *in the colour*.

## Diverging — accuracy vs the 85% target  ✅ PASS (both arms)

| Arm | Steps (mid → strong) | Light-end contrast |
|---|---|---|
| Below target | `#f0a3a3 · #e66767 · #c9403f` | 3.83:1 |
| Above target | `#9ec5f4 · #5598e7 · #256abf` | 3.47:1 |
| Neutral midpoint | **`#52524e` minimum** | 2.39:1 |

**Do not use `#383835`** — the skill's reference neutral. It sits at 1.59:1 on our
`#121212`, below the 2:1 floor, because LSAT U's surface is darker than the reference's
`#1a1a19`. `#454542` also fails at 1.95:1. `#52524e` is the lightest failing-to-passing
boundary; `#5c5c58` (2.79:1) is the safer pick.

**Why blue↔red and not the app's emerald↔rose.** `#0fb781` / `#f53d5c` are the drill
zone's *status* colours. Two reasons they stay out of the charts: status colours are
reserved and never double as a scale, and green↔red is the single worst pairing for
colour-vision deficiency. Blue↔red is the CVD-safe warm/cool pair. The good/bad reading
is carried by the number and the direction arrow beside it, never by hue alone.

## Status — reserved, never a series colour

`#21b659` good · `#f59f0a` warning · `#de3b3b` critical. Always shipped with an icon and
a label. Never assigned to "series 5".

---

## Non-negotiables carried into the build

- **One axis.** No dual-y charts. Accuracy and volume are two charts or indexed to a common base.
- **Colour follows the entity, not its rank.** Changing the timeframe filter must not repaint the surviving series.
- **Legend present for ≥2 series**, ≤4 also direct-labelled. Identity is never colour-alone.
- **Text wears text tokens** (`#fafafa` / `#a3a3a3`), never the series colour.
- **2px surface gap** between adjacent fills and stacked segments; 4px rounded data-ends anchored to the baseline; 2px lines; ≥8px markers.
- **Hover layer by default** — crosshair + tooltip on line/area, per-mark tooltip on bar/dot/cell. The only exception is a bare stat tile with no plot.
- **Truthfulness contract holds in colour too.** No attempts → em dash and an unfilled track, never a 0%-coloured mark. A cell with n < 3 renders at reduced chroma with the sample size stated in the tooltip.
- **A table view exists for every chart** — `BreakdownTable` already is one; keep it as the accessible fallback, not an afterthought.
- **Validate before shipping.** Any new hue re-runs the script. Screenshot and eyeball the render for label collisions — the validator checks colour, not layout.

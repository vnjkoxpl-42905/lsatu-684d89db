# Design

> Scope: **LSAT U drills / labs** (the runnable practice surfaces under `src/bootcamps/main-conclusion/modules/drills/`). This is the unified drill design language. Lessons and other bootcamp surfaces keep their own warm-serif identity; drills are deliberately a distinct, sleeker zone.
>
> Origin decision: the two existing drills disagreed visually. `FirstSentenceVsRebuttalLab` (Apple-HIG, near-white, system sans) and `ConclusionTypeLab` (warm cream, serif, gold). Rather than pick one, we define **one new unified drill system** and re-skin both up to it. The direction is **refined, nuanced, high-end Apple**, not brand-colored: no gold, no blue, no decoration. Color carries meaning, never identity.

## Visual Theme

Refined, sleek, high-end. Apple-HIG restraint applied to a study tool. Near-white surface, generous whitespace, crisp white work-cards floating on soft shadows, a near-monochrome graphite palette. The interface recedes; the argument and the student's thinking are the only things with color. Calm, premium, never clinical, never candy.

The drill is its own visual zone, distinct from the warm-serif lessons. A student moving from a lesson into a drill should feel they have entered a focused workspace, not a different product.

## Color Palette

Strategy: **Restrained / near-monochrome.** A single graphite-to-gray ramp does all structural work. There is no chromatic accent. Chromatic color appears only to signal state (correct, the student's wrong pick, warning) and is muted, not saturated.

### Neutrals (structure, text, chrome)

| Token | Value | Role |
|---|---|---|
| `page` | `#fafafc` | Page background (cool near-white) |
| `card` | `#ffffff` | Stimulus + controls + review surfaces |
| `control` | `#fbfbfd` | Secondary inset surface (controls card) |
| `ink` | `#1d1d1f` | Primary text; primary button + step-badge fill |
| `ink-secondary` | `#4b4b4f` | Secondary text |
| `muted` | `#86868b` | Supporting copy, step copy |
| `soft` | `#a1a1a6` | Eyebrow labels, faint meta |
| `border` | `#e5e5ea` | Card + control borders |
| `hairline` | `#f0f0f2` | Dividers, lightest separation |

Primary action = `ink` fill with white text. This replaces both FSvR's Apple blue and the bootcamp's gold. Confident, legible, brand-neutral.

### Semantic (state only, muted)

Used **only** to mark meaning. Never decorative, never a brand accent. Tuned slightly more muted than Apple's stock system colors so the surface reads sophisticated, not loud.

| Token | Value | Soft bg | Meaning |
|---|---|---|---|
| `correct` | `#2f9e64` | `#eaf6ef` | The correct answer; a clean step |
| `wrong` | `#e5484d` | `#fdecec` | The student's incorrect pick |
| `warning` | `#d9881f` | `#fbf1e3` | Assisted / recovered / re-run framing |

Per-pick reveal convention (the primary pedagogical mandate): on reveal, the **correct** option paints `correct`, the student's **wrong pick** (if any) paints `wrong`, and unpicked options recede to a dimmed neutral. The reveal copy then teaches the predictable weakness of the correct type, tied to what the student actually chose.

## Typography

System sans throughout. No serif in drills (serif stays in lessons). Reading and chrome share one refined sans stack.

```
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
             Roboto, Helvetica, Arial, sans-serif;
```

Hierarchy by size + weight, Apple-tight letter-spacing (`0`), generous line-height for the stimulus.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Question / hero title | 24px | 650 | Line-height 1.12 |
| Stimulus / argument text | 20px | 400 | Line-height 1.6, the close-reading surface |
| Step title | 18px | 650 | |
| Body / step copy / feedback | 15px | 400–450 | Line-height 1.45 |
| Option label | 15px | 600 | |
| Eyebrow / meta label | 13px | 700 | Uppercase, `soft` color |
| KPI number (review) | 42px | 700 | |

## Motion

Restrained Apple motion. Precise and quick, never expressive. The impeccable no-bounce / no-elastic law holds.

| Token | Value |
|---|---|
| `d-fast` | 150ms |
| `d-mid` | 180ms |
| `d-slow` | 240ms |
| `d-entrance` | 420ms |
| `ease-state` | `cubic-bezier(0.4, 0, 0.2, 1)` (state transitions) |
| `ease-entrance` | `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out, entrance only) |

- **Animate only:** `opacity`, `color`, `border-color`, `box-shadow`, `width` (progress bar), and `transform: translateY` for entrance. Never animate layout properties.
- **Entrance:** each new question view fades in with an 8px rise. Nothing else moves.
- **State changes** (select, reveal, correct, wrong) read through color and a crisp icon, resolved with a fast `ease-state` transition. No motion theatrics.
- **Explicitly dropped from FSvR:** success scale-pulse, glow halos, wrong-answer shake/flash, infinite breathing pulse.
- `prefers-reduced-motion: reduce` collapses all durations to 0ms and removes the entrance transform.

## Components

The drill is built from a fixed anatomy so every lab reads as the same surface. `FirstSentenceVsRebuttalLab` is the structural template; the skin is this system.

1. **Top bar.** Right-aligned. A subtle "Saved" autosave pill (fades in then out, `soft` text + small `correct` dot) and a pill Home / back-to-drill link (`border`, white, `muted` text).
2. **Header.** Eyebrow (lab name, 13px/700 uppercase, `soft`) on the left, counter on the right (`n / total · k right`, tabular). Question title (24px/650) below. Then a thin progress bar: graphite (`ink`) fill on a `hairline` track, `width` transition.
3. **Stimulus card.** White, radius 20, `shadow-stimulus`, padding 32-40. Eyebrow "READ FIRST". Argument at 20px/1.6. The isolated conclusion sits in an inset sub-block (neutral `control` fill, `border`, labeled "THE CONCLUSION").
4. **Options.** Neutral cards in a responsive grid (2-up desktop, 1-up mobile). Resting: white, `border`. Hover: `border` darkens, 1px rise. Selected: `ink` border + `#f5f5f7` fill. After submit, unpicked options dim to ~0.7 and lose border weight. On reveal: correct option paints `correct` (soft bg + border + check icon), the student's wrong pick paints `wrong` (soft bg + border + x icon).
5. **Reveal / teach block.** Appears in-flow after submit. Opens with a short status label (`Named it` in `correct`, or `It is a {type}` in `warning`), then the explanation that teaches the predictable weakness the correct type carries, written to the student's actual pick. This block is the point of the drill; it gets room.
6. **Buttons.** Primary: `ink` fill, white text, pill (`r-full`), 44px min height. Secondary / subtle: white, `border`, `ink` text. Disabled: 0.66 opacity, no hover.
7. **Footer nav.** Prev / Next pills, separated from the body by a `hairline` top border.
8. **End-of-set review.** Adapted from the FSvR review, in this skin:
   - **Verdict** (reuses `DrillVerdict` framing): `Calibrated.` at or above threshold, `Re-run open.` below. Score, coach line, concrete next step. Never "Failed," never a grade.
   - **KPI**: clean-first-try count `k / total` and percent.
   - **Where it slipped**: a per-type breakdown (each conclusion type with its miss count), the conclusion-type analogue of FSvR's per-component breakdown.
   - **Callouts**: strongest type (soft `correct`) and weakest type (soft `warning`), the place to start the next review.
   - **Answer key**: a grid of 44px tappable cells, one per item, bordered by status color, tap to revisit that item's reveal.
   - **Per-question cards**: expandable, each holding the item's explanation.
   - **Status taxonomy** (adapted): `clean` (correct first try), `missed` (wrong). Add `recovered` only if a retry path is offered. FSvR's `assisted` does not apply unless a hint/reveal-all is added.

## Layout

Single centered column. One canonical structure for every drill.

| Token | Value |
|---|---|
| Content width | `min(100%, 760px)`, centered |
| Page padding | 32px desktop, 16-18px mobile |
| Section gap | 20-24px |
| Card padding | 28-40px (stimulus roomiest) |
| Radius: card | 20px |
| Radius: inset / control / feedback | 14px |
| Radius: small (chip, key cell) | 8-12px |
| Radius: pill (button, progress, chip) | 9999px |
| Border | `#e5e5ea`; hairline `#f0f0f2` |
| `shadow-stimulus` | `0 20px 48px rgba(0,0,0,0.05)` |
| `shadow-control` | `0 10px 26px rgba(0,0,0,0.035)` |
| `shadow-soft` | `0 4px 16px rgba(0,0,0,0.035)` |
| Spacing base | 4px |
| Breakpoints | 900px (grids collapse to 1-up), 640px (full-width buttons, tighter padding) |
| Focus ring | `outline: 3px solid rgba(29,29,31,0.35); outline-offset: 2px` (graphite, no accent hue) |

Touch targets meet 44x44px. Color contrast holds WCAG AA against the near-white surface (graphite text and `ink` buttons clear it comfortably; muted semantic colors are used for fills with sufficient-contrast text, not as small text on white).

## What this replaces

- `ConclusionTypeLab` is rebuilt to this system (it currently uses generic `Card` primitives and the warm-serif tokens).
- `FirstSentenceVsRebuttalLab` keeps its structure but is re-skinned off its self-contained Apple-blue CSS onto these tokens, so the two drills finally match.
- New drills compose this anatomy rather than inventing their own.

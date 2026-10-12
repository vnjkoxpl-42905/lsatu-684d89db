# Activities Design System

> The visual + structural contract for the Activities Centre (standalone skill
> drills like Negation Station). Activities **fit the bootcamp's warm tactile
> workbook** (`DESIGN.md`): same warm paper surfaces, same Inter + Georgia type,
> same soft depth and calm motion. The one thing each activity keeps for itself
> is a single accent hue. Strategy, users, voice, and anti-references come from
> `PRODUCT.md`. Plain-language term definitions live in `ACTIVITIES-CONTEXT.md`.
>
> Status: v0.2. Covers the activity homepage (intro). Running and completion
> anatomy are intentionally not specified yet (see TODO at the end).
>
> Changed in v0.2 (2026-06-14): retired the standalone cool-emerald "distinct
> world." Activities now share the bootcamp's warm workbook palette and type;
> only the accent stays per-activity. Simpler homepage: the loud two-tone
> full-bleed banner is gone, replaced by a calm warm-paper reading column.

## 1. Principles

1. **Same family as the workbook.** Activities are not a separate visual world. They use the bootcamp's warm cream paper canvas, warm ink, layered paper surfaces, and soft depth, so a drill feels native to the rest of the product.
2. **One accent per activity.** Structure, type, spacing, radius, and motion are fixed and identical across activities and shared with the workbook. Each activity supplies a single accent hue used only on small signals (eyebrow, numerals, chips, the Start button). Negation Station = emerald.
3. **Calm, not loud.** A single centered reading column on warm paper. No full-bleed colored banner, no large drenched zones. Identity comes from the accent used sparingly, not from a wall of color.
4. **Teaching-first.** The how-it-works steps and the worked example are the heroes. Chrome recedes.
5. **Modern learning app, anti-arcade.** No streaks, XP, or confetti (PRODUCT.md anti-references). Energy is quiet and earned.
6. **Reuse the system.** lucide-react icons, framer-motion v12 for motion, Inter + Georgia. Scope all tokens under one `.act-home` wrapper.

## 2. Typography (shared with the bootcamp)

- **Title + UI**: **Inter** (already loaded), weights 400/500/600/700/800. The activity title is Inter 800, tight tracking, Title Case.
- **Reading prose** (tagline, the "why" line): **Georgia** serif, `font-feature-settings: 'liga' 1, 'kern' 1`, as in the workbook stimulus/explanations.
- Micro-labels (eyebrow, card labels) are uppercase with wide tracking. No bespoke display font; Clash Display was removed in v0.2.

## 3. Token contract

All tokens are HSL triplets (matching the repo convention), scoped under `.act-home`. A per-activity palette fills only the accent slot; the warm paper skeleton is fixed and mirrors the bootcamp. See `src/features/activity-centre/activities-home.css` for the live source.

### Per-activity accent slot (Negation Station = emerald)
| Token | Value (NS) | Role |
|---|---|---|
| `--act-accent` | `160 84% 32%` | eyebrow, numerals, chips, marks |
| `--act-accent-strong` | `161 88% 24%` | Start button, hover marks |
| `--act-on-accent` | `40 44% 97%` | warm off-white text on the accent |

### Fixed warm-paper surfaces (identical across activities, matches DESIGN.md)
| Token | Value | Role |
|---|---|---|
| `--act-canvas` | `38 36% 93%` | warm cream paper base, NOT white |
| `--act-canvas-2` | `40 46% 96%` | lighter cream for the radial highlight |
| `--act-surface` | `40 50% 98%` | cards, above canvas |
| `--act-ink` | `30 17% 9%` | warm near-black body text |
| `--act-ink-soft` | `30 8% 36%` | secondary text |
| `--act-hairline` | `36 20% 84%` | soft warm borders |

### Fixed skeleton
- Radius (matches the workbook): `--act-r-card: 18px`, `--act-r-button: 10px`, `--act-r-chip: 8px`.
- Depth: soft, ink-tinted, low alpha (`--act-shadow-1` resting, `--act-shadow-2` raised), as in DESIGN.md.
- Motion: ease `cubic-bezier(0.4, 0, 0.2, 1)`, ~180ms interactions, ~400ms entrance. No bounce. Collapses to instant under `prefers-reduced-motion`.

### Guardrails (a per-activity palette is valid only if all pass)
- Canvas stays warm (hue 20-60), light (L >= 90%), and only lightly saturated, never white, never cool gray, never the app's dark. Same as DESIGN.md G1.
- Body ink contrast >= 4.5:1 on canvas and surface; large text >= 3:1 (WCAG AA, the PRODUCT.md floor).
- The accent is a signal, not a wash: saturated accent only on the eyebrow, numerals, chips, marks, and the Start button. Never a full background.
- Visible accent focus ring on every interactive element. Touch targets >= 44x44px. `prefers-reduced-motion` honored.

## 4. Component anatomy: Activity homepage (intro)

The reusable intro template, top to bottom, in a single centered warm-paper
column (max-width ~44rem). Implemented in
`src/features/activity-centre/components/ActivityIntro.tsx`.

1. **Header.** A small accent eyebrow ("N items"), the title in Inter 800 Title Case, and the subtitle in Inter soft ink. No colored banner.
2. **Tagline.** `instructions.tagline` in Georgia prose on the warm canvas.
3. **How it works (numbered steps).** `instructions.rules[]` as a numbered 1 / 2 / 3 list, each step with a small accent numeral marker. Never a paragraph wall.
4. **Worked example (before to after, two paper cards).** A before card (the statement) and an after card (all credited answers as accent chips) side by side with a directional arrow between (stacks vertically with a down arrow on mobile). The explanation sits in Georgia below both cards.
5. **Task line.** `instructions.task` emphasized, directly above the button.
6. **Start.** `--act-accent-strong` button labelled by action ("Start drilling"), soft hover lift, accent focus ring, >= 44px target.

Motion: sections fade up gently in sequence on mount (header, tagline, steps, example, task, button), ease-out, collapsing to instant under reduced-motion.

A future activity reuses this exact anatomy with a different accent hue and its own copy.

## 5. TODO (not yet specified)
- Running / question phase anatomy in this world (currently uses the older `.activity-centre` tokens).
- Completion / review phase anatomy (currently leads with a large score; PRODUCT.md anti-references warn against the score-screen-as-ending).
- A documented per-activity accent palette set for activities beyond Negation Station (each must still pass the warm-canvas guardrails above).

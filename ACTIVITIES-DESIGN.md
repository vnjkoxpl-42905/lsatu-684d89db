# Activities Design System

> The visual + structural contract for the Activities Centre (standalone skill
> drills like Negation Station). This is a NEW distinct world, authored by
> interview, and does NOT inherit the bootcamp workbook `DESIGN.md`. Strategy,
> users, voice, and anti-references come from `PRODUCT.md`. Plain-language term
> definitions live in `ACTIVITIES-CONTEXT.md`.
>
> Status: v0.1. Covers the activity homepage (intro). Running and completion
> anatomy are intentionally not specified yet (see TODO at the end).

## 1. Principles

1. **Distinct world.** Activities are neither the dark app shell nor the warm bootcamp workbook. They are a bright, confident, color-themed environment of their own.
2. **One skeleton, one accent per activity.** Structure, type, spacing, radius, and motion are fixed and identical across activities. Each activity supplies a single accent hue; the rest of the palette derives from it. (Negation Station = emerald.)
3. **Fully color-themed light.** The canvas itself is a light tint of the activity's accent, not white. Bold accent zones carry identity; reading surfaces stay calm.
4. **Bold geometric.** Confident blocks, strong shapes, large display type, deliberate entrance motion. Not timid, not decorative.
5. **Modern learning app, anti-arcade.** Energy comes from color, type, and motion, never gamification. No streaks, XP, or confetti (PRODUCT.md anti-references).
6. **Reuse the system.** lucide-react icons, framer-motion v12 for motion. Scope all tokens under one wrapper so the world is self-contained and theme-independent (it stays light even when the app is dark).

## 2. Typography

- **Display** (the title, the identity moment): **Clash Display** (Fontshare), weights 600/700. Distinctive geometric. Tight tracking, Title Case.
- **UI + body**: **Inter**, weights 400/500/600/700.
- Hierarchy from scale and weight; aim for at least a 1.25 ratio between steps. Micro-labels (eyebrow, card labels) are uppercase with wide tracking.

## 3. Token contract

All tokens are HSL triplets (matching the repo convention), scoped under `.act-home`. A per-activity palette fills only the accent slot; the skeleton is fixed. See `src/features/activity-centre/activities-home.css` for the live source.

### Per-activity accent slot (Negation Station = emerald)
| Token | Value (NS) | Role |
|---|---|---|
| `--act-deep` | `162 90% 18%` | banner deep zone, hover state. Title sits here. |
| `--act-light-zone` | `152 52% 88%` | banner light zone (holds the eyebrow) |
| `--act-accent` | `160 84% 36%` | numerals, chips, marks |
| `--act-accent-strong` | `161 92% 26%` | Start button |
| `--act-on-accent` | `0 0% 100%` | text on deep emerald / button |

### Fixed surface recipe (tinted by the accent hue)
| Token | Value (NS) | Role |
|---|---|---|
| `--act-canvas` | `160 40% 97%` | tinted light base, NOT white |
| `--act-surface` | `160 32% 99.3%` | cards, above canvas |
| `--act-ink` | `174 28% 11%` | near-black body text |
| `--act-ink-soft` | `174 9% 38%` | secondary text |
| `--act-hairline` | `160 22% 86%` | soft borders |

### Fixed skeleton
- Radius: `--act-r-card: 20px`, `--act-r-button: 12px`, `--act-r-chip: 999px`.
- Shadow: soft, accent-tinted, low alpha (resting `--act-shadow-1`, raised `--act-shadow-2`).
- Motion: ease-out `cubic-bezier(0.22, 1, 0.36, 1)`, ~160ms interactions, ~500ms entrance. No bounce. Collapses to instant under `prefers-reduced-motion`.

### Guardrails (a per-activity palette is valid only if all pass)
- Canvas stays clearly light and only tinted (high lightness, low saturation), never white, never the app's dark.
- Body ink contrast >= 4.5:1 on both canvas and surface; large text >= 3:1 (WCAG AA, the PRODUCT.md floor).
- Saturated accent only on the banner, button, numerals, chips, and marks, never as a reading-text wash.
- Visible accent focus ring on every interactive element. Touch targets >= 44x44px. `prefers-reduced-motion` honored.

## 4. Component anatomy: Activity homepage (intro)

The reusable intro template, top to bottom. Implemented in
`src/features/activity-centre/components/ActivityIntro.tsx`.

1. **Banner** (full-bleed, two-tone vertical split). Edge-to-edge strip, no outer rounding. Left zone deep emerald with the title in Clash Display Title Case (reversed-out) and the subtitle in Inter; right zone lighter emerald with the "N items" eyebrow. On mobile the zones stack.
2. **Tagline.** `instructions.tagline` in Inter on the tinted canvas, comfortable reading width.
3. **How it works (numbered steps).** `instructions.rules[]` as a numbered 1 / 2 / 3 list, each step with an emerald numeral marker. Never a paragraph wall.
4. **Worked example (before to after, two cards).** A before card (the statement) and an after card (all credited answers as chips) side by side with a directional arrow between (stacks vertically with a down arrow on mobile). The explanation sits as a calm line below both cards.
5. **Task line.** `instructions.task` emphasized, directly above the button.
6. **Start.** Large `--act-accent-strong` button labelled by action ("Start drilling"), confident hover (lift + deepen), accent focus ring.

Motion: sections stagger up in sequence on mount (banner, tagline, steps, example, task, button), ease-out, collapsing to instant under reduced-motion.

A future activity reuses this exact anatomy with a different accent hue and its own copy.

## 5. TODO (not yet specified)
- Running / question phase anatomy in this world (currently uses the older `.activity-centre` tokens).
- Completion / review phase anatomy (currently leads with a large score; PRODUCT.md anti-references warn against the score-screen-as-ending).
- A documented per-activity accent palette set for activities beyond Negation Station.

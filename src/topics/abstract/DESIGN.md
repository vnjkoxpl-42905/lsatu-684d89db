---
name: Abstract Bootcamp
description: The Translation Codex — a cream-paper editorial surface for decoding LSAT-ese into plain English.
colors:
  paper: "#F4EDE0"
  paper-lift: "#FAF6EE"
  paper-deep: "#EBE3D2"
  ink: "#181612"
  ink-soft: "#605850"
  ink-faint: "#8B8378"
  rule: "#C8B999"
  oxblood: "#8B2C1F"
  oxblood-deep: "#6B1F15"
  ink-forest: "#274939"
  bucket-assumption: "#6B2F66"
  bucket-causal: "#B14F1E"
  bucket-comparison: "#1F6680"
  bucket-evidence: "#2A3E7A"
  bucket-evaluation: "#8B2C1F"
  state-success: "#22c55e"
  state-warn: "#f59e0b"
  state-error: "#dc2626"
  state-again: "#f43f5e"
  state-easy: "#10b981"
typography:
  display:
    fontFamily: "Newsreader, ui-serif, Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  display-italic:
    fontFamily: "Newsreader, ui-serif, Georgia, serif"
    fontStyle: "italic"
    fontWeight: 500
    fontSize: "clamp(1.5rem, 2.6vw, 1.85rem)"
    lineHeight: 1.18
  h2:
    fontFamily: "Newsreader, ui-serif, Georgia, serif"
    fontSize: "clamp(1.5rem, 2.6vw, 1.85rem)"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.008em"
  h3:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  body-prose:
    fontFamily: "Newsreader, ui-serif, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.72
  small:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
  eyebrow:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.16em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.04em"
  marginalia:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontStyle: "italic"
    lineHeight: 1.55
rounded:
  sharp: "0"
  sm: "0.125rem"
  md: "0.25rem"
  lg: "0.4rem"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
  "10": "2.5rem"
  "12": "3rem"
  "16": "4rem"
components:
  codex-btn-primary:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.paper-lift}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1.2rem"
    typography: "{typography.body}"
  codex-btn-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.55rem 1rem"
    typography: "{typography.body}"
  codex-stamp-btn:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 1rem"
    typography: "{typography.display-italic}"
  codex-chip:
    backgroundColor: "{colors.paper-lift}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.md}"
    padding: "0.3rem 0.6rem"
    typography: "{typography.mono}"
  codex-card:
    backgroundColor: "{colors.paper-lift}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "1.5rem"
    typography: "{typography.body}"
  codex-card-soft:
    backgroundColor: "{colors.paper-lift}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "1rem"
  drill-answer:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.85rem 1rem"
    typography: "{typography.body}"
---

# Design System: Abstract Bootcamp · The Translation Codex

> Scope: this DESIGN.md governs only the Abstract topic surfaces (`/topics/abstract/*`, `src/topics/abstract/`). Strategy lives in the root `PRODUCT.md`. App-wide app-shell surfaces (foyer, messenger, admin, drills outside this topic) are out of scope. The frontmatter is normative; prose contextualizes how to apply it.
>
> All cream-paper styling is scoped to the `.topic-abstract` wrapper class (set on `AbstractTopicPage`) and lives in `topic-styles.css` + `topic-fonts.css`. The app's `.light` / `.dark` theme classes do not affect the topic; the topic always renders cream.

## 1. Overview

**Creative North Star: "The Translation Codex."**

The Abstract bootcamp is a reading-and-decoding surface, not a dashboard. Its job is to teach a student to take a dense LSAT answer choice or stimulus written in LSAT-ese and translate it into a plain-English picture. The visual language honors that act: warm cream paper, editorial serif type, scholarly oxblood accent, marginalia-style annotations, ink-stamp result feedback. It reads less like a SaaS surface and more like a critical edition of a difficult text.

This bootcamp explicitly does not look like Intro to LR (which lives in a dark Aspiring Gold workbook idiom). Where Intro to LR is a workshop, Abstract is a library. Where Intro to LR uses Fraunces and Outfit, Abstract uses Newsreader and Hanken Grotesk. Where Intro to LR runs on a near-black surface, Abstract runs on warm cream paper. The bootcamps share a parent app and a parent product but speak in distinct dialects.

The bootcamp explicitly rejects: card-grid dashboards (7Sage / Khan Academy LSAT shape), SaaS-cream startup aesthetic with pastel gradient blobs and rounded-pill buttons (this surface uses real editorial cream, ink hairlines, and oxblood stamp shapes), Duolingo-shaped reward chrome (streak flames, XP bars, mascot animations), hero-metric tiles, generic AI dark-mode dashboards, and any treatment that asks a student to feel rewarded rather than read.

**Key Characteristics:**

- Warm cream paper canvas (`#F4EDE0`) with subtle SVG noise grain. No flat backgrounds anywhere.
- Editorial serif display + body prose (Newsreader). Humanist sans for UI (Hanken Grotesk). Mono for identifiers and LSAT-ese callouts (JetBrains Mono).
- Single bold accent: oxblood (`#8B2C1F`). Used for the focus ring, primary CTA, drop caps, the `§` section glyph, and the evaluation translation bucket (which it shares semantically).
- Translation-bucket tokens render as muted watercolor washes on cream paper, not saturated digital fills.
- Drop caps on the first paragraph of every chapter section. Editorial-magazine layout, not blog-post layout.
- Asymmetric two-column spread on desktop (`.codex-chapter-spread`): body prose plus marginalia rail. Single column on mobile.
- Drill correct/incorrect feedback rendered as ink-stamp typography (italic serif, soft rotation, hairline border in oxblood or forest), not as flat green/red fills.
- Motion is one well-orchestrated page-load reveal per route (`.codex-reveal-stack`), staggered 80 ms between siblings, transform + opacity only, respects `prefers-reduced-motion`.
- Tightened radii. Card corners drop to `0.25rem` from `1rem`. Stamp buttons stay full-pill. Most rules are hairline.

## 2. Colors

The palette is warm cream paper, two ink tones, one bold scholarly accent (oxblood), and five muted translation-bucket washes.

### Primary

- **Oxblood** (`#8B2C1F`, HSL `8 64% 33%`): the single bold accent in the system. Used on the primary CTA, the focus-visible ring, the section-mark glyph `§`, drop caps, the cleared-state stamp border, and the evaluation translation bucket. Reserved territory; never decorative.
- **Oxblood Deep** (`#6B1F15`): pressed-state inset on primary CTA. Inset stroke under the ink-stamp shape.

### Paper

- **Paper** (`#F4EDE0`, HSL `38 46% 92%`): the topic surface background. Warm cream with intentional yellow-brown tint. Never `#fff`, never `#fafaf9`.
- **Paper Lift** (`#FAF6EE`, HSL `36 38% 96%`): card and elevated-panel surface. Reads as paper-on-paper.
- **Paper Deep** (`#EBE3D2`, HSL `34 26% 86%`): hover-surface fill and secondary chip background.

### Ink

- **Ink** (`#181612`, HSL `30 16% 9%`): primary text. Off-black with a warm tint; never pure black.
- **Ink Soft** (`#605850`, HSL `30 8% 35%`): secondary text, eyebrows, meta copy.
- **Ink Faint** (`#8B8378`, HSL `30 6% 50%`): tertiary text, footnotes, attribution.
- **Rule** (`#C8B999`, HSL `34 22% 72%`): warm tan hairline borders.

### Translation Buckets (cream-paper watercolor)

These five colors are the only colors used inside chapter prose. Defined in `topic-styles.css`. Each renders as inline text (foreground color + ~16% alpha wash, `box-decoration-break: clone`).

- **Assumption Mulberry** (`#6B2F66`, HSL `304 38% 30%`): assumption-language words (e.g. "presupposes", "takes for granted").
- **Causal Sienna** (`#B14F1E`, HSL `22 75% 40%`): causal-language words (e.g. "phenomenon", "hypothesis", "accounts for").
- **Comparison Teal** (`#1F6680`, HSL `197 60% 32%`): comparison-language words (e.g. "analogous", "similarly", "parallels").
- **Evidence Ink Blue** (`#2A3E7A`, HSL `223 49% 32%`): evidence / relevance language (e.g. "lends support to", "most strongly supports").
- **Evaluation Oxblood** (`#8B2C1F`, HSL `8 64% 33%`): evaluation language (e.g. "undermines", "sufficient", "necessary"). Shares hue with the primary accent; this is intentional. Evaluation is the move the accent symbolizes.

### State

- **Ink Forest** (`#274939`, HSL `150 36% 22%`): correct-attempt ink-stamp text. Used only on the `.codex-stamp-correct` element.
- **State Success** (`#22c55e`): legacy success token, app-wide. Rarely surfaced on this surface; ink-forest stamp carries the affordance.
- **State Warn** (`#f59e0b`): bonus / stretch indicator (D8 "Bonus stretch" pill).
- **Again** (`#f43f5e`) / **Easy** (`#10b981`): legacy flashcard rating tokens. Recolored to oxblood / ink-forest stamp shapes in the Codex idiom.

### Named Rules

**The One-Accent Rule.** Oxblood is the only bold color on the page. It appears on at most three elements per visible viewport: the primary CTA, the focus ring (when something is focused), and the `§` glyph or drop cap. If a fourth oxblood element appears, redesign.

**The Watercolor-Token Rule.** Translation-bucket colors render as inline tokens inside running prose only, via `HighlightToken` and the `translation-bucket-*` classes. Never as chip backgrounds, card borders, button fills, or status badges. The bucket color travels with the language category, exclusively.

**The Paper-on-Paper Rule.** Lifted surfaces use `paper-lift` (`#FAF6EE`) on the cream `paper` (`#F4EDE0`) background. The contrast is intentional and subtle. No drop shadows on cards by default; depth comes from tonal layering plus a single hairline border in `rule` (`#C8B999`).

**The Tinted-Neutral Rule.** No `#000`, no `#fff`, no pure-greyscale neutrals. Every neutral on this surface is warm-tinted. The ink is off-black with a warm cast; the paper is cream with a yellow-brown cast; the rule color is warm tan. The whole palette sits inside a narrow warm-neutral band.

## 3. Typography

**Display Font:** Newsreader (with `ui-serif`, Georgia fallbacks). Distinctive optical-size axis; italic with character.
**Body Font:** Newsreader for chapter prose; Hanken Grotesk (with `ui-sans-serif`, `system-ui` fallbacks) for UI sans.
**Mono Font:** JetBrains Mono (with `ui-monospace`, `SFMono-Regular` fallbacks). Used for identifiers, LSAT-ese callouts, and eyebrow labels.

**Character:** the Codex is editorial. Newsreader's optical-size axis lets the display variant feel like a magazine masthead while the body variant reads like serious long-form prose. Hanken Grotesk is the UI voice: humanist, distinct from Inter, friendly without being soft. JetBrains Mono carries the LSAT-ese-as-code metaphor: identifier chips, mono eyebrow labels, the `(A)` / `(B)` answer prefixes all live in mono.

### Hierarchy

- **Chapter H1** (Newsreader 600, `clamp(2rem, 4vw, 2.75rem)`, `1.08`): once per chapter. Inside the `chapter-reader` prose.
- **Section H2** (Newsreader 600, `clamp(1.5rem, 2.6vw, 1.85rem)`, `1.18`): section titles. Prefixed automatically with an italic oxblood `§` glyph via `::before`.
- **Subsection H3** (Hanken Grotesk 600, `1.05rem`, `1.3`): subsections inside a chapter section.
- **Drill H1** (`.codex-display`, Newsreader 500, `1.5rem` typical, optical-size axis): drill page titles.
- **Body** (Hanken Grotesk 400, `0.9375rem`, `1.6`): UI prose, drill prompts, button labels.
- **Body Prose** (Newsreader 400, `1.0625rem`, `1.72`): chapter prose only. Capped at `prose-* max-w-prose` (~65ch).
- **Small** (Hanken Grotesk 400, `0.8125rem`, `1.55`): metadata, captions.
- **Eyebrow** (`.codex-eyebrow`, JetBrains Mono 500, `0.6875rem`, tracking `0.16em`, uppercase): section-prefix labels above titles.
- **Mono** (JetBrains Mono 500, `0.75rem`, tracking `0.04em`): identifier chips, method numbers, option-letter prefixes `(A)`, `(B)`.
- **Marginalia** (`.codex-marginalia`, Hanken Grotesk 400 italic, `0.8125rem`, `1.55`): right-rail footnotes and gloss notes on chapter sections.

### Named Rules

**The Drop-Cap Rule.** The first paragraph after every `<h2>` in the chapter reader receives a 3.6rem Newsreader drop cap in oxblood (via CSS `:first-letter`). One drop cap per section. Adds editorial gravity to section openings.

**The Section-Mark Rule.** Every `<h2>` in the chapter reader is prefixed with an italic oxblood `§` glyph (via CSS `::before`). The mark carries the surface's scholarly identity without requiring a manual character in the markdown source.

**The 65ch Rule.** Chapter prose caps at 65 characters per line via Tailwind `prose` defaults. Reading column over content density.

**The Eyebrow-Display-Marginalia Rule.** Every page-level surface leads with `eyebrow (mono) + display title (serif) + supportive paragraph (sans)`. Marginalia, where present, sits in the right rail on desktop, inline below on mobile.

## 4. Elevation

The Codex is **mostly flat with hairline rules**. Depth comes from:

1. **Tonal layering.** Paper-on-paper: `paper-lift` (`#FAF6EE`) on `paper` (`#F4EDE0`) is enough to lift a card.
2. **Hairlines.** A single 1px `rule` border (`#C8B999`) defines edges.
3. **Subtle shadow on cards only.** A 12px-blur 16px-offset 18%-alpha warm shadow lifts cards when they need genuine elevation (flashcard, drill spread). Never on inline elements.
4. **Inset stroke on the primary CTA.** A 2px `oxblood-deep` inset stroke at the bottom of the primary button gives it a pressed-stamp feel.

There are no harsh shadows. There is no glow. There is no glassmorphism.

### Shadow Vocabulary

- **Shadow Soft** (`0 1px 0 hsl(var(--border)), 0 12px 24px -16px hsl(30 16% 9% / 0.18)`): default card lift. Warm shadow, low offset, soft blur.
- **Stamp Inset** (`inset 0 -2px 0 hsl(8 64% 22%), 0 1px 0 hsl(30 16% 9% / 0.08)`): primary CTA ink-stamp shape.
- **Hover Lift** (`inset 0 -2px 0 oxblood-deep, 0 2px 0 ink/0.12, 0 6px 12px -4px oxblood/0.3`): primary CTA hover state.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Hover and focus introduce subtle elevation via shadow or `translateY(-1px)`. Pressed state collapses the stamp.

**The Hairline-First Rule.** When in doubt, reach for a 1px `rule` border before reaching for a shadow. Editorial surfaces define edges with line, not depth.

## 5. Components

### Primary Button (`.codex-btn-primary`)

- **Shape:** rectangular, 0.2rem radius. Not pill-shaped.
- **Surface:** oxblood fill on cream paper. The inset bottom-stroke and tiny offset shadow give it a pressed-stamp feel.
- **States:** hover lifts 1px and adds a warm oxblood glow. Active collapses the stamp. Disabled drops to 0.45 opacity.
- **Used for:** Submit, Reveal walkthrough, Check. Once per visible viewport.

### Ghost Button (`.codex-btn-ghost`)

- **Shape:** rectangular, hairline border, transparent fill.
- **Hover:** background becomes `paper-deep`; border shifts toward oxblood.
- **Used for:** Next, Reset, secondary actions, toggle controls.

### Stamp Button (`.codex-stamp-btn`)

- **Shape:** full-pill, italic serif label, 1.5px border in `currentColor`.
- **Used by:** SelfRateAfterReveal (Again / Good / Easy buttons). Color comes from `state-again` (oxblood family), neutral ink, or `state-easy` (ink-forest family) via inline `text-*` Tailwind classes.
- **Hover:** background fills to `currentColor`, text inverts to paper. Slight rotation (-1deg) for an ink-stamp tactile effect.

### Identifier Chip (`.codex-chip`)

- **Shape:** rectangular, mono small-caps, hairline border, soft paper-lift fill.
- **Used for:** PT-question pills, method numbers, drill counter, accuracy display, option prefixes.

### Cards

- **`.codex-card`** (primary): paper-lift surface, hairline border, soft shadow. Default content container.
- **`.codex-card-soft`** (secondary): paper-lift surface at 70% opacity, faint border, no shadow. Quieter container for inline asides and panels.
- **Corner radius:** 0.25rem (`rounded.md`). Never `rounded-2xl`. The Codex is editorial; rounded corners belong to SaaS.

### Drill Answer Choice (`.codex-answer`)

- **Shape:** rectangular, hairline border, transparent fill at rest. Padding 0.85 / 1rem.
- **States:**
  - Picked (pre-submit): hairline border shifts to oxblood.
  - Correct (post-submit): adds `.codex-answer-correct` class — forest border 55% alpha, forest fill 8%.
  - Incorrect (post-submit): adds `.codex-answer-incorrect` class — oxblood border 55% alpha, oxblood fill 8%.
- **Used by:** D1 MC, D2 bucket choices, D3 / D4 / D5 / D7 MC.

### Result Stamp (`.codex-stamp-correct` / `.codex-stamp-incorrect`)

- **Shape:** italic serif label, pill border, slight rotation (-1.5deg), warm cream fill behind for legibility.
- **Used by:** the verdict aside on every auto-graded drill. Replaces the flat "Correct" / "Not quite" header.

### Sidebar TOC (`.codex-toc`, `.codex-toc-item`, `.codex-toc-num`)

- **Shape:** vertical stack of TOC items. Each item is `<mono number> <sans label>`.
- **States:** active item gets oxblood text, soft oxblood-tinted background.
- **Used by:** TopicSidebar.

### Translation Token (`.indicator-token` + `.translation-bucket-*`)

- **Shape:** inline serif italic, ~16% alpha colored wash, `box-decoration-break: clone` for multi-line wraps.
- **Bucket colors:** mulberry / sienna / teal / ink-blue / oxblood per category.
- **Modes:** `reveal` (always visible) and `hover` (visible only on hover, wrapped in `@media (hover: hover)` to avoid sticky-hover on touch).

### Signature Layouts

- **`.codex-chapter-spread`** (chapter pages on desktop): asymmetric grid, `1fr 18rem` with `3rem` gap. Body prose left, marginalia rail right. Collapses to single column under `lg`.
- **`.codex-decoder-spread`** (DecoderPanel): `1fr auto 1fr` three-column grid on desktop with an oxblood italic `→` glyph in the center. Abstract phrase left, plain English right. Collapses to single column on mobile.
- **`.codex-reveal-stack`** (page-load reveal): direct children fade-in with staggered 80 ms delays. CSS `@keyframes`; respects `prefers-reduced-motion`.

## 6. Do's and Don'ts

### Do:

- **Do** keep this surface fully cream-paper and ink. The only bold color is oxblood, used on ≤3 elements per visible viewport.
- **Do** route every translation-language color through `topic-styles.css` and `HighlightToken`. The bucket names (`assumption`, `causal`, `comparison`, `evidence`, `evaluation`) are the canonical vocabulary on this surface.
- **Do** render the chapter prose in Newsreader at `1.0625rem` / `1.72` line-height, capped at `max-w-prose`. Drop caps on the first paragraph of every section; `§` mark on every `<h2>`.
- **Do** prefer hairline `rule` borders over drop shadows. When elevation is needed, reach for `paper-lift` on `paper` first.
- **Do** stamp drill verdicts as italic serif typography in oxblood (incorrect) or ink-forest (correct). Use `<CodexStamp variant="correct" />` or `<CodexStamp variant="incorrect" />` patterns.
- **Do** use Hanken Grotesk for UI controls and JetBrains Mono for identifier chips. Never reach for the OS sans for UI on this surface; Hanken Grotesk is loaded.
- **Do** keep the page-load reveal stack to one choreographed sequence per route. No scroll choreography. No entrance animations on chapter content beyond the load-in.
- **Do** trace every persistence write to `useAbstractDrill.recordAttempt`, `useDecoderProgression`, `useRecordChapterSection`, or `useRecordFlashcardReview`. Honest analytics only.

### Don't:

- **Don't** use `#000`, `#fff`, or any pure-greyscale neutral. The Codex sits inside a warm-neutral band.
- **Don't** use Inter, Roboto, Arial, or the OS sans for chapter or UI text. Hanken Grotesk, Newsreader, JetBrains Mono are the only families.
- **Don't** import Fraunces or Outfit from the Intro to LR bootcamp. The bootcamps speak distinct dialects.
- **Don't** reach for `rounded-2xl` or any `rounded-lg+` radius. Card corners are 0.25rem. The Codex is editorial, not pillowy.
- **Don't** use drop shadows decoratively. Shadows on hover or for genuine elevation only.
- **Don't** introduce a second bold accent. Oxblood is the only one. Adding teal, gold, or any other saturated hue collapses the system.
- **Don't** render drill correct/incorrect feedback as solid green/red fills. Use the stamp pattern.
- **Don't** ship the hero-metric template (big number, small label). The drill chip in the header is a status chip, not a hero.
- **Don't** reach for a modal as a first thought. Inline reveal (collapsible method card, in-place flashcard flip) is the canonical pattern.
- **Don't** use em dashes (`—` or `--`) in any utility, computed, or runner copy on this surface. Use commas, colons, parentheses, periods. Joshua's authored chapter prose is exempt.
- **Don't** add argument-structure labeling drills to this surface. Premise / conclusion / opposing-view / concession / slot labeling all live in Intro to LR. The Abstract bootcamp's job is decoding LSAT-ese, not labeling argument parts.
- **Don't** invent analytics, mastery scores, streaks, score predictions, XP, trophies, or progress badges.
- **Don't** render internal IDs (`stim-*`, `method-*`, raw bucket names like `evaluation-bg`) in student-visible copy.
- **Don't** ship Duolingo-shaped streak flames, mascot animations, XP bars, or trophy popovers.
- **Don't** use industry vocabulary in student copy. "Stimulus" is industry; "the argument" or "the passage" is student-voice.

---
name: Abstract Bootcamp
description: The bilingual-fluency surface for translating LSAT-ese into plain English.
colors:
  bg: "#0a0a0a"
  bg-card: "#121212"
  surface-elevated: "#1a1a1a"
  surface-muted: "#262626"
  border: "#262626"
  border-soft: "#262626"
  ring: "#d4d4d4"
  ink-bright: "#fafafa"
  ink-soft: "#a3a3a3"
  ink-faint: "#737373"
  primary: "#fafafa"
  primary-foreground: "#0a0a0a"
  bucket-conclusion: "#16a34a"
  bucket-conclusion-bg: "#16a34a2e"
  bucket-support: "#3b82f6"
  bucket-support-bg: "#3b82f62e"
  bucket-pivot: "#f97316"
  bucket-pivot-bg: "#f973162e"
  bucket-opposing-view: "#ef4444"
  bucket-opposing-view-bg: "#ef44442e"
  bucket-concession: "#c084fc"
  bucket-concession-bg: "#c084fc2e"
  state-success: "#22c55e"
  state-warn: "#f59e0b"
  state-error: "#dc2626"
  state-again: "#f43f5e"
  state-easy: "#10b981"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  h1:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  h3:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  body-prose:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  small:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.55
  eyebrow:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.05em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.05em"
rounded:
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  "2xl": "1rem"
  full: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
  "10": "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    typography: "{typography.body}"
  button-primary-disabled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.75rem"
    typography: "{typography.body}"
  button-ghost-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.75rem"
  chip-status:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
    typography: "{typography.small}"
  chip-clause:
    backgroundColor: "transparent"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.75rem"
    typography: "{typography.body}"
  chip-clause-selected:
    backgroundColor: "transparent"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.75rem"
  chip-pt-mono:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
    typography: "{typography.mono}"
  card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.2xl}"
    padding: "1.5rem"
    typography: "{typography.body}"
  card-soft:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  flashcard:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.2xl}"
    padding: "1.5rem"
  method-card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  input-select:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.5rem"
    typography: "{typography.body}"
  decoder-dot:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.full}"
    size: "0.5rem"
  decoder-dot-active:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    size: "0.5rem"
---

# Design System: Abstract Bootcamp

> Scope: this DESIGN.md governs only the Abstract topic surfaces (`/topics/abstract/*`, `src/topics/abstract/`). Strategy lives in the root `PRODUCT.md`. App-wide app-shell surfaces (foyer, messenger, admin, drills outside this topic) are out of scope. The frontmatter is normative; prose contextualizes how to apply it.
>
> The bootcamp uses the app-wide neutral-dark Tailwind tokens (`bg-card`, `border-border`, `bg-secondary`, etc.) defined in `tailwind.config.ts` and `src/index.css`. Hex values in the frontmatter are the resolved equivalents of those HSL tokens. Indicator-bucket hex values resolve `src/topics/abstract/components/indicator-tokens.css`.

## 1. Overview

**Creative North Star: "The Translator's Workbook."**

The Abstract bootcamp's whole purpose is bilingual fluency: take an LR stimulus written in dense academic LSAT-ese and strip it down into plain-English slots, or take an answer choice written in the same dialect and decode it back into a concrete picture. The visual identity is the act of translation. Prose looks like prose, until the student opts in and argument-structure indicators reveal the underlying skeleton inline. The bootcamp does not look like a branded product surface; it looks like a careful, dark-themed annotation notebook. The only color that carries meaning is the locked indicator-bucket vocabulary (conclusion / support / pivot / opposing-view / concession). Everything else is neutral greyscale.

This bootcamp explicitly does not carry the Intro to LR (Main Conclusion) workbook's Aspiring Gold accent. There is no warm brand color on this surface. The act of translation reads as quiet, dense, and academic. Decoration would compete with the chapter prose, so decoration is removed. The student is reading; the system is listening.

The bootcamp explicitly rejects: card-grid hubs (7Sage / Khan Academy LSAT shape), gradient blob backgrounds (SaaS-cream), Duolingo-shaped reward chrome (streak flames, XP bars), hero-metric tiles (big-number "accuracy" displays presented as identity rather than feedback), chip-as-output role labels imported from the Main Conclusion bootcamp (this surface highlights inline tokens inside running prose, not pickable role chips).

**Key Characteristics:**

- Dark-by-default greyscale neutrals with zero brand-accent warmth on this surface.
- Color is reserved exclusively for argument-structure indicator buckets and for state feedback (success / error / warn). No decorative color anywhere else.
- Prose-first hierarchy: eyebrow + title + body-prose dominates. Cards exist but stay quiet (`bg-card/40` to `bg-card/60` partial opacity over the dark background).
- Inline argument-structure highlighting is the signature primitive, not chip selection. Indicator tokens use `box-decoration-break: clone` so they wrap correctly across multiple lines inside flowing prose.
- The `useDrillDarkMode` lifecycle hook forces the entire topic surface into dark theme on mount and restores the prior theme on unmount. Light mode is technically supported by the app-wide system; the Abstract bootcamp explicitly opts out per-route.
- Motion is minimal: hover/focus transitions on chips and tokens (120-300ms), no scroll choreography, no entrance animations on chapter content.
- Cards never nest. Layered transparency (`bg-card/40` over `bg`) provides depth, not nested borders.

## 2. Colors

The palette is pure neutral greyscale plus a locked five-color indicator-bucket vocabulary. No brand accent. Color carries only argument-structure meaning and state.

### Primary

There is no brand-accent primary color on this surface. The "primary" CTA color is `#fafafa` (near-white on dark), used only for the Check / submit affordance and the active decoder pagination dot.

- **Primary Surface** (`#fafafa` resolved from `--primary` at HSL `0 0% 98%`): used as the "Check" CTA background, the active decoder pagination dot, and selected drag-and-drop chip border (`border-primary border-2 ring-2 ring-primary/30`). It is the highest-affinity affordance on a screen and should appear at most once per visible viewport.

### Secondary (Argument-Structure Indicator Buckets)

These five colors carry argument structure meaning and are the only colors used inside chapter prose. Defined in `src/topics/abstract/components/indicator-tokens.css`. Each renders as inline text (foreground color, 18% alpha background, `box-decoration-break: clone`) so highlights wrap across lines without breaking.

- **Conclusion Green** (`#16a34a`, HSL `142 76% 36%`): conclusion-indicator words inside running prose (e.g. "therefore", "thus", "hence").
- **Support Blue** (`#3b82f6`, HSL `217 91% 60%`): support / premise indicators (e.g. "because", "since", "given that"). Note this surface uses "support" as the canonical role label, not "premise" as the Main Conclusion bootcamp does.
- **Pivot Orange** (`#f97316`, HSL `28 95% 53%`): pivot / direction-change indicators (e.g. "but", "however", "yet").
- **Opposing-View Red** (`#ef4444`, HSL `0 84% 60%`): opposing-view indicators that flag someone else's argument the author is going to push back against.
- **Concession Purple** (`#c084fc`, HSL `280 67% 60%`): concession indicators (e.g. "admittedly", "granted", "it is true that").

### Neutral

App-wide neutral-dark Tailwind tokens, resolved here as hex. Tinted toward warm-neutral only by the design system's `hsl(0 0% X%)` formulation (pure greyscale; no warm-cool drift).

- **BG** (`#0a0a0a`, HSL `0 0% 3.9%`): topic surface background.
- **Card BG** (`#121212`, HSL `0 0% 7%`): card and elevated-panel surface. Almost always rendered at partial opacity (`bg-card/40` or `bg-card/60`) so the underlying BG bleeds through and produces a layered, semi-translucent feel.
- **Surface Elevated** (`#1a1a1a`, HSL `0 0% 10%`): the next step up from card BG. Used for nested surfaces inside method cards.
- **Surface Muted** (`#262626`, HSL `0 0% 14.9%`): the unified value for `--secondary`, `--border`, `--accent`, and `--muted`. Used as chip background, border color, and hover-surface fill.
- **Ink Bright** (`#fafafa`, HSL `0 0% 98%`): primary text. AAA contrast on BG.
- **Ink Soft** (`#a3a3a3`, HSL `0 0% 63.9%`): `text-muted-foreground`. Secondary text, eyebrow labels, helper copy, links.
- **Ink Faint** (`#737373`, HSL `0 0% 45%`): `text-tertiary`. Footnotes, attribution, lowest-tier captions.
- **Ring** (`#d4d4d4`, HSL `0 0% 83.1%`): focus ring color (`focus-visible` on interactive elements via shadcn primitives).

### State

- **Success Green** (`#22c55e`, HSL `142 71% 45%`): correct-attempt affirmation. Same hue family as Conclusion Green by design (a correct attempt is a confirmed conclusion).
- **Warn Amber** (`#f59e0b`, HSL `38 92% 50%`): caution / diagnostic warning. Rarely used on this surface.
- **Error Red** (`#dc2626`, HSL `0 72% 51%`): wrong-attempt affordance. Distinct from Opposing-View Red (which is brighter, role-coded). Never used as a brand accent.
- **Again Rose** (`#f43f5e`): the "Again" flashcard rating button border and text. Tailwind `rose-500`. A signal the student needs to revisit, not a punishment.
- **Easy Emerald** (`#10b981`): the "Easy" flashcard rating button border and text. Tailwind `emerald-500`. Distinct in hue from Success Green so the two affordances do not collide visually.

### Named Rules

**The No-Brand-Accent Rule.** This surface carries no warm brand accent. No Aspiring Gold, no bronze, no amber decoration. The `accent-bronze` / `accent-warm` tokens declared in `tailwind.config.ts` are not consumed here. If the surface looks like it needs a warm accent to feel alive, the answer is more careful typography or better content density, not a brand color.

**The Role-Color-Inside-Prose Rule.** Indicator-bucket colors only render as inline tokens inside running prose, via `HighlightToken` and `indicator-token` class. They are never used as chip backgrounds, card borders, button colors, or status badges. The role color travels with the role concept, exclusively.

**The Layered-Opacity Rule.** Card backgrounds are rendered at 40% or 60% opacity (`bg-card/40`, `bg-card/60`) so the BG bleeds through. Depth comes from translucent layering, not nested borders or graduated shadow ramps. A fully opaque card surface signals an error in the system.

**The Tinted-Neutral Rule (inherited).** No `#000`, no `#fff`. The app-wide tokens already enforce this (HSL `0 0% 3.9%` is `#0a0a0a`, not pure black; HSL `0 0% 98%` is `#fafafa`, not pure white). Honor it.

## 3. Typography

**Display Font:** system-ui font stack (`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`).
**Body Font:** same system-ui stack.
**Mono Font:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.

**Character:** the Abstract bootcamp is intentionally typeface-neutral. There is no custom display serif (no Fraunces), no humanist sans (no Outfit), no display mono (no JetBrains Mono). It reads as a careful, dense academic notebook using the OS's native sans, with mono reserved for content-identifier tokens (PT-question pills, method numbers, ID chips). The visual identity comes from rhythm, weight, and hierarchy, not from a font choice. This is a deliberate departure from the Intro to LR bootcamp's editorial-typographic pairing.

### Hierarchy

- **H1** (700, `1.875rem` / 30px, `1.2`): chapter-level title rendered by `ChapterReader` (`text-3xl font-bold`). Used once per chapter.
- **H2** (600, `1.5rem` / 24px, `1.25`): section titles inside the chapter. Tracked by `ChapterReader` for intersection-observer-driven `chapter_progress` writes.
- **H3** (600, `1.25rem` / 20px, `1.3`): subsection titles.
- **Title** (600, `1rem` / 16px, `1.4`): card titles inside method cards, flashcard front text, drill shell titles.
- **Body** (400, `0.875rem` / 14px, `1.625`): UI prose, drill prompts, button labels, footer copy. The default voice.
- **Body Prose** (400, `1rem` / 16px, `1.7`): chapter prose inside `ChapterReader`. Capped by `prose prose-invert max-w-none` Tailwind Typography defaults (~65ch).
- **Small** (400, `0.75rem` / 12px, `1.55`): metadata, "Card N of M" pagination, caption text, secondary navigation hints.
- **Eyebrow** (600, `0.75rem` / 12px, uppercase, tracking `0.05em`): section-prefix labels above titles (`MASTER KEYS`, `METHODS OF REASONING LIBRARY`, `EXAMPLE`). The single all-caps treatment in the system; never used in running prose.
- **Mono** (500, `0.6875rem` / 11px, tracking `0.05em`): PT-question chips, method numbering (`METHOD 17`), card-identifier callouts. Always all-caps when used as an eyebrow, sentence case when used as an inline identifier.

### Named Rules

**The Italic-Stimulus Rule.** Stimulus quotations and reading passages always render as `italic`. The `blockquote` element with `border-l-2 border-border pl-4 leading-relaxed` is the canonical pattern. The italic is a typographic cue that the prose belongs to a question, not to Joshua. Authored coaching prose stays roman.

**The Eyebrow-Then-Title Rule.** Every page-level surface leads with `eyebrow + h1 + supportive subtitle`. Eyebrow is short, all-caps, tracked, ink-soft-colored. Title carries the actual destination name. Subtitle is body-weight, ink-soft, and explains the surface in one sentence. Never lead with the h1 alone.

**The System-Sans Rule.** Use the OS sans stack for everything. Do not import custom fonts on this surface. If a future Abstract surface needs a typographic accent, reach for weight contrast or italic before reaching for a different font family.

## 4. Elevation

The Abstract bootcamp is **mostly flat**. Depth comes primarily from layered card opacity (`bg-card/40` over `bg`), secondarily from a thin hairline border (`border-border`), and only occasionally from a small shadow (`shadow-sm`) on cards that need a tactile lift (flashcard surface, slot grid).

There is no glow vocabulary on this surface. The Intro to LR bootcamp's `Glow Accent Soft` / `Glow Accent Strong` warmth-glow shadows do not apply here. Accent glow requires an accent color; this surface has none.

### Shadow Vocabulary

- **Shadow Sm** (`var(--shadow-sm)` → `0 1px 3px 0 rgba(0, 0, 0, 0.4)`): the flashcard surface, the method-card on hover. Used to lift a single card from the surrounding prose.
- **Hover Shadow** (`hover:shadow`, the Tailwind default): only applied to interactive chip elements (`SlotFiller` clause chips, `MethodCard` expand control). Communicates "this is grabbable / pressable."

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadow appears only on the flashcard (because flipping it is a tactile action) and on hover for chips and cards. Static cards have no shadow.

**The Layered-Opacity-Before-Shadow Rule.** When you need a card to feel separate from the BG, reach for partial-opacity card fill (`bg-card/40`, `bg-card/60`) before reaching for a shadow. Layered translucence is the system's first answer to "this needs to feel like a container."

## 5. Components

Lead each component with a short character line, then specify shape, color, states, and distinctive behavior.

### Buttons

- **Shape:** rounded-md (`0.375rem`).
- **Primary** (the Check / submit CTA): `bg-primary text-primary-foreground px-4 py-2 text-sm font-medium`. Disabled state drops to `opacity-50`. Used once per surface, on the highest-affinity action. Hover/focus uses shadcn defaults (no custom treatment in the Abstract surface).
- **Ghost** (Reset, Next, Hide/Show controls): `rounded-md border border-border px-3 py-1 text-sm`. Hover lifts to `hover:bg-secondary/60` or `hover:bg-secondary`. Always neutral, always secondary in weight.
- **Tertiary** (icon-only / ultra-quiet, e.g. "Reset session"): `border border-border px-3 py-2 text-xs text-muted-foreground`. Body weight reduced one tier. Reserved for actions the student rarely needs.
- **Focus:** inherits the shadcn `focus-visible` ring (`ring-2 ring-ring`, app-wide). Never disabled.

### Chips

- **Status chip** (session accuracy, question counter): `rounded-full bg-secondary px-3 py-1 text-xs`. Always neutral grey background. Never role-colored. Never carries success/error fill — those signals belong elsewhere.
- **Clause chip** (the draggable / tappable clause inside SlotFiller): `rounded-md border px-3 py-1.5 text-sm shadow-sm`. Default state uses `border-border hover:border-primary/50 hover:shadow`. Selected state uses `border-primary border-2 ring-2 ring-primary/30`. The selection ring is the chip's only color affordance.
- **PT-question pill** (the practice-question references in `MethodsLibrary`): `rounded-full border border-border bg-background px-3 py-1 font-mono text-xs`. The only place the mono font appears as a content-identifier chip on this surface.
- **Filter dropdown chip** (flashcard difficulty / concept selectors): `rounded-md border border-border bg-background px-2 py-1`. Native `<select>` styled minimally — no shadcn `Select` Radix wrapper used here.

### Cards / Containers

- **Corner Style:** card surfaces use `rounded-2xl` (`1rem`) at large width and `rounded-xl` (`0.75rem`) at compact width. Soft-but-not-pillowy.
- **Background:** always `bg-card/40` (default) or `bg-card/60` (lifted, e.g. flashcard). The base BG must show through. Fully opaque card backgrounds are forbidden on this surface.
- **Border:** `border border-border` (1px hairline at the unified Surface Muted color).
- **Shadow Strategy:** none by default. `shadow-sm` only on the flashcard primitive. Nesting is forbidden.
- **Internal Padding:** `p-4` (16px) on compact cards, `p-6` (24px) on signature cards (flashcard, hero containers, full-bleed sections).

### Inputs / Fields

- **Style:** `rounded-md border border-border bg-background px-2 py-1` for native selects. Text fields, when added, follow the same rule.
- **Focus:** the app-wide shadcn focus ring (`ring-2 ring-ring`). Border itself does not change color on focus.
- **Error:** when introduced, use `state-error` (`#dc2626`) on the border with error copy below the field in small typography. The Abstract bootcamp does not currently render input-error states; this is the canonical pattern when it does.

### Navigation

- **TopicSidebar** (the section sidebar within `/topics/abstract/*`): a thin left-aligned nav rendered in `TopicSidebar.tsx`. App-wide pattern, not Abstract-specific.
- **DecoderPanel dot pagination** (the signature mini-pattern): five-to-eight `h-2 w-2 rounded-full` dots, `bg-primary` for the active card and `bg-border` for the rest. Click jumps; arrow buttons advance/retreat. The dot strip is centered. No active-dot animation. The compact "Prev / Next" arrow buttons flank the dots.
- **Mobile:** all chrome reflows to a single column via `flex-wrap` and `md:` breakpoint. The drill shell, slot filler header, and methods grid all collapse cleanly. The grid pattern is always `grid gap-3 md:grid-cols-2` (compact two-up on tablet+), never three- or four-up.

### Signature Components

- **`IndicatorHighlighter`** (the bilingual-fluency centerpiece): renders a stimulus as an inline `<blockquote>` with each token wrapped in a `HighlightToken` carrying a `bucket` class (`indicator-bucket-conclusion`, `indicator-bucket-support`, etc.). Each bucket maps to a CSS variable pair (`--token-bg`, `--token-fg`) so the highlight is foreground-tinted text with 18%-alpha background fill. `box-decoration-break: clone` ensures highlights wrap across line breaks without splitting. Two modes: `reveal` (always visible) and `hover` (visible only on hover, wrapped in `@media (hover: hover)` to avoid sticky-hover on touch devices).
- **`DecoderPanel`** (the LSAT-ese → plain-English card deck): `DecoderCard` content area + dot pagination + prev/next arrows. Cards advance via `useDecoderProgression` hook. The pagination dots are the surface's only "tab" semantics.
- **`SlotFiller`** (the drag-and-drop strip-down playground): clause chips lifted out of an italic blockquote, dropped into a `SlotGrid` of seven labeled slots. Touch detection (`(hover: none) and (pointer: coarse)`) replaces drag with tap-to-select-then-tap-to-drop. The selected clause is identified by a 2px primary border + 30%-alpha primary ring. Session accuracy lives in a status chip in the header. Indicator overlay and skeleton tree views are togglable.
- **`ChapterReader`** (the chapter markdown renderer): minimal Obsidian-flavored markdown subset (H1-H3, paragraphs, blockquotes, bullets, ordered lists, tables, italic, bold) plus topic-specific inline tokens `[[indicator:stim-id]]` and `[[decoder]]` that expand to `IndicatorHighlighter` and `DecoderPanel` respectively. Wrapped in `prose prose-invert max-w-none` for prose-tier typography. Tracks H2 occurrences as sections for intersection-observer-driven progress writes.
- **`FlashcardDeck`** (the SRS-compatible self-review deck): `rounded-2xl bg-card/60 p-6 shadow-sm` card with front/back flip. Three rating buttons (`Again` / `Good` / `Easy`) gated on flipped state, each bordered in the rating's signal color (rose / neutral / emerald). Difficulty and concept filter via native `<select>` dropdowns above the card.
- **`MethodsLibrary` MethodCard** (the 17-method browser): `rounded-xl border border-border bg-card/40 p-4` cards with collapsed body. Eyebrow displays the method number in mono small-caps; title in semibold sentence case; definition always visible; example revealed on expand. The expand control is a `border border-border px-2 py-1 text-xs` button; never a bare-icon chevron.

## 6. Do's and Don'ts

Forceful guardrails. Many of these inherit from `PRODUCT.md`'s app-wide and bootcamp-specific principles. The Abstract surface adds its own.

### Do:

- **Do** keep this surface fully neutral greyscale outside the locked indicator-bucket palette and state colors. No warm accent of any kind.
- **Do** route every argument-structure color through `indicator-tokens.css` and `HighlightToken`. The bucket names (`conclusion`, `support`, `pivot`, `opposing-view`, `concession`) are the canonical vocabulary on this surface.
- **Do** render stimulus quotations as italic blockquotes with `border-l-2 border-border pl-4`. The 2px neutral left border is the canonical quotation affordance and does not violate the impeccable side-stripe ban because it is neutral, not a colored accent stripe.
- **Do** cap card backgrounds at 40 to 60 percent opacity (`bg-card/40`, `bg-card/60`). The base BG must show through.
- **Do** force dark theme via `useDrillDarkMode()` on every drill, the slot filler, the flashcard deck, and any other interactive surface. The hook is reversible: it restores prior theme on unmount.
- **Do** use `box-decoration-break: clone` on every inline highlight that may wrap across lines. Indicator tokens inside chapter prose absolutely require this property.
- **Do** wrap hover-based reveal behavior in `@media (hover: hover)` so touch devices do not inherit sticky `:hover` states (`indicator-tokens.css` audit F5.25).
- **Do** keep all interactive elements keyboard-activatable (`Enter` and `Space` handlers on chips, role-button semantics, `aria-pressed` for toggle state, `aria-expanded` for collapsibles).
- **Do** prefer `font-mono` only for content-identifier surfaces (PT IDs, method numbers, card IDs). Mono in running prose is forbidden.
- **Do** trace every accuracy number, progress percentage, and "next step" link to real persistence via the bootcamp's hooks (`useSlotFillerSession`, `useDecoderProgression`, `useRecordChapterSection`, `useRecordFlashcardReview`) or a static registry. Honest empty states beat fabricated data.

### Don't:

- **Don't** use any warm brand accent on this surface. No Aspiring Gold, no bronze, no amber. The `accent-bronze` / `accent-warm` / `glow-bronze` Tailwind colors are not consumed by the Abstract bootcamp; do not introduce them here.
- **Don't** import role colors from the Intro to LR (Main Conclusion) bootcamp. That surface uses `role-premise` (blue), `role-opposing` (purple), `role-concession` (yellow). The Abstract surface uses `support` (blue), `opposing-view` (red), `concession` (purple). The names and the hues are intentionally different. Do not cross-reference.
- **Don't** turn indicator-bucket colors into chip selections, card borders, button fills, or status badges. The role color travels with the role concept exclusively, rendered inline inside prose.
- **Don't** lead a surface with a card grid (the 7Sage / Khan Academy / Manhattan Prep failure mode). Lead with the eyebrow + h1 + body-prose pattern, then deliver a single compute-the-next-step CTA (a "Try this drill" or "Open this reference card" link).
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, list items, callouts, or alerts. (App-wide impeccable rule; enforced by `__tests__/impeccable-bans.test.ts`.) The italic-stimulus blockquote's 2px neutral left border is the canonical exception and is acceptable because the border is neutral, not a colored accent.
- **Don't** use gradient text (`background-clip: text` + gradient background). Use a single solid color and emphasize via weight or size.
- **Don't** use glassmorphism (backdrop-blur) decoratively. The Abstract surface is layered transparency, not frosted glass.
- **Don't** ship the hero-metric template (big number + small label + supporting stats + gradient accent). Use a status chip in the header instead. The flashcard surface, drill shell, and slot filler all follow this rule already.
- **Don't** reach for a modal as the first thought. Inline reveal (collapsible method card, togglable indicator/tree overlays) is the canonical pattern.
- **Don't** use em dashes (`—` or `--`) in any utility, runner, or computed copy on this surface. Use commas, colons, parentheses, or periods. (Joshua's authored chapter prose in `chapter.md` is exempt.)
- **Don't** use `#000` or `#fff`. Every neutral is the resolved HSL token; honor the app-wide tinted-neutral rule even though this surface uses pure-zero-chroma greyscale.
- **Don't** invent analytics, "mastery percentages", streaks, score predictions, or XP / trophy treatments. The Abstract bootcamp tracks real progress writes (chapter sections, flashcard reviews, drill accuracy) only.
- **Don't** render internal IDs (`stim-*`, `method-*`, raw bucket names like `opposing-view-bg`) in student-visible copy. Use them as `data-*` attributes and class names only. Student-visible copy uses natural-language labels ("opposing view", "support", "the argument's pivot").
- **Don't** ship Duolingo-shaped streak flames, mascot animations, XP bars, or trophy popovers on this surface. The Abstract bootcamp does not reward attendance.
- **Don't** use industry vocabulary in student copy. "Stimulus" is industry; "the argument" or "the passage" is student-voice. "Premise" is industry; "support" is what this surface uses by design. "Indicator word" is fine; "trigger word" is not.

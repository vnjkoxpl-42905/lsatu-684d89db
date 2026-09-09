---
name: LSAT Academy
description: Two registers under one roof - a dark marble hall at the door, a quiet neutral workroom inside.
colors:
  # ── The Hall (unauthenticated register; dark ground) ──
  hall-night: "#070606"
  hall-night-raised: "#0a0908"
  hall-marble: "#eae5da"
  hall-marble-secondary: "#a6a093"
  hall-marble-muted: "#6e695e"
  hall-bronze: "#c6a467"
  hall-bronze-bright: "#e8cf96"
  hall-bronze-deep: "#8a6f3e"
  hall-cyan: "#8ad8e2"
  hall-cyan-bright: "#c3eef4"
  # ── The Workroom (authenticated register; light is the shipped default) ──
  workroom-page: "#fcfcfc"
  workroom-card: "#ffffff"
  workroom-raised: "#f7f7f7"
  workroom-fill: "#f2f2f2"
  workroom-ink: "#121212"
  workroom-ink-muted: "#737373"
  workroom-ink-faint: "#8c8c8c"
  workroom-hairline: "#e0e0e0"
  workroom-field: "#e6e6e6"
  # ── The Workroom, dark alternate (opt-in via the theme toggle) ──
  workroom-night-page: "#0a0a0a"
  workroom-night-card: "#121212"
  workroom-night-raised: "#1a1a1a"
  workroom-night-ink: "#fafafa"
  workroom-night-ink-muted: "#a3a3a3"
  workroom-night-hairline: "#262626"
  # ── Meaning (identical in both themes; semantic only) ──
  state-correct: "#10b77f"
  state-incorrect: "#f43e5c"
  state-warn: "#f59f0a"
  status-success: "#21c45d"
  status-warning: "#f59f0a"
  status-destructive: "#dc2828"
  # ── Teacher workspace (theme-independent, light ground only) ──
  teacher-accent: "#c7841f"
  teacher-accent-hover: "#af7318"
  teacher-accent-strong: "#895910"
  teacher-accent-soft: "#e0a648"
typography:
  body:
    fontFamily: "Lexend, Outfit, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "'rlig' 1, 'calt' 1, 'cv11' 1"
  title:
    fontFamily: "Lexend, Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  label:
    fontFamily: "Lexend, Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  question:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  hall-display:
    fontFamily: "Fraunces, 'Iowan Old Style', 'Times New Roman', serif"
    fontWeight: 380
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  hall-inscription:
    fontFamily: "Cinzel, 'Trajan Pro', 'Times New Roman', serif"
    fontWeight: 500
    letterSpacing: "0.05em"
  hall-mono:
    fontFamily: "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "0.04em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  hall: "2px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.workroom-ink}"
    textColor: "{colors.workroom-page}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.workroom-ink}"
    textColor: "{colors.workroom-page}"
  button-outline:
    backgroundColor: "{colors.workroom-page}"
    textColor: "{colors.workroom-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.workroom-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  card:
    backgroundColor: "{colors.workroom-card}"
    textColor: "{colors.workroom-ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.workroom-page}"
    textColor: "{colors.workroom-ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "44px"
  hall-cta:
    backgroundColor: "transparent"
    textColor: "{colors.hall-marble}"
    rounded: "{rounded.hall}"
    padding: "0 38px"
    height: "60px"
---

# Design System: LSAT Academy

## Overview

**Creative North Star: "LSAT Academy"**

One institution with two registers, and the seam between them is deliberate.

**The Hall** is the door. Unauthenticated, dark, and material: near-black ground, warm marble text, a bronze that carries the light, and a serif that behaves like carved lettering. Its own source calls it a museum nocturne, carved marble filmed in darkness, read by modern instruments. Its job is to make a prospective student feel they are entering somewhere, not signing up for something. It is the only place in the product where atmosphere outranks throughput.

**The Workroom** is everything past sign-in. Light, neutral, and quiet, because a student sits inside it for an hour reading dense argument text and the interface must not compete with the passage. There is no warmth here and that is the decision, not an oversight: warm accents need a dark ground to read, and on the Workroom's white they collapse. The Hall's bronze measures 8.58:1 on its own night and 2.30:1 on the Workroom's page. The two registers do not share a palette because they cannot.

What they do share is restraint about meaning. In both, colour is a signal. Green, red and amber say something happened. Nothing is coloured to be warm, to look premium, or to fill a space. Depth comes from hairlines and background tone rather than shadow, and hierarchy comes from size, weight and position rather than hue.

Inside the Workroom, individual rooms may commit fully to their own world. The eight Activity Centre worlds, the scoped bootcamps and the inbox each carry a painted identity behind a wrapper class. That is sanctioned and it is what an academy is: neutral corridors, characterful rooms. The corridor never takes on a room's paint.

**Key Characteristics:**
- Two registers, one institution: a dark marble Hall at the door, a light neutral Workroom inside.
- Colour means something or it is absent.
- Flat surfaces, hairline separation, no drop shadows.
- Precise and quiet controls that stay out of the reader's way.
- Rooms may be worlds; corridors never are.

## Colors

Two grounds, one shared vocabulary of meaning.

### Primary

- **Workroom Ink** (`#121212`): the Workroom's near-black. It is the text colour, the fill of every primary button, and the colour of the focus ring. The Workroom has no accent, so ink carries emphasis by itself.
- **Hall Bronze** (`#c6a467`): the Hall's warm light. Hairline borders on the call to action, a sheen across it on hover, and the selection highlight. It exists only on the Hall's night ground and never crosses into the Workroom.

### Secondary

- **Hall Cyan** (`#8ad8e2`): the Hall's cool instrument note against the bronze, and the colour of its focus outlines. Rare by design; it marks precision where bronze marks warmth.
- **Teacher Amber** (`#c7841f`): the single accent of the teacher workspace, with a hue-locked ramp for hover (`#af7318`), text on tinted fills (`#895910`) and a light step (`#e0a648`). Deliberately theme-independent: the workspace is always the light format. It is the one accent in the product, and it belongs to the operator, not the student.

### Tertiary

Individual rooms carry their own palettes behind a wrapper class and are documented in their own surface briefs, not here. The wrappers in use are `.classroom-root`, `.mc-bootcamp`, `.ff-bootcamp`, `.rc-bootcamp`, `.topic-abstract`, `.cs-punk`, and the eight Activity Centre worlds.

`.classroom-root` was added to this list on 2026-09-08, after an audit found the classroom running on Outfit and a warm palette while this record still described it as neutral Workroom chrome. It is a sanctioned world, not drift: the warmth and the typeface are deliberate and they are what makes the classroom feel like a study rather than a dashboard. The record was wrong, not the code. Its brief is `.impeccable/surfaces/classroom.md`. Note that this is the one sanctioned world that is also a corridor, so the rule below about corridors never being worlds now has exactly one documented exception.

### Neutral

- **Workroom Page** (`#fcfcfc`) and **Card** (`#ffffff`): the page ground and the surface that sits on it. One step of separation, no more.
- **Workroom Raised** (`#f7f7f7`) and **Fill** (`#f2f2f2`): the two tonal steps available for layering and for resting fills.
- **Workroom Ink Muted** (`#737373`): secondary text. Measures 4.62:1 on the page, which clears the floor with almost nothing to spare. Do not lighten it.
- **Workroom Hairline** (`#e0e0e0`) and **Field** (`#e6e6e6`): the borders that do the work shadows used to.
- **Hall Marble** (`#eae5da`), with secondary (`#a6a093`) and muted (`#6e695e`) steps: warm off-white text on the night ground.

### State (semantic only, never decorative)

- **Correct** (`#10b77f`) and **Incorrect** (`#f43e5c`): a student's attempt was right or wrong. Held under their own names, separate from system status, so a future shift to one cannot silently reframe the other.
- **Warn** (`#f59f0a`): a bonus, a stretch, a non-blocking notice.
- **Success** (`#21c45d`), **Warning** (`#f59f0a`), **Destructive** (`#dc2828`): system status, not student performance.

### Named Rules

**The Ground Decides Rule.** A warm colour is legible on the Hall's night and illegible on the Workroom's page. Never carry a colour across the seam on the strength of liking it; measure it against the ground it will land on first.

**The Meaning-Only Rule.** A colour appears in the Workroom because something is right, wrong, cautionary, or dangerous. There is no fifth reason. If a surface feels flat and the impulse is to add a colour, the answer is type and space.

**The Named Ground Rule.** No colour is written as a literal hex in a component. It resolves from a token, and a token that resolves to nothing is a defect, not a subtle effect. Three colour names in this codebase pointed at variables that were never defined, and the product silently lost its focus ring for five months.

## Typography

**Workroom Body:** Lexend (with Outfit, then the system stack)
**Hall Display:** Fraunces (with Iowan Old Style, Times New Roman, serif)
**Hall Inscription:** Cinzel (with Trajan Pro, serif)
**Mono:** IBM Plex Mono
**Question Lock:** Outfit, held deliberately for LSAT question surfaces

**Character:** The Workroom is one humanist sans doing everything, sized and weighted rather than swapped. The Hall is a serif institution: an optical serif for its headings and an inscriptional face for its few carved lines. The split is the whole typographic idea. Inside, type gets out of the way; at the door, type is the architecture.

### Hierarchy

- **Title** (600, 24px, line-height 1, tracking -0.025em): card and section headings in the Workroom.
- **Body** (400, 14px rising to 16px at 640px and above, line-height 1.6): everything a student reads in the Workroom chrome.
- **Question** (400, 16px, line-height 1.6, Outfit): LSAT stimulus and answer choices. Font-locked to Outfit even though the rest of the app moved to Lexend, so question text does not shift when the shell's face changes.
- **Label** (500, 14px): button and control labels.
- **Hall Display** (380, fluid, tracking -0.015em, Fraunces): Hall headings. The unusually light 380 weight is the point; it reads as carved rather than printed.
- **Hall Inscription** (500, tracking 0.05em, Cinzel): the Hall's few short carved lines. Never body copy.
- **Hall Mono** (400, 13px, tracking 0.04em, IBM Plex Mono): the Hall's instrument labels.

### Named Rules

**The One Face Rule.** The Workroom uses a single family. Hierarchy is built from size, weight and space. A second family inside the Workroom is a defect unless it is the Outfit question lock.

**The Question Never Moves Rule.** LSAT question text is font-locked. A change to the shell's typeface must not reflow a passage a student is mid-way through reading.

**The Serif Stays At The Door Rule.** Fraunces and Cinzel belong to the Hall. A serif appearing in the Workroom chrome means the seam has leaked.

## Layout

The Workroom is a centred single column with generous side gutters. The container centres by default, carries 32px of horizontal padding, and stops widening at 1400px.

Breakpoints are the framework defaults up to 1280px, with the largest step pulled in to 1400px. Body type steps from 14px to 16px at 640px, and form controls are forced to 16px below 768px so that iOS does not zoom the page when a field takes focus. Named breakpoints `phone` (up to 600px), `tablet` (601 to 900px) and `desktop` (901px and up) exist for bootcamp surfaces.

Spacing runs on a 4px base. The steps in real use are 4, 8, 16, 24 and 32. Card padding is 24px on all sides; button padding is 8px vertical and 16px horizontal.

Reading measure matters more here than in most products. Passage and stimulus text is held to a comfortable line length rather than allowed to run the full container width.

### Named Rules

**The Reading Measure Rule.** Any surface carrying an LSAT passage, stimulus, or explanation constrains its own line length. The container's maximum is a ceiling for layout, never a licence for prose.

## Elevation & Depth

**Flat, with hairline separation.** Surfaces sit on the page rather than above it. A card is distinguished from its ground by a one-pixel border and, where more is needed, by one step of background tone. There are no drop shadows in the Workroom.

This is a decision, not a description. The codebase currently ships five shadow tokens tuned for a dark ground, from `0 1px 3px rgba(0,0,0,0.4)` up to `0 8px 32px rgba(0,0,0,0.7)`, and applies the smallest of them to every card. Because the app ships light by default, those shadows land at 40 percent black under a white card. The light theme never redefined them, and the one glow token is white, so it is invisible on white. The tokens are retired by this record and the code has not caught up yet.

The Hall is the exception and keeps its own depth: fixed ambience gradients, a grain overlay, and an inset highlight on its call to action. That depth is atmospheric rather than structural, and it does not transfer.

### Named Rules

**The Flat Rule.** Depth in the Workroom comes from a hairline or a tonal step. A `box-shadow` on a Workroom surface is a defect.

**The Two-Step Rule.** Page, then card, then at most one raised step. A surface that needs a fourth level of layering is a surface that needs restructuring.

## Shapes

Corners are gently rounded and consistent: 8px for cards and containers, 6px for buttons and inputs, 4px for the smallest chips and insets, and a full pill only for genuine badges. The scale derives from one 0.5rem radius token, so a change to the base moves the whole system together.

The Hall uses a near-square 2px radius instead. Its edges are cut, not softened, which is what separates a carved surface from a card.

Borders are one pixel. There is no second border weight in the Workroom.

### Named Rules

**The Hairline Rule.** One pixel, always. A thicker border used as a coloured accent stripe on the leading edge of a surface is banned, including when faked with an inset shadow. Active state is carried by background tone.

## Components

### Buttons

- **Character:** precise and quiet. A button is a plain rectangle with a label. It darkens slightly on hover and does nothing else. It does not lift, does not cast a shadow, and does not scale on press.
- **Shape:** gently rounded (6px).
- **Primary:** ink fill (`#121212`), page-coloured label, 8px by 16px padding.
- **Outline:** page background, one-pixel field border, ink label.
- **Ghost:** no fill at rest, a tonal fill on hover.
- **Sizes:** default 44px tall, small 40px, large 48px, icon 44 by 44. Every size clears the 44px touch minimum by being that height, never by relying on wrapped text or padding accidents.
- **Focus:** a solid two-pixel ink outline, offset two pixels from the edge. This is the only focus treatment in the Workroom.
- **Hall CTA:** 60px tall, near-square corners, transparent fill over a bronze hairline, with a bronze sheen that sweeps across on hover and a cyan outline on focus.

### Cards / Containers

- **Corner:** 8px.
- **Background:** card white on the page ground.
- **Border:** one-pixel hairline. This is what separates the card, not a shadow.
- **Shadow:** none.
- **Padding:** 24px, with header, content and footer sharing that inset.

### Inputs / Fields

- **Style:** page background, one-pixel field border, 6px corners, 44px minimum height, 8px by 12px padding.
- **Focus:** the same two-pixel ink outline as buttons, offset two pixels. Do not express focus as a border colour change alone; a border shift is too quiet to serve as the only indicator.
- **Mobile:** 16px text below 768px, so focusing a field never zooms the viewport.

### Navigation

Neutral chrome throughout. The sidebar runs one tonal step off the page ground with a hairline edge, and the active item is marked by background tone rather than by a coloured rule on its leading edge.

### Signature Component: the scoped world

The product's distinctive pattern is not a control, it is a container. A room commits fully to its own palette, typefaces and atmosphere behind a single wrapper class, and nothing inside it leaks out. Scene layers are `aria-hidden` furniture painted beneath the content, so the accessible tree is identical whether the room is painted or bare. A new world is added by writing a new wrapper and its prefixed tokens, never by adding hex to a shared component.

## Do's and Don'ts

### Do:

- **Do** resolve every colour from a token, and treat a token that resolves to nothing as a defect. Verify a new token renders before documenting it.
- **Do** give every interactive element a visible focus indicator: a solid two-pixel ink outline offset two pixels in the Workroom, cyan in the Hall.
- **Do** check contrast against the ground the colour will actually land on, in the theme that actually ships, in a browser. The theme file has read as correct while the page rendered a light card on a near-black ground.
- **Do** separate surfaces with a one-pixel hairline and one tonal step.
- **Do** keep colour semantic: correct, incorrect, warning, danger. Nothing else earns it.
- **Do** scope a new room's identity behind its own wrapper class with prefixed tokens, the way the bootcamps and the eight Activity worlds already do.
- **Do** hold LSAT passage and stimulus text to a readable line length, and leave it on the Outfit question lock.
- **Do** end every world's stylesheet with a `prefers-reduced-motion` block that stops continuous motion rather than speeding it up.

### Don't:

- **Don't** add a `box-shadow` to a Workroom surface. Depth is hairline and tone.
- **Don't** carry a Hall colour into the Workroom. Bronze reads 8.58:1 on the Hall's night and 2.30:1 on the Workroom's page.
- **Don't** introduce a warm or metallic accent into the Workroom to make it feel premium. Premium here is depth, hierarchy and type.
- **Don't** remove the browser's focus outline without shipping a replacement in the same rule. `outline-none` with no working ring is worse than leaving the default alone.
- **Don't** animate the focus indicator. A `transition-all` on a control means the ring fades in, which delays the one signal a keyboard user depends on.
- **Don't** use a border thicker than one pixel as a coloured accent stripe, including when faked with an inset shadow.
- **Don't** put a second typeface into the Workroom chrome, and don't let a serif cross in from the Hall.
- **Don't** animate layout properties. Animate `opacity`, `transform` and `color`. No bounce, no elastic, no lift on hover.
- **Don't** write a hex value into a component. If a room needs its own colour, promote it to named tokens behind that room's wrapper.

<!--
Known gaps between this record and the code, as of 2026-09-05. Recorded rather
than hidden; none of them were fixed by writing this file.

1. FIXED 2026-09-05. The shared Button and Input had no visible focus indicator:
   `focus-visible:outline-none` worked, `focus-visible:ring-3` generated no CSS
   (Tailwind 3 has no `ring-3`), and `focus-visible:ring-accent-bronze/50` pointed at
   an undefined variable. Both now use `outline-2 outline-offset-2 outline-foreground`,
   and `transition-all` was narrowed so the ring no longer fades in. A zero-specificity
   `:where(...):focus-visible` floor in `src/index.css` catches any control that
   defines nothing, while still losing to the Hall's cyan and the scoped bootcamp rings.
   Verified in a browser on all five Button variants and the Input: 18.26:1 in light,
   18.97:1 in the dark alternate, against the 3:1 an indicator needs.

2. FIXED 2026-09-05. `--accent-bronze`, `--accent-warm` and `--glow-bronze` were
   consumed by tailwind.config.ts and defined in no commit in the repo's history.
   They arrived 2026-04-06 in "Imported LSATATTORNEYS project files". `#b06a3e` was
   inferred from a literal rgba in the `glow-sm` shadow on 2026-06-26 and written into
   the previous DESIGN.md as a brand accent it never was. All three names and the
   bronze-literal `glow-sm` shadow are removed, and their thirteen call sites now use
   neutral tokens. Three of those call sites were visibly broken, not merely untokenized:
   the journal ReviewForm's Next button rendered near-white text on a transparent
   background, its active step dot was invisible while the inactive dots showed, and the
   Annotate toggle's active state was indistinguishable from its inactive state.
   `docs/chart-palette.md` and `scripts/validate-chart-palette.mjs` still carry the
   inherited hex and have not been touched.

3. Shadow tokens are dark-tuned and the app ships light. `shadow-sm` puts
   rgba(0,0,0,0.4) under a white card. Retired above; still applied by `ui/card.tsx`.

4. Contrast failures in the shipped light theme, measured: `--text-tertiary` 3.28:1,
   `--success` 2.24:1, `--warning` 2.08:1, `--state-correct` 2.53:1,
   `--state-incorrect` 3.60:1, `--teacher-accent` 3.03:1 as text. In the dark
   alternate, `--text-tertiary` 4.18:1. AA needs 4.5:1 for normal text.

5. Components are tactile today, not quiet. Buttons lift, scale on press, and gain
   a shadow on hover; cards carry `shadow-sm`. The record above chooses quiet and flat.
-->

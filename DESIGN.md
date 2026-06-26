---
name: LSAT U
description: A premium coaching platform for serious LSAT preparation, documented as it ships today.
colors:
  # ── App shell (dark-first HSL token system; hex here is the resolved dark value) ──
  shell-background: "#0a0a0a"
  shell-foreground: "#fafafa"
  shell-card: "#121212"
  shell-secondary: "#262626"
  shell-border: "#262626"
  shell-muted-foreground: "#a3a3a3"
  shell-primary: "#fafafa"
  accent-bronze: "#b06a3e"
  status-success: "#21b659"
  status-warning: "#f59f0a"
  status-destructive: "#de3b3b"
  state-correct: "#0fb781"
  state-incorrect: "#f53d5c"
  # ── Drill zone (graphite near-monochrome, light) ──
  drill-page: "#fafafc"
  drill-card: "#ffffff"
  drill-ink: "#1d1d1f"
  drill-muted: "#86868b"
  drill-border: "#e5e5ea"
  drill-correct: "#2f9e64"
  drill-wrong: "#e5484d"
  drill-warning: "#d9881f"
  # ── Inbox island (warm paper, light) ──
  inbox-paper: "#efe4d3"
  inbox-paper-bright: "#f7f3ea"
  inbox-ink: "#151a24"
  inbox-green: "#2f6a4f"
  inbox-crimson: "#a14f43"
  inbox-gold: "#f4d995"
  # ── Mainhub island (Apple-slate, light) ──
  mainhub-surface: "#fbfcff"
  mainhub-slate-border: "#e2e8f0"
typography:
  shell-body:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "'rlig' 1, 'calt' 1, 'cv11' 1"
  drill-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.12
  drill-stimulus:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "calc(0.5rem - 4px)"
  md: "calc(0.5rem - 2px)"
  lg: "0.5rem"
  drill-card: "20px"
  drill-inset: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.shell-primary}"
    textColor: "{colors.shell-background}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-drill:
    backgroundColor: "{colors.drill-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "44px"
  card-shell:
    backgroundColor: "{colors.shell-card}"
    textColor: "{colors.shell-foreground}"
    rounded: "{rounded.lg}"
  card-drill-stimulus:
    backgroundColor: "{colors.drill-card}"
    textColor: "{colors.drill-ink}"
    rounded: "{rounded.drill-card}"
    padding: "32px"
---

# Design System: LSAT U

## 1. Overview

**Creative North Star: "The Coach's Workspace, in Four Rooms"**

LSAT U is documented here as it actually ships, not as an idealized single system. The product is one app that currently speaks in four distinct but related visual dialects, each tuned to its room. The chassis (sidebar, foyer, admin, settings) is a disciplined **dark-first graphite** system built on HSL design tokens with a bronze ember of an accent. From that chassis, three lighter rooms open off: the **drill zone** (graphite near-monochrome on near-white, Apple-HIG restraint, color reserved for state), the **inbox** (a warm paper-and-ink editorial surface, the most human room in the app), and the **mainhub island** (an Apple-slate light card stack). The bootcamps then run their own fully scoped worlds (Main Conclusion warm-serif, Fallacy/Flaw verdigris-and-cake, Abstract brutalist) behind `.mc-bootcamp` / `.ff-bootcamp` / `.topic-abstract` wrappers.

The through-line is restraint and truthfulness, never decoration. Color carries meaning (correct, wrong, warning, current selection), never identity. Motion conveys state, never theatre. The system explicitly rejects the things its `PRODUCT.md` names as anti-references: SaaS-cream pastels and gradient blobs, Duolingo streak-flame gamification, card-grid hubs that present options instead of computing the next step, and support-desk chat patterns in the messenger.

The honest tension in this spec, surfaced rather than hidden: the four rooms do not yet share one token vocabulary. The shell is tokenized; the inbox and mainhub are hand-painted in inline hex. A user crossing room to room can feel the seams. This document records that truth so a future convergence can be deliberate.

**Key Characteristics:**
- Dark-first shell, light task rooms; depth via near-black layering and soft shadow, not glow.
- Color is semantic, not brand. The only "brand color" is a bronze ember used sparingly.
- One accent rule per room; no room runs a saturated identity color across its surface.
- Heavy use of scoped CSS-variable systems (`.mc-bootcamp`, `.ff-bootcamp`, `.topic-abstract`) so bootcamp worlds never leak into the chassis.
- Attempt-state colors are deliberately named apart from system-status colors so a self-report can never read as a judgment.

## 2. Colors

The palette is best read as one tokenized chassis plus three hand-painted rooms. Group by role within each.

### Primary
- **Shell Graphite-White** (`#fafafa`, `hsl(0 0% 98%)`): the shell's primary interactive color. On the dark chassis, "primary" is near-white: white fills, white text on dark, white primary buttons with dark text behind them.
- **Drill Ink** (`#1d1d1f`): the drill zone's primary fill and text. Primary drill buttons are ink-on-white pills. Replaces both the old FSvR Apple-blue and the bootcamp gold so the drill reads brand-neutral.

### Secondary
- **Bronze Ember** (`#b06a3e`): the one true brand accent, used sparingly as a warm glow (`box-shadow: 0 0 12px rgba(176,106,62,0.2)`) and warm highlight on the dark shell. Its rarity is the point; it is never a surface color.

### Tertiary (per-room signatures, light surfaces)
- **Inbox Pine + Clay** (green `#2f6a4f`, crimson `#a14f43`): the inbox's two-voice signature, distinguishing speakers on warm paper. Gold (`#f4d995`) is a sparing accent.
- **Mainhub Sky-Slate** (slate `#1e293b`–`#e2e8f0`, sky `#7dd3fc`): the mainhub island's Apple-slate scale on a `#fbfcff` surface.

### Neutral
- **Shell ramp** (`#0a0a0a` background → `#121212` card → `#262626` border/secondary → `#a3a3a3` muted text → `#fafafa` foreground): the dark chassis structure. All defined as HSL tokens; a `.light` class flips the same tokens to a near-white ramp.
- **Drill ramp** (`#fafafc` page → `#ffffff` card → `#e5e5ea` border → `#f0f0f2` hairline → `#86868b` muted → `#1d1d1f` ink): the drill zone's near-monochrome structure.
- **Inbox paper** (`#efe4d3` / `#f7f3ea` / `#eadfcf` paper tones, `#151a24` ink, `#5f513f` muted): the warm editorial substrate.

### State (semantic only, never decorative)
- **Shell status:** success `#21b659` (`142 71% 45%`), warning `#f59f0a` (`38 92% 50%`), destructive `#de3b3b` (`0 72% 51%`).
- **Attempt state:** correct `#0fb781` (emerald), incorrect `#f53d5c` (rose), with `again`/`easy` aliased to the same hues under distinct names on purpose.
- **Drill state:** correct `#2f9e64` (soft bg `#eaf6ef`), wrong `#e5484d` (soft bg `#fdecec`), warning `#d9881f` (soft bg `#fbf1e3`).

### Named Rules
**The Meaning-Not-Identity Rule.** Chromatic color appears only to signal state: correct, the student's wrong pick, warning, current selection. No room uses a saturated color as its identity. The bronze ember is the only brand hue, and it stays under 10% of any surface.

**The Self-Report Firewall Rule.** `--state-again` and `--state-easy` are aliased to the same hues as wrong/correct but kept under distinct token names, so a future hue shift to attempt-judgment colors can never silently reframe a spaced-repetition self-report as a right/wrong verdict.

**The Scoped-World Rule.** Every bootcamp palette lives behind a wrapper class (`.mc-bootcamp`, `.ff-bootcamp`, `.topic-abstract`) with `mc-`/`ff-`/`brutal-` prefixed tokens. Bootcamp color never resolves outside its wrapper and never collides with the shell's HSL tokens.

## 3. Typography

**Shell Font:** Outfit (with `ui-sans-serif, system-ui, -apple-system` fallback)
**Drill Font:** native system stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI"`)
**Bootcamp Fonts:** scoped per world (Georgia serif for Main Conclusion lessons and Fallacy/Flaw display, Inter for MC sans).

**Character:** The shell runs Outfit, a warm geometric sans, with OpenType features on (`cv11`, `calt`). The drill zone deliberately switches to the native Apple system stack so it reads as a focused, OS-native workspace distinct from the warm-serif lessons. Bootcamps each carry their own pairing.

### Hierarchy
- **Display / Drill hero title** (650 weight, 24px, line-height 1.12): drill question titles; Apple-tight letter-spacing.
- **Headline** (600–700, 18–20px): section heads, step titles.
- **Stimulus / argument text** (400, 20px, line-height 1.6): the close-reading surface in drills; the only place type runs large and airy.
- **Body** (400, 14px mobile / 16px desktop, line-height 1.6): shell body copy. Cap prose at 65–75ch.
- **Label / eyebrow** (700, 13px, uppercase, `soft` color): meta labels, eyebrows, section tags.
- **KPI number** (700, 42px, tabular): drill review scores.

### Named Rules
**The No-Serif-In-Drills Rule.** Serif stays in lessons. Drills and the shell are sans-only. A student moving from a warm-serif lesson into a drill should feel they entered a focused workspace, not a different product.

**The Tabular-Numerals Rule.** Counters, scores, and KPIs use tabular figures so digits never jitter as values change.

## 4. Elevation

Hybrid, and split by room. The **dark shell** conveys depth through near-black tonal layering (`#0a0a0a` page → `#121212` card → `#1a1a1a` elevated surface) plus dark-tuned shadows that read as deeper black rather than gray. Glow is rare: a single `--shadow-glow` (`0 0 24px rgba(255,255,255,0.06)`) and the bronze `glow-sm`. The **light rooms** (drill, inbox, mainhub) use soft, low-opacity ambient shadows to float white work-cards on near-white surfaces.

### Shadow Vocabulary
- **Shell sm/md/lg** (`0 1px 3px rgba(0,0,0,0.4)` → `0 8px 32px rgba(0,0,0,0.7)`): dark-chassis elevation, opacity scaling with lift.
- **Shell glow** (`0 0 24px rgba(255,255,255,0.06)`): rare ambient halo on key dark surfaces.
- **Bronze glow-sm** (`0 0 12px rgba(176,106,62,0.2)`): the single warm-accent glow.
- **Drill stimulus** (`0 20px 48px rgba(0,0,0,0.05)`): the diffuse lift under a floating white work-card.
- **Drill control / soft** (`0 10px 26px rgba(0,0,0,0.035)` / `0 4px 16px rgba(0,0,0,0.035)`): lighter secondary surfaces.

### Named Rules
**The Layer-Don't-Glow Rule.** On the dark shell, depth comes from near-black tonal steps and shadow opacity, not from neon glows. Glow is a rare punctuation, never the structural language.

**The Diffuse-Soft-Shadow Rule.** Light-room shadows are large-radius and very low opacity (≤0.05). A drill card floats; it does not cast a hard 2014-app drop shadow.

## 5. Components

### Buttons
- **Shape:** shell buttons use the token radius (`0.5rem` / `md` = `calc(0.5rem - 2px)`); drill buttons are full pills (`9999px`).
- **Shell Primary:** near-white fill (`#fafafa`) with dark text (`#0a0a0a`), `8px 16px` padding. The inverse of the dark surface.
- **Drill Primary:** ink fill (`#1d1d1f`), white text, pill, 44px min height.
- **Secondary / Ghost:** bordered, transparent or white fill, foreground text. Disabled at 0.66 opacity, no hover.
- **Hover / Focus:** subtle background shift and 1px rise; focus ring is graphite (`outline: 3px solid rgba(29,29,31,0.35)`), never an accent hue.

### Cards / Containers
- **Corner Style:** shell `0.5rem`; drill stimulus `20px`, insets `14px`.
- **Background:** shell cards `#121212` on `#0a0a0a`; drill cards pure white on `#fafafc`.
- **Shadow Strategy:** see Elevation; dark cards layer, light cards float on diffuse soft shadow.
- **Border:** 1px `#262626` (shell) or `#e5e5ea` (drill). Hairlines `#f0f0f2`.
- **Internal Padding:** 28–40px in drills (stimulus roomiest), tighter in shell chrome.

### Inputs / Fields
- **Style:** bordered (`--input` `#262626` dark, `#e5e5ea` light), token radius, surface-matched fill.
- **Focus:** border shift to ring color plus the graphite focus ring; no glow.
- **Mobile:** inputs render at 16px to prevent iOS zoom.

### Navigation
- **Foyer (primary nav):** `FoyerSidebar` (state blocks + workspace nav) plus `FoyerHeroRing` orbital (3 nodes: Smart Drill, Resume, Ask Joshua). The foyer additionally hosts a `GooeyDock` quick-launch row, allowed only on `/foyer`.
- **Sidebar:** label + icon rows under a single "Workspace" header, permission-filtered. Default / hover / active states by background tint, not a colored left stripe.

### Signature Component — The Drill Surface
Every lab composes one fixed anatomy so all drills read as the same surface: top bar (autosave pill + home link) → header (eyebrow + counter + thin graphite progress bar) → white stimulus card with an inset "THE CONCLUSION" sub-block → neutral option grid (2-up desktop, 1-up mobile) → in-flow reveal/teach block → pill footer nav → end-of-set review (verdict, KPI, where-it-slipped breakdown, tappable answer key). On reveal, the correct option paints `correct`, the student's wrong pick paints `wrong`, unpicked options recede. The reveal teaches the predictable weakness of the correct type, written to the student's actual pick. Verdict copy reads `Calibrated.` or `Re-run open.`, never "Failed," never a letter grade.

### Signature Component — The Inbox Thread
A warm paper-and-ink 1:1 messaging surface, one ongoing thread per student with Joshua. Two-voice color (pine green / clay crimson) distinguishes speakers. Fast enough to feel like messaging, structured enough to feel like coaching. Supports PDF attachments. Not a support ticket, not a legal file.

## 6. Do's and Don'ts

### Do:
- **Do** build new chassis surfaces on the HSL token vocabulary (`bg-background`, `text-foreground`, `border-border`, `bg-primary`, the `state-*` tokens). The shell is tokenized; extend the tokens, don't inline hex.
- **Do** keep color semantic. Use `state-correct` / `state-incorrect` / `state-warn` to mark meaning, the bronze ember for rare warmth, and nothing chromatic for pure decoration.
- **Do** scope any new bootcamp world behind its own wrapper class with prefixed tokens, the way `.mc-bootcamp` / `.ff-bootcamp` / `.topic-abstract` do.
- **Do** compute the next step and present one CTA. Every hub leads with one computed action, never a grid of equal options.
- **Do** float light-room cards on diffuse, low-opacity soft shadow (≤0.05), and convey dark-shell depth through near-black layering.
- **Do** route every progress claim, badge, and CTA to real data. Honest empty states beat fabricated numbers.

### Don't:
- **Don't** use `border-left` / `border-right` greater than 1px as a colored accent stripe (including via inset box-shadow). Convey active or speaker state with background tint or avatar.
- **Don't** ship gradient text (`background-clip: text` over a gradient). Emphasis comes from weight and size, in a single solid color.
- **Don't** spray glassmorphism. The one `backdropBlur.glass` token is for rare, purposeful use, not decoration.
- **Don't** build the hero-metric template: a giant number plus tiny label plus gradient accent. That is the SaaS-dashboard cliché `PRODUCT.md` rejects.
- **Don't** add new inline-hex palettes. The inbox and mainhub already diverged into hand-painted warm-paper and Apple-slate; do not start a fifth dialect. If a room needs its own identity, promote it to named tokens.
- **Don't** import the generic LSAT-prep playbook: card-grid hubs, Duolingo streak flames and XP bars, or support-desk chat patterns ("How can I help you today?"). The product does not reward attendance and the inbox is not a ticket queue.
- **Don't** animate layout properties (width, height, padding, margin) except the drill progress bar. Animate `opacity`, `transform`, `color`, `box-shadow`. No bounce, no elastic.
- **Don't** show fabricated telemetry (placeholder energy/status values) as if it were real progress. No fake data, no dead buttons.

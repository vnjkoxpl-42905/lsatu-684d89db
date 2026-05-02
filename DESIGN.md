---
name: Intro to LR Bootcamp
description: Premium ed-tech surface for Joshua's Logical Reasoning bootcamp inside LSAT U.
colors:
  aspiring-gold: "#E8D08B"
  aspiring-gold-hover: "#F2DF9A"
  aspiring-gold-deep: "#C5A059"
  bg-shadow: "#05070A"
  bg-night: "#0B1120"
  surface: "#12151E"
  surface-elev: "#1A1E2B"
  ink-bright: "#F1F5F9"
  ink-soft: "#CBD5E1"
  ink-faint: "#94A3B8"
  role-conclusion: "#10B981"
  role-premise: "#60A5FA"
  role-pivot: "#F97316"
  role-opposing: "#A855F7"
  role-concession: "#FACC15"
  role-background: "#94A3B8"
  state-success: "#10B981"
  state-warn: "#FACC15"
  state-error: "#EF4444"
  state-info: "#38BDF8"
typography:
  display:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: "1.1"
  h1:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "1.2"
  h2:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: "1.25"
  h3:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "1.3"
  body:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.6"
  body-prose:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.7"
  small:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: "1.55"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11.5px"
    fontWeight: 600
    lineHeight: "1.5"
    letterSpacing: "0.04em"
  label:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    lineHeight: "1.4"
    letterSpacing: "0.06em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "14px"
  xl: "24px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.aspiring-gold}"
    textColor: "{colors.bg-shadow}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.aspiring-gold-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  chip:
    backgroundColor: "{colors.surface-elev}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
    typography: "{typography.small}"
  chip-selected:
    backgroundColor: "{colors.aspiring-gold}"
    textColor: "{colors.bg-shadow}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  named-tool-inline:
    backgroundColor: "{colors.aspiring-gold}"
    textColor: "{colors.aspiring-gold}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
    typography: "{typography.mono}"
---

# Design System: Intro to LR Bootcamp

> Scope: this DESIGN.md governs only the Intro to LR bootcamp (`/bootcamp/intro-to-lr/*`, `src/pages/IntroToLrBootcamp.tsx`, `src/bootcamps/main-conclusion/`). All other LSAT U surfaces are out of scope. Codebase stores colors as `R G B` triplets so Tailwind `<alpha-value>` slots compose; the hex values in the frontmatter are the human-readable equivalents of those triplets. The frontmatter is normative.

## 1. Overview

**Creative North Star: "The Coach's Workbook."**

The bootcamp sits on a tinted-near-black surface (warm-cool layered darks) and reserves Aspiring Gold for moments that earn it. Long-form lesson prose carries in Fraunces, the runner shell speaks in Outfit, and named tools land as JetBrains Mono callouts. It reads like a well-typeset workbook with a coach in the room, not like a test-prep platform with a points meter.

The system is restrained on color, generous on whitespace, deliberate on hierarchy. Motion is accent: 150 to 220 millisecond eases, transform and opacity only, no bounce, no spring. Argument-structure roles (conclusion, premise, pivot, opposing, concession, background) carry a locked color vocabulary so meaning travels with form. Everything is dark-by-purpose because the student spends extended time reading dense prose under indoor light. Light mode is not a default the system rejects, it is a future swap the tokens were already shaped for.

The bootcamp explicitly rejects: 7Sage / Khan Academy LSAT / LSAT Demon card-grid hubs, SaaS-cream startup landing aesthetics, cookie-cutter LMS lesson-1.1 / lesson-1.2 shells, Duolingo-shaped streak gamification. None of those are sources of inspiration; all are sources of allergies.

**Key Characteristics:**

- Dark-by-purpose, not dark-by-default. Surfaces are layered tonal darks, never `#000`.
- Restrained color strategy: tinted neutrals plus one accent at ≤10% per screen.
- Editorial-typographic pairing: Fraunces (display + lesson prose), Outfit (UI sans), JetBrains Mono (named-tool callouts).
- Argument-structure role colors are a signature primitive, not a chart palette.
- Motion is accent: short eased transitions on transform and opacity, never on layout.
- Card grids are forbidden as primary navigation. Hubs lead with one computed CTA.

## 2. Colors

The palette is a near-black workbook with one warm accent and a locked vocabulary of role colors that carry argument meaning.

### Primary

- **Aspiring Gold** (`#E8D08B`): the only warm accent in the system. Used for the active runner step, the cleared-screen moment, the focus ring, the named-tool callout background tint, and primary button surfaces. Reserved territory.
- **Aspiring Gold Hover** (`#F2DF9A`): primary button hover and gold-on-gold lift moments.
- **Aspiring Gold Deep** (`#C5A059`): pressed state, inset variants, and the deep stop in `grad-accent-strong`.

### Secondary (Argument-Structure Roles)

These six colors carry argument structure meaning across the bootcamp. Locked at Gate 3. Never repurposed for non-argument signals; never used for branding or status.

- **Conclusion Green** (`#10B981`): the conclusion role chip in RoleLabeler, the conclusion highlight in lesson prose, the cleared-checkpoint affirmation.
- **Premise Blue** (`#60A5FA`): premise role chip and premise highlights.
- **Pivot Orange** (`#F97316`): the pivot indicator role; reserved for indicator tagging surfaces.
- **Opposing Purple** (`#A855F7`): opposing-view role chip; used in pattern recognition surfaces.
- **Concession Yellow** (`#FACC15`): concession role chip. Distinct from Aspiring Gold by hue; never confused at a glance.
- **Background Slate** (`#94A3B8`): the background-information role; the "this is context, not argument" color.

### Neutral

Layered dark surfaces for dark-by-purpose theming, tinted toward the brand hue rather than pure black.

- **BG Shadow** (`#05070A`): app background. Tinted near-black, not `#000`.
- **BG Night** (`#0B1120`): secondary background, the rail and drawer surface.
- **Surface** (`#12151E`): card and panel surface.
- **Surface Elev** (`#1A1E2B`): elevated surface for active cards and modals.
- **Ink Bright** (`#F1F5F9`): primary body and heading text. AAA contrast on Surface.
- **Ink Soft** (`#CBD5E1`): secondary text, subtitles, supportive prose.
- **Ink Faint** (`#94A3B8`): tertiary text, helper hints, eyebrow labels at low intensity.

### State

- **Success** (`#10B981`): same hex as Conclusion Green by design (a cleared step is a confirmed conclusion).
- **Warn** (`#FACC15`): cautionary state for diagnostics and attempt feedback.
- **Error** (`#EF4444`): wrong-answer affordance, never used as a branding accent.
- **Info** (`#38BDF8`): informational notes inside the runner.

### Named Rules

**The One-Voice Rule.** Aspiring Gold is the only warm accent in the system. It is used on ≤10% of any given screen. Its rarity is the point. If three things on a screen are gold, none of them are.

**The Role-Color Rule.** Conclusion green, premise blue, pivot orange, opposing purple, concession yellow, background slate. This vocabulary is locked. Never repurposed for status, never used for brand, never reassigned even when the same role appears in a new surface. A premise is blue here, in drills, in the simulator, on the print Quick Reference Card.

**The Tinted-Neutral Rule.** No `#000`, no `#fff`. Every neutral is tinted toward the brand hue. Even at the darkest surface (`#05070A`) the warmth is detectable; even at the brightest text (`#F1F5F9`) the slate cool keeps it from glaring.

## 3. Typography

**Display Font:** Fraunces (with `ui-serif`, `Iowan Old Style`, `Apple Garamond`, Georgia fallbacks)
**Body Font:** Outfit (with Inter, `system-ui`, sans-serif fallbacks)
**Mono Font:** JetBrains Mono (with `ui-monospace`, `SFMono-Regular` fallbacks)

**Character:** an editorial workbook with a precise interface skin. Fraunces carries the warmth and authority of the lesson prose; Outfit carries the tightness and clarity of the runner shell; JetBrains Mono lands every named tool as a marked-up callout. The pairing reads as a coach who writes essays and ships software.

### Hierarchy

- **Display** (Fraunces, 700, 36px, 1.1 line-height): the runner hero title and module display headers. The only H1-tier mark on a page.
- **Headline / H1** (Outfit, 600, 28px, 1.2): page-level titles inside the workspace shell.
- **Title / H2** (Outfit, 600, 21px, 1.25): section titles within a lesson or hub.
- **Subtitle / H3** (Outfit, 600, 17px, 1.3): subsection and card titles.
- **Body** (Outfit, 400, 14px, 1.6): UI prose, runner copy, helper text.
- **Body Prose** (Fraunces, 400, 15px, 1.7): lesson prose only. Capped at 64ch.
- **Small** (Outfit, 400, 12.5px, 1.55): secondary metadata, footnote text.
- **Mono** (JetBrains Mono, 600, 11.5px, 1.5, letter-spacing 0.04em): named-tool callouts and any inline code-like reference.
- **Label** (Outfit, 700, 10.5px, 1.4, letter-spacing 0.06em): eyebrow labels above page titles. Always all-caps when rendered.

### Named Rules

**The Voice-to-Typography Rule.** Register 2 (Joshua's authored prose) lives in serif. Register 1 (decisive computed copy and runner copy) lives in sans plus mono callouts. Lessons read in Fraunces; the runner shell speaks in Outfit; named tools render as JetBrains Mono. Typography carries voice register, not just hierarchy.

**The 64ch Rule.** Lesson prose caps at 64 characters per line. Reading column over content density. The bootcamp would rather scroll than crowd.

**The Eyebrow Rule.** Every page-level surface leads with eyebrow plus display title plus subtitle. Eyebrow is short, all-caps, tracking 0.18em, accent-colored when active. One concept per eyebrow ("Lessons", "Drills", "Pick up where you left off"). Never "Module N", never spec voice.

## 4. Elevation

The bootcamp is layered tonally before it is shadowed. Depth comes first from the four-step surface ramp (`bg-shadow` → `bg-night` → `surface` → `surface-elev`), then from the shadow vocabulary, then from accent glows reserved for state moments. Surfaces are flat at rest; shadows respond to interaction.

### Shadow Vocabulary

- **Shadow 1** (`0 0 0 1px rgb(255 255 255 / 0.04), 0 1px 2px rgb(0 0 0 / 0.4)`): inline elements, chips, low-stakes lift.
- **Shadow 2** (`0 0 0 1px rgb(255 255 255 / 0.06), 0 8px 24px -8px rgb(0 0 0 / 0.6)`): cards, panels, hover state on lifted elements.
- **Shadow 3** (`0 0 0 1px rgb(255 255 255 / 0.08), 0 24px 48px -12px rgb(0 0 0 / 0.7)`): modals, top-priority surfaces, focused active card in a hub.
- **Shadow Lift** (premium tier, gold-tinted hairline plus warm under-glow): the active runner step and the cleared-screen surface. Carries the "this matters now" affordance.
- **Shadow Press** (premium tier, gold-tinted hairline plus tight inner shadow): pressed state on primary buttons and confirmed selections.
- **Glow Accent Soft** (`0 0 24px -4px rgb(232 208 139 / 0.18)`): hover state on accent surfaces; warmth without commitment.
- **Glow Accent Strong** (`0 0 32px -2px rgb(232 208 139 / 0.36)`): the cleared moment, the active diagnostic answer, the confirmed-correct attempt.

### Named Rules

**The Glow-Earns-Itself Rule.** Accent glow is reserved for the active runner step, a confirmed-correct attempt, or the cleared-screen surface. Never decorative. If three things on the screen glow, none of them do.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Hover and focus introduce shadow; pressed introduces inner shadow; cleared introduces glow. Depth is a response to state, not a baseline.

## 5. Components

### Buttons

- **Shape:** softly rounded (8px, `rounded.md`).
- **Primary** (Aspiring Gold on BG Shadow text, 10px by 20px padding, label typography): the single computed CTA on every hub. Hover lifts to Aspiring Gold Hover; pressed drops to Shadow Press. Used sparingly, once per surface where possible.
- **Ghost** (transparent on Ink Bright, 10px by 20px padding): secondary actions, "Try again" affordances, "Skip for now" kinds of choices.
- **Focus:** 2px Aspiring Gold outline, 2px offset.

### Chips (the `ChipPicker` Primitive)

- **Style:** Surface Elev background, Ink Soft text, fully rounded, 6px by 12px padding, small typography.
- **Selected:** swap to Aspiring Gold background and BG Shadow text. The same chip clicked again clears back to default. No third state.
- **Role-tagged variants:** when used as argument-structure role chips, the selected color is the locked role color (Conclusion Green, Premise Blue, etc.), not Aspiring Gold. Aspiring Gold is the runner's voice; role colors carry argument meaning.
- **Identifier chips** (sentence numbers, A/B/C/D letters, locked role labels): never `aria-hidden`. Decorative chips reinforcing a textual label may be `aria-hidden`.

### Cards / Containers

- **Corner Style:** 14px (`rounded.lg`).
- **Background:** Surface (`#12151E`); elevated cards use Surface Elev (`#1A1E2B`) plus a subtle `grad-card-highlight` overlay.
- **Shadow Strategy:** Shadow 2 on default lift, Shadow 3 on focused-active, Shadow Lift on the active runner step.
- **Border:** 1px hairline through the shadow inset; standalone borders rarely needed.
- **Internal Padding:** 20px default; runner phase cards step up to 24px and 32px for breathing room.
- **Nested cards are forbidden.** A card inside a card is always a layout failure. Use a divider, a border, a leading number, or stop.

### Inputs / Fields

- **Style:** Surface background, Ink Bright text, 8px (`rounded.md`) corner, 10px by 12px padding.
- **Focus:** 2px Aspiring Gold outline, 2px offset; the field's border itself does not change.
- **Error:** State Error border, never a fill; error text below the field in small typography.

### Navigation

- **Left Rail (M1 to M6 chips):** the one accepted "Module N" usage in student copy. Chips live as a tight vertical stack on desktop, collapse to a horizontal pill row on phone. Active chip uses Aspiring Gold; visited uses Ink Soft; locked uses Ink Faint with a lock affordance.
- **JumpTo pill row:** the secondary nav inside a hub. Always a row of pills, never a card grid. Computed-active pill receives the gold treatment; the rest are ghost chips.
- **Mobile:** the left rail moves to a horizontal scroll strip at the top of the workspace shell at the `phone` breakpoint (≤600px).

### Signature Components

- **`RunnerHero`:** the computed-CTA hub hero. Eyebrow plus display title plus one primary CTA (Aspiring Gold) and at most one ghost secondary. Never a card grid below it.
- **`TrainingPath` (path-strip):** a horizontal phase indicator showing briefing → demo → attempt → reveal → coach → checkpoint → cleared. Active step glows; completed steps fill in Conclusion Green; future steps are Ink Faint.
- **`PhaseRunner`:** the phase machine that gates Continue until the student submits. Reset is always available. Score line reads as `role="status"` after submission so screen readers announce the verdict.
- **`ChipPicker`:** the shared primitive used by RoleLabeler, IndicatorTagger, ConclusionPicker. Click-again-to-clear, keyboard-activatable, three-branch score copy (zero / partial / clean).
- **`named-tool-inline`:** the inline mono callout for any named tool reference. Aspiring Gold text on a gold-tinted background, 4px corner, mono typography. The only place text is colored gold without a surface behind it.

## 6. Do's and Don'ts

### Do:

- **Do** use Aspiring Gold (`#E8D08B`) on ≤10% of any given screen. Reserve it for active state, primary CTA, and the cleared moment.
- **Do** carry argument-structure role colors (conclusion green, premise blue, pivot orange, opposing purple, concession yellow, background slate) consistently across every surface that names those roles.
- **Do** lead every hub with one computed CTA from `RunnerHero`. JumpTo pill row is the only acceptable secondary nav.
- **Do** gate Continue until the student submits. Reveal copy must reference the student's actual attempt, not a generic answer.
- **Do** make every chip and selectable candidate click-again-to-clear and keyboard-activatable.
- **Do** ship a Try-again affordance on every submitted attempt. Submission must never be a one-way door.
- **Do** animate on transform and opacity only, with `cubic-bezier(0.4, 0, 0.2, 1)` easing and 150-220ms durations.
- **Do** honor `prefers-reduced-motion` everywhere. Durations zero out, motion does not become load-bearing.
- **Do** trace every progress claim, badge, percentage, streak, and "next step" CTA to real persistence (`useModuleProgress`, `useDiagnostics`) or a static registry.
- **Do** prefer honest empty states over fabricated content. If the dashboard has no data, lead with the action that generates data.

### Don't:

- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe on cards, list items, callouts, or alerts. Enforced by `__tests__/impeccable-bans.test.ts`. Escape hatch: `// impeccable-allow: side-stripe` comment, only if genuinely necessary.
- **Don't** use gradient text (`background-clip: text` plus a gradient background). Use a single solid color; emphasize via weight or size.
- **Don't** use glassmorphism decoratively. Rare and purposeful, or nothing.
- **Don't** lead a hub with an equal-weight card grid (the 7Sage / Khan Academy / Manhattan Prep failure mode). The JumpTo pill row is the only acceptable secondary nav.
- **Don't** ship the hero-metric template (big number, small label, supporting stats, gradient accent). SaaS cliché.
- **Don't** reach for a modal first. Exhaust inline and progressive alternatives.
- **Don't** use em dashes (`—` or `--`) in utility, computed, or runner copy. Joshua's authored prose may keep them; the runner shell may not.
- **Don't** use `#000` or `#fff`. Every neutral is tinted toward the brand hue.
- **Don't** invent analytics, mastery scores, streaks, score predictions, or "X students improved Y points" copy. If the data is not real, the metric is not real.
- **Don't** render internal IDs (`MC-LSN-*`, `MC-DRL-*`, `Phase A` through `Phase I`, `Stage-Gate format`, `voice register N`, `OCR pending`) in student-visible copy. Use `data-*` attributes for QA hooks.
- **Don't** ship Duolingo-shaped streak flames, mascot animations, XP bars, or trophy popovers. The bootcamp does not reward attendance.
- **Don't** write "Welcome back" or "Welcome to X" copy that is not conditional on actual returning state.
- **Don't** use industry vocabulary in student copy. "Stimulus" is industry; "the argument" is student. Same for "calibration drill", "Phase D distractors", "OCR ingestion".
- **Don't** lock review surfaces without a `BOOTCAMP_PREVIEW_OPEN` bypass. If you build a gate, you build the bypass at the same time.

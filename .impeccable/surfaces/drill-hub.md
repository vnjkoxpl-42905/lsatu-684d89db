# Surface brief: the drill hub

Route: `/classroom/drill` (also `/practice`, which redirects). Code: `src/pages/AcademyMainhub.tsx`, `src/components/mainhub/`, the `.drill-observatory-*` block of `src/components/classroom/classroom.css`, `src/components/drill/SectionToggle.tsx`. Wrapper: `.classroom-root-drill` and `.drill-observatory-root`.

Written 2026-09-08 from the impeccable audit and critique, after Joshua's two decisions: Today's assigned item leads the hero, and this hub is a sanctioned scoped world with its own record. This file is that record. DESIGN.md's Workroom rules do not apply inside the wrapper; the rules below do.

## What the page is for

A paying client logs in to do what Joshua assigned. The page tells them that first, in the hero, with one button. Everything else on the page (adaptive drill, the builder, the question jump, insights) is the fallback for a student with nothing assigned, or the second thing after the assignment. Product principle 2 (compute the next step, do not present a grid) is the whole layout brief.

Order of the page, top to bottom: utilities (jump, search, LR/RC), the hero (greeting, Next up, one CTA, one quiet alternative, the builder console), the practice card (insights, Analytics, Journal), Today (the queue behind the hero's item).

## The ground

The stage is cream (`--classroom-drill-page`). The cards on it are near-black (`--observatory-surface-card` `#08080b`). Two of the three cards carry a photograph (the horizon behind the hero, the eclipse behind Today), and those two photographs are the only decoration on the page. No accent colour. No gradients. No grid textures.

Controls that sit on the stage itself (the jump row, the section switch) are inked for the stage: `--observatory-stage-*`. Controls on a card are inked ivory: the `--observatory-ink*` ladder. The 2026-09-08 audit found the jump row inked for the cards while sitting on the stage, at 1.07:1. Tone is decided by what a control sits on, never by what is near it.

## Ink and contrast

WCAG AA is a defect gate here as everywhere. Measured against `#08080b`, the ivory ladder passes for text from `--observatory-ink-50` (4.9:1) upward. The steps below it (0.38, 0.42, 0.45, 0.48) were removed on 2026-09-08; they were carrying labels at 3.2:1 to 4.2:1. Nothing that carries text goes below `ink-50`. Hairlines, rings and skeleton bars use their own tokens and may be fainter.

On the stage: `--observatory-stage-ink` 12.9:1, `--observatory-stage-muted` 5.3:1 on `--observatory-stage-well`.

Over the photographs, text sits on a scrim (`::before` on the hero and on Today's inner surface). The scrim is mandatory; the photographs have bright crops.

## Type

Three families, on purpose, one job each:

- Fraunces, weight 400, `opsz` 60: the greeting only (`h1`). It is the one serif line on the page. Insight values and Today titles use it at 20 to 22px as the page's second display voice. Nothing else.
- JetBrains Mono, 10 to 11px, tracked 0.16 to 0.18em, uppercase: micro-labels and chips. Never a sentence.
- Outfit: everything else. Body 13.5 to 14px, the Next up title 19px semibold, the console heading fluid.

## Depth

Hairline rings (`0 0 0 1px`) separate surfaces. Shadows are quiet: `0 12px 32px` at 12 to 16 percent, not the 60px at 25 to 35 percent the page shipped with. Glass (`backdrop-filter`) appears only where text sits over a photograph: the hero console and Today's inner surfaces. A glass panel on the flat black practice card is a defect.

## Controls

- 44px minimum by height, met by the control: the CTA (46px), the console button (46px), the section switch options (44px), selects (44px), secondary links and insight actions (44px). No pseudo-element hit areas.
- Focus: a 2px solid ivory outline (`--observatory-focus`), offset 3px, on every pill control. Full-bleed rows inside a clipped container use the inset variant (`.drill-observatory-focus-inset`). On the stage, a 2px `--observatory-stage-ink` outline. No control removes an outline without one of these.
- Hover: a brightness or colour change. Rails and tiles may lift 2px; the primary CTA never moves.
- Motion: `--observatory-motion` (160ms) for state; the section switch's indicator is a spring. Transform and opacity only. The RC flip's height snaps. `prefers-reduced-motion` stops everything.

## Doors

One door to the builder: the hero console. The practice card does not repeat it. An insight may offer a contextual action (open analytics, open the journal, drill a weak type) because it is a response to real data, not a menu item.

While a stage (builder, analytics) is open, the hero is not rendered. The stage carries its own title and Cancel.

## Copy

No em-dashes anywhere a student can read, including placeholders. Buttons say what they do ("Start", "Resume drill", "Set up an LR drill"). "Smart Drill" is the product's name for the adaptive drill and stays, with the sentence before it saying what it does. The date reads the same as Classroom Home: `Tuesday · September 8 · 2026`.

## Known debt (not fixed on 2026-09-08)

- 206 `!important` declarations in the observatory block. They exist to override shadcn's Card and Button. The right fix is unstyled primitives for this surface.
- The hub ignores the app's dark toggle: the stage is cream either way. Acceptable while the stage is documented as cream here.
- `.drill-observatory-practice-tile` and `PracticeTile` are still exported for the RC flip and are no longer used on the LR default stage.

# Surface brief: the drill hub

Route: `/classroom/drill` (also `/practice`, which redirects). Code: `src/pages/AcademyMainhub.tsx`, `src/components/mainhub/`, the `.drill-observatory-*` block of `src/components/classroom/classroom.css`, `src/components/drill/SectionToggle.tsx`. Wrapper: `.classroom-root-drill` and `.drill-observatory-root`.

Written 2026-09-08 from the impeccable audit and critique, after Joshua's two decisions: Today's assigned item leads the hero, and this hub is a sanctioned scoped world with its own record. This file is that record. DESIGN.md's Workroom rules do not apply inside the wrapper; the rules below do.

## What the page is for

A paying client logs in to do what Joshua assigned. The page tells them that first, in the hero, with one button. Everything else on the page (adaptive drill, the builder, the question jump, insights) is the fallback for a student with nothing assigned, or the second thing after the assignment. Product principle 2 (compute the next step, do not present a grid) is the whole layout brief.

Order of the page, top to bottom: utilities (jump, search, LR/RC), the hero (greeting, Next up, one CTA, one quiet alternative, the builder console), the practice card (insights, Analytics, Journal), Today (the queue behind the hero's item).

## The ground

The stage follows the theme: cream (`--classroom-drill-page`, `#fdf8f3`) in light, near-black `#121019` in dark. `ClassroomLayout` sets `html.dark` from the theme, which is what the classroom's dark palette keys on. The cards on it are near-black (`--observatory-surface-card` `#08080b`). One card, the hero, carries a photograph (the horizon), and it is the only decoration on the page. Today was flattened to the same near-black surface as the practice card on 2026-09-08; two photographs on one screen read as a template. No accent colour. No gradients. No grid textures.

Controls that sit on the stage itself (the jump row, the section switch) are inked for the stage: `--observatory-stage-*`, which carry a dark set under `html.dark` (valued from the jump row's dark tone, so the strip stays one system). The jump row's `tone` prop follows `useTheme` for the same reason: it names what the row sits on, and the stage is what the theme changes. Fixed 2026-09-09; before that both controls stayed cream on the black stage. Controls on a card are inked ivory: the `--observatory-ink*` ladder. The 2026-09-08 audit found the jump row inked for the cards while sitting on the stage, at 1.07:1. Tone is decided by what a control sits on, never by what is near it.

## Ink and contrast

WCAG AA is a defect gate here as everywhere. Measured against `#08080b`, the ivory ladder passes for text from `--observatory-ink-50` (4.9:1) upward. The steps below it (0.38, 0.42, 0.45, 0.48) were removed on 2026-09-08; they were carrying labels at 3.2:1 to 4.2:1. Nothing that carries text goes below `ink-50`. Hairlines, rings and skeleton bars use their own tokens and may be fainter.

On the stage: `--observatory-stage-ink` 12.9:1, `--observatory-stage-muted` 5.3:1 on `--observatory-stage-well`.

Over the photographs, text sits on a scrim (`::before` on the hero and on Today's inner surface). The scrim is mandatory; the photographs have bright crops.

**The ink ladder does not hold over a photograph, and the contrast scan cannot see it.** The ladder's alpha steps were measured against the flat card `#08080b`. The scan reads the scrim's declared colour, not the image underneath, so it reported zero fails while three hero lines were failing. Measured on 2026-09-09 by sampling `hub-horizon.webp` under each text box and compositing photo, scrim and the text's own alpha: the quiet link was **1.89:1**, the Next up facts line **2.76:1**, the dateline **4.50:1**, all needing 4.5. Two fixes, together: hero text that carries meaning is full ivory (`--observatory-ink`, no alpha step), and the horizontal scrim's middle stop went 0.35 to 0.58. That is the measured floor; it clears every hero line and still opens the middle enough for the horizon to read. Any change to the hero photo, the scrim, or hero text colour has to be re-measured the same way, not scanned.

**The rule is the greeting column, not a list of lines, and it is measured at every width.** The first pass named the three lines it had measured, which left the rest of the column on the ladder: the assigned hint at **3.24:1** at 375, the paragraphs the failed and empty heroes render, and the explainer. The reason the gap survived review is that `background: cover` at `50% 78%` changes which part of the photograph lands under the text as the hero narrows. The bright horizon is dragged into the greeting column at 375, 390 and 768 and pushed out of it from 1024 up, so the same line passes on a laptop and fails on a phone. One crop never speaks for the others. Every line inside `.drill-observatory-greeting` is now full ivory, the CSS lists the whole ladder rather than the steps in use, and the six widths are the unit of measurement. The console card beside the column keeps the ladder, because it carries its own `rgba(6,6,9,0.55)` panel and measures 8.81:1.

**A second scan blind spot, on the default stage.** `bgOf` walks ancestors, so text on an absolutely positioned **sibling** is measured against whatever sits behind that sibling. The section switch's active label reports 1.06:1 and is really 11.79:1 on the pill it sits on. Text over a photograph, a gradient, a sibling or a `::before` needs sampling. A 1a fail on this page is a question, not an answer.

## Type

Three families, on purpose, one job each:

- Fraunces, weight 400, `opsz` 60: the greeting only (`h1`). It is the one serif line on the page. Insight values and Today titles use it at 20 to 22px as the page's second display voice. Nothing else.
- JetBrains Mono, 10 to 11px, tracked 0.16 to 0.18em, uppercase: micro-labels and chips. Never a sentence.
- Outfit: everything else. Body 13.5 to 14px, the Next up title 19px semibold, the console heading fluid.

## Depth

Hairline rings (`0 0 0 1px`) separate surfaces. Shadows are quiet: `0 12px 32px` at 12 to 16 percent, not the 60px at 25 to 35 percent the page shipped with. Glass appears only on the hero console. It is the one `backdrop-filter` on the page, at `blur(12px)`, and it is there because it sits over the photograph. A glass panel anywhere else, including on Today, is a defect.

## Controls

- 44px minimum by height, met by the control: the CTA (46px), the console button (46px), the section switch options (44px), selects (44px), secondary links and insight actions (44px). No pseudo-element hit areas.
- Focus: a 2px solid ivory outline (`--observatory-focus`), offset 3px, on every pill control. Full-bleed rows inside a clipped container use the inset variant (`.drill-observatory-focus-inset`). On the stage, a 2px `--observatory-stage-ink` outline. No control removes an outline without one of these.
- Hover: a brightness or colour change. Rails and tiles may lift 2px; the primary CTA never moves.
- Motion: `--observatory-motion` (160ms) for state; the section switch's indicator is a spring. Transform and opacity only. The RC flip's height snaps. `prefers-reduced-motion` stops everything.
- The curve is ease-out (`--observatory-ease`, quart), never ease-in-out. A control answering a pointer has to leave immediately: the standard curve covers 2.6% of the distance in the first 10% of a 160ms transition, the quart covers 34.7%. No bounce, no elastic, anywhere.
- A transition list names every property its own `:hover` and `:active` change. Three of them named only `transform` and got their background animated by accident, through a Tailwind utility that outranked the rule; once the rules won on specificity those hovers would have snapped. Adding a hover means checking the list.
- Every control answers the pointer. The three jump-row selects had `:disabled` and `:focus-visible` and nothing for hover; they now strengthen their ring, mixed from `--qf-ink` so it reads in both tones.

## When it fails

An empty hero and a failed hero are not the same thing, and the page used to draw them the same way: `primary` is null on error, so a student whose assignments failed to load was told, silently, that she had none. The hero now says what did not load before it offers her own practice, and the Today card says the same for its queue. Both carry a Try again.

That button reloads the page. Today is assembled from seven sources and only two are react-query backed, so invalidating queries would retry two of seven and look like it had retried all of them. A reload is the honest action until those hooks are converted.

## Help

One explainer, on the hero, only for the student with nothing assigned: a `<details>` saying how the adaptive drill picks questions. It quotes no set size, because adaptive mode draws from the whole bank and serves one question at a time (`Drill.tsx`, `mode === 'adaptive'`); there is no fixed count to quote and inventing one would be worse than omitting it.

`MainhubHelpControl` exists in the codebase and is rendered nowhere. Help reaches Joshua through **Messages** in the classroom rail. Do not add a floating help button to the hub to fix this; either mount the control deliberately or leave the rail to carry it.

## Keys

Escape leaves an open stage and does nothing on the plain hub. It stands down while anything modal is open (the search panel, a Radix popover or select) and while the student is inside a field they have typed into, because Escape is the browser's own revert there. Cancel stays the visible way out; the key is the accelerator.

The search opens on Cmd/Ctrl+K and on `/`. `/` only opens, never toggles: `/` with the panel open is a character someone is trying to type. Neither is advertised on the trigger, which carries `aria-keyshortcuts` and a `title` instead. Joshua removed the visible badge on 2026-09-08.

Section is URL state, remembered per browser in `lsatu.drill.section`, and a stated `?section=` always outranks the memory. Opening a stage pushes a history entry, so Back returns to the hub in the section the student came from.

## Doors

One door to the builder: the hero console. The practice card does not repeat it. An insight may offer a contextual action (open analytics, open the journal, drill a weak type) because it is a response to real data, not a menu item.

While a stage (builder, analytics) is open, the hero is not rendered. The stage carries its own title and Cancel.

## Copy

No em-dashes anywhere a student can read, including placeholders. Buttons say what they do ("Start", "Resume drill", "Set up an LR drill"). The date reads the same as Classroom Home: `Tuesday · September 8 · 2026`.

A button carries the outcome, never the feature name and never the screen name. "Smart Drill" is the product's word for the adaptive set and it stays in the sentence that explains it, not on the control: the button says "Practice your weakest types". Same rule retired "Open analytics" for "See where you lose points" and "Open journal" for "Review your missed questions". The second option is offered with "Or", never "instead", which tells a student she declined the assigned work simply by reading past it. Full list and reasons in `wiki/COPY-CORRECTIONS.md` under 2026-09-09.

## Known debt (not fixed on 2026-09-08)

- Observatory rules are scoped under `.drill-observatory-root` and win by specificity, not `!important`. Run `node scripts/observatory-specificity.mjs` after adding a rule to the block; `--check` fails if anything is unscoped. The four `!important` that remain are in the `prefers-reduced-motion` block, where the override has to beat a later animation rule and specificity cannot promise that. Rules for portalled content (`.drill-observatory-launcher-panel`) live outside the `/* end observatory */` marker on purpose: they render outside the root and must not be scoped to it.
- `.drill-observatory-practice-tile` and `PracticeTile` are still exported for the RC flip and are no longer used on the LR default stage.

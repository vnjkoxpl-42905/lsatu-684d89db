# Activities Context (glossary)

> A shared dictionary so design and product words mean the same thing across
> chats, agents, and people. This file is a glossary, not a spec. Visual rules
> live in `ACTIVITIES-DESIGN.md`; behavior lives in the code.
>
> Scope: the Activities Centre (standalone skill drills like Negation Station),
> a distinct surface from the dark app shell and the warm bootcamp workbook.

## Design vocabulary (plain language)

Each entry: the term, then what it actually means.

- **Full-bleed**: stretches all the way to the screen edges, no margin. A full-bleed banner touches the left and right walls of the screen.
- **Hero**: the big top area of a page that establishes identity. On an activity, the emerald banner with the title.
- **Banner** (also called bar or band, same thing): the horizontal strip of color across the top of the page that holds the title. We only say "banner".
- **Reversed-out text**: light-colored text on a dark or colored background (white title on emerald), the reverse of the usual dark-on-light.
- **Motif**: a small decorative element used for flavor. A geometric motif is simple shapes (circle, lines, arrows, grid) placed faintly behind a title. Optional decoration, not content.
- **Two-tone**: using two shades of the same color (a deep emerald and a lighter emerald) to add depth.
- **Eyebrow**: the small label above a title (on Negation Station, "30 ITEMS").
- **Accent**: the one signature color of an activity (Negation Station is emerald). Used on the banner, the button, and key marks.
- **Color-themed / tinted**: the whole page carries a faint wash of the accent instead of being plain white, so the canvas itself looks softly colored.
- **Stagger**: elements animating in one after another with a small delay between each, a cascade.
- **Ease-out**: motion that starts fast and gently slows to a stop. Feels natural, no bounce.
- **Card**: a rounded rectangle container holding related content, lifted off the background.
- **Chip**: a small rounded pill-shaped label (used for the credited answers).
- **Skeleton (design)**: the fixed structure shared by every activity (layout, type, spacing, motion). Only the accent color changes per activity.
- **Token**: a named design value (a color, a spacing size, a radius) reused everywhere instead of a hard-coded number.
- **Radius**: how rounded a corner is. Bigger radius means softer corners.

## Domain vocabulary (activities)

- **Activity**: a standalone skill drill (e.g. Negation Station). Independent of the bootcamps and of other activities; it never shares state with them.
- **Activity homepage / intro**: the screen a student sees before starting, with the title, how-it-works, a worked example, and Start. The first thing built to the new design system.
- **Item**: one prompt the student responds to. Negation Station has 30.
- **Worked example**: the single demonstrated item on the homepage that shows the skill in action (the "before to after" negation).
- **Credited answers**: the author-supplied acceptable responses for an item. For negation, there is usually a range of valid answers, not one.
- **Verdict**: the per-item outcome in the running drill (correct / partial / incorrect). Out of scope for the homepage.

## Related docs
- `ACTIVITIES-DESIGN.md`: the visual + structural design system for activities.
- `PRODUCT.md`: app-wide strategy, users, voice, anti-references (governs activities too).
- `DESIGN.md`: the bootcamp-quiz workbook system (a different surface; activities do NOT inherit it).

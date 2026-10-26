# Activities Context (glossary)

> A shared dictionary so design and product words mean the same thing across
> chats, agents, and people. This file is a glossary, not a spec. Visual rules
> live in `ACTIVITIES-DESIGN.md`; behavior lives in the code.
>
> Scope: the Activities Centre (standalone skill drills like Negation Station).
> Activities share the warm bootcamp workbook palette and type; each keeps one
> accent hue of its own (Negation Station = emerald).

## Design vocabulary (plain language)

Each entry: the term, then what it actually means.

- **Warm paper / workbook canvas**: the warm cream background shared with the bootcamp quizzes, never plain white and never cool gray. The activity sits on it like the rest of the product.
- **Reading column**: a single centered column of content with a comfortable max width, the calm layout the homepage uses (no full-bleed colored zones).
- **Eyebrow**: the small label above a title (on Negation Station, "30 ITEMS" in emerald).
- **Accent**: the one signature color of an activity (Negation Station is emerald). Used sparingly on the eyebrow, numerals, chips, and the Start button, never as a full background wash.
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
- `DESIGN.md`: the bootcamp-quiz workbook system. Activities inherit its warm paper palette, Inter + Georgia type, depth, and motion; they differ only by a per-activity accent hue.

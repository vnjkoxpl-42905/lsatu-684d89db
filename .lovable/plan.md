The reference uses a different palette than what's currently rendering. The current intro uses emerald green accents (breadcrumb arrows, numbered step chips, counter rule, list arrows) on a warm beige paper. The reference uses a near-white cream canvas, a single warm orange accent (#e85a2c-ish), pure black "Before" orb, and a silver/grey "After" orb.

## Color changes (scoped to `.act-home` in `src/features/activity-centre/activities-home.css`)

- `--act-canvas`: lift to a paler near-white cream (`hsl(40 30% 96%)`) so the page reads bright like the reference, not beige.
- `--act-canvas-2`: matching subtle highlight.
- `--act-accent`: replace emerald (`160 84% 32%`) with warm orange (`14 80% 54%`).
- `--act-accent-strong`: matching deeper orange (`14 84% 46%`) for the Start button + breadcrumb arrows + counter rule + list bullets.
- `--act-on-accent`: keep warm off-white.
- Numbered step chips (`.act-step-num`): keep the soft tinted pill, but it'll auto-recolor to a soft orange tint via the accent var.
- Orb tweaks: deepen the `.act-orb--before` to pure black (`#000`) with a faint inner highlight; soften `.act-orb--after` to a cleaner silver gradient.

## What stays the same

- Layout, typography, spacing, the editorial structure I built last turn.
- The drill/completion screens (they live outside `.act-home` and are not affected).
- The rest of Negation Station's brand emerald elsewhere in the app — only the intro homepage palette changes.

## Files touched

- `src/features/activity-centre/activities-home.css` — token values + orb gradients only.

No component edits, no logic changes.
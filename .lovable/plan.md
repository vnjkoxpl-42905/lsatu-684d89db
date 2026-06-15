The "After" orb's silver effect doesn't match the reference. Mine is a flat radial silver; the reference is a chrome sweep — a bright diagonal white highlight band running from upper-left to lower-right, with darker steel-grey at the top-right and bottom-left edges, plus a subtle rim shadow.

## Changes (CSS only, `src/features/activity-centre/activities-home.css`)

**`.act-orb--after`** — replace the radial gradient with a layered chrome effect:
1. Base: `conic-gradient` rotated so the brightest band sits on a diagonal — sequence roughly `#9c968a → #d8d4cc → #ffffff → #f0ece4 → #8d8678 → #2b2925 → #9c968a` to produce the bright sweep + dark cheek.
2. Overlay: a soft `linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.55) 48%, transparent 66%)` to intensify the diagonal highlight.
3. Inset shadow: `inset 0 -8px 24px rgba(0,0,0,0.18), inset 0 8px 18px rgba(255,255,255,0.4)` for the rim/sheen.
4. Drop shadow: keep the existing soft cast shadow.

**`.act-orb--before`** — keep pure `#000`, just add `inset 0 -10px 30px rgba(255,255,255,0.04)` for a barely-there rim like the reference.

**Text colors inside the After orb** — bump label to `hsl(var(--act-ink) / 0.55)` and body to `hsl(var(--act-ink))` so they read against the brightest part of the chrome.

## Out of scope

- No layout/component edits.
- Accent orange, canvas, typography, and Before orb stay as-is.

## Files touched

- `src/features/activity-centre/activities-home.css` only.
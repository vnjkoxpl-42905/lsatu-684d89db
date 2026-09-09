# Surface brief: the classroom (`.classroom-root`)

**Scope.** Everything behind the `.classroom-root` wrapper: the rail, the section list,
the stage, and the routes under `/classroom`, `/flagged` and `/journal` that render
inside that shell. Not the bootcamps or the Activity Centre worlds, which have their own
wrappers.

**Register.** Product. Design serves the work; the student is here to read what their
coach wrote and to find the next thing to do.

**Status.** Sanctioned world, added to DESIGN.md's scoped-world list on 2026-09-08 by
Joshua's decision. The audit found the classroom running on its own typeface and a warm
palette while the app-wide record described the Workroom as neutral and Lexend-only. The
decision was that the code was right and the record was stale. This file is the record
catching up.

## What makes it its own world

**A warm paper ground, not the Workroom's neutral.** `--classroom-page` is `#ffffff`
with `--classroom-line` at `#f3e3d6` and `--classroom-hover` a warm translucent cream.
The rail reads as a study rather than an admin panel, and both independent design
assessments in the 2026-09-08 audit named that warmth as a genuine asset rather than
drift.

**Outfit, not Lexend.** `classroom.css` sets `font-family: "Outfit"` on the wrapper. The
app-wide Workroom face is Lexend, and Lexend renders nowhere inside the classroom. That
is deliberate as of this brief. Outfit is also the question lock, so LSAT text and the
room it sits in share a face, and a passage does not change shape when the student moves
between reading a note and reading a stimulus.

**IBM Plex Mono for instrument labels.** The rail group labels, the chevrons, the brand
lockup and the unread badge. Swapped from Roboto Mono on 2026-09-08: Roboto Mono was
undeclared anywhere in the design record, and IBM Plex Mono is the mono this project
already documents and already loads.

## Tokens this world owns

| Token | Light | Dark | Use |
|---|---|---|---|
| `--classroom-page` | `#ffffff` | `#0f0e17` | the ground |
| `--classroom-surface` | `#ffffff` | `#0a0913` | panel and card ground |
| `--classroom-ink` | `#43403c` | `#fffffe` | primary text |
| `--classroom-ink-body` | `#43403c` | `#e5e5e5` | body copy |
| `--classroom-meta-text` | `#6d6a67` | `#a7a9be` | **any text that is muted** |
| `--classroom-meta-soft` | `rgba(67,64,60,.4)` | `#a7a9be` | **fills and borders only, never text** |
| `--classroom-line` | `#f3e3d6` | `#17161c` | hairline separation |
| `--classroom-line-strong` | `#9c8f85` | `#646176` | a border that is itself the affordance (WCAG 1.4.11) |
| `--classroom-accent` | `#a25704` | `#ff8906` | a fill that carries text: primary button, unread badge, unread dot |
| `--classroom-accent-ink` | `#ffffff` | `#0f0e17` | the label on that fill |
| `--classroom-link` | `#ff8906` | `#ff8906` | **decorative fills only** |
| `--classroom-link-text` | `#a25704` | `#ff8906` | orange that carries words |

## Named rules

**The text/fill split is the load-bearing rule here.** `--classroom-meta` and
`--classroom-meta-soft` are tuned as fills and measure 1.85:1 and 2.10:1 as text on the
page. Every muted *word* resolves from `--classroom-meta-text`. The same split governs
`--classroom-link` and `--classroom-link-text`. Getting this wrong put every date, every
rail group label and the unread badge below the AA floor for months.

**Opacity multiplies against the colour.** Swapping a token is not enough if an
`opacity` sits on the same rule. `.classroom-nav-group > b` was `#6d6a67` at `0.7` and
still measured 2.92:1. Muted text carries its colour in the token, not in an alpha.

**A themed pair, not a shared colour, for anything on an accent fill.** The amber that
works on the light ground is `#a25704`; on the dark ground it is `#ff8906` with near-black
on top. Reusing one value across both themes trades a light failure for a dark one.

**Never show a control that opens a copy of what is on screen.** Below 1280px the stage
renders its own `StageIndexList`; the "Open the list" trigger is suppressed by
`.classroom-column:has(.classroom-stage-index)`. The trigger belongs to detail routes,
where nothing else reaches the list.

**Overlays are dialogs.** The section drawer and the mobile menu go through
`useDialogOverlay`: `role="dialog"`, `aria-modal`, an accessible name, focus moved in on
open, a focus trap that wraps both ways, Escape, and focus restored to the trigger. Focus
is moved on a timer rather than `requestAnimationFrame`, because rAF does not fire while
the document is not being rendered.

**Index routes carry no dateline.** It printed `new Date()`, so it stamped the page with
the day of the visit while occupying the slot that, on a note, holds the day Joshua wrote
it. Every number on a surface traces to stored data or it does not appear.

## Anti-references

Not a dashboard. Not an LMS. No progress rings, no streak badges, no card grid of
modules, no metric tiles. The classroom is a room with a desk in it, and the thing on the
desk is what the coach wrote.

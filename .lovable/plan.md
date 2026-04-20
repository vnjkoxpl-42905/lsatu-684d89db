

Bump the orbital track ring opacity so it reads clearly against the dark foyer background while keeping the razor-thin Apple aesthetic.

### Change — `src/components/ui/radial-orbital-timeline.tsx` (the 4 ring layers around lines 148-152)

Raise opacities (cool gray, still 1px, no warm tint):

- Outer atmospheric halo: `border-border/10` → **`border-border/30`**, shadow `rgba(255,255,255,0.03)` → **`rgba(255,255,255,0.08)`**
- Primary track ring: `border-border/25` → **`border-border/60`** (the hero line — clearly visible)
- Inner depth ring: `border-border/15` → **`border-border/35`**
- Dashed detail ring: `border-dashed border-border/10` → **`border-dashed border-border/25`**

Center sphere gradient stays cool but slightly stronger: `from-border/30 via-border/15` → **`from-border/50 via-border/25`**, border `border-border/20` → **`border-border/40`**.

Keep all widths (420 / 400 / 400 / 384), keep `backdrop-blur-sm`, keep neutral grays, keep auto-rotate and node behavior untouched.

### Verification

- `/foyer` orbit ring is clearly visible against dark bg (primary track reads as a confident hairline, not a guess)
- Still 1px / razor thin
- Still cool neutral gray (no bronze)
- Nodes, expand, dock, sidebar unchanged


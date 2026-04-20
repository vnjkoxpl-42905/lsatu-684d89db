
In light mode the `border` token is very light gray, so the rings barely show. Override with darker neutral foreground tones in light mode only, keeping current dark-mode look.

### Change — `src/components/ui/radial-orbital-timeline.tsx` ring layers (lines 149-153) and center sphere (lines 143-146)

Use `foreground/X` (which is near-black in light mode, near-white in dark mode) instead of `border/X` so the rings are clearly darker on light backgrounds:

- Outer halo: `border-border/30` → `border-foreground/15`
- Primary track: `border-border/60` → `border-foreground/40` (the hero hairline — clearly dark in light mode)
- Dashed ring: `border-border/25` → `border-foreground/20`
- Inner depth: `border-border/35` → `border-foreground/20`
- Center sphere border: `border-border/40` → `border-foreground/30`, gradient `from-border/50 via-border/25` → `from-foreground/20 via-foreground/10`

Keep widths, blur, rotation, and dark-mode look (foreground inverts in dark mode so it stays visible there too).



## Refine orbital ring to Apple-like sleek aesthetic

Current orbit ring is two simple `border-border` circles. Refine to Apple-style thin, layered, cool-gray sophistication.

### Changes to `src/components/ui/radial-orbital-timeline.tsx` (lines 148-150)

Replace current orbit rings with 4-layer depth system:

1. **Outer atmospheric glow** — `w-[420px] h-[420px] rounded-full border border-border/10 shadow-[0_0_60px_rgba(255,255,255,0.03)]` — barely-there ambient halo
2. **Primary track ring** — `w-[400px] h-[400px] rounded-full border border-border/25` — the main orbital path, razor thin, subtle gray
3. **Inner depth ring** — `w-[384px] h-[384px] rounded-full border border-border/15` — nested for dimensional depth
4. **Dashed detail ring** — `w-[400px] h-[400px] rounded-full border border-dashed border-border/10` — delicate motion indicator, even fainter

Color scheme shifts from warm bronze toward cool neutral grays (border token is neutral gray in the design system). Keep 1px stroke width (razor thin). Add subtle `backdrop-blur-sm` on the outer ring for that frosted glass depth Apple uses.

Center sphere (lines 142-146) — refine to cooler glass aesthetic: gradient from `from-border/30 via-border/15 to-transparent`, border `border-border/20`, softer pulse glow.

### Verification

- `/foyer` orbit ring appears as thin, ethereal gray tracks with subtle depth layers
- Cool gray color scheme (not bronze/warm)
- 1px strokes throughout — razor thin
- Auto-rotate animation continues smoothly
- All 3 nodes (Smart Drill, Resume, Ask Joshua) still orbit and expand correctly


## Fix: Make orbital ring visible on light background

The component currently uses `border-white/10` for the orbit ring and white text/borders for nodes — invisible on the Foyer's light background (screenshot 1). Goal: match screenshot 2's structure (visible thin ring + labeled nodes) but in **black on transparent** instead of white on black.

### Changes in `src/components/ui/radial-orbital-timeline.tsx`

1. **Orbit ring** (line 150): `border-white/10` → `border-black/15` so the ring is visible on the light Foyer background.
2. **Node circles** (line 183-189): swap white-on-black for black-on-transparent
   - default: `bg-white/80 text-black border-black/30`
   - related: `bg-black/10 text-black border-black/60`
   - expanded: `bg-black text-white border-black scale-150`
3. **Node labels** (line 195-197): `text-white/70` → `text-black/70`, expanded `text-black`.
4. **Pulse ring** (line 179): `border-white/30` → `border-black/30`.
5. **Center orb rings** (line 144-145): `border-white/20` and `border-white/10` → `border-black/20` / `border-black/10`. Keep the colored gradient orb (matches screenshot 2's blue center).
6. **Expanded popover** (line 208-266): keep dark scheme since it overlays content — change to `bg-white/95 text-black border-black/20` so the popover is readable on a light background. Update `getStatusStyles` to black-on-white variants.

No prop/API changes. No changes to `AcademyFoyer` or other consumers.

### Why this matches screenshot 2

Screenshot 2 shows a faint ring + outlined nodes + labels under each. The structure is already correct — only the color tokens need flipping from white to black so they show against the existing light Foyer surface (the user explicitly said "ignore the black background, just black ring").
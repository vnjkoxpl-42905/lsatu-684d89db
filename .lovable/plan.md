

## Plan: Orbital Lens Preview System

### Summary
Replace the detached top-center HUD with a centered "Orbital Lens" that lives inside the orbital ring. Expand the orbit for breathing room, use `AnimatePresence mode="wait"` for smooth content morphing, and redesign the content hierarchy with a borderless transparent aesthetic.

### Changes

**File: `src/components/foyer/OrbitalHub.tsx`**

**1. Expand the orbit**
- Increase `RADIUS` from 152 to 190
- Increase outer decorative ring from 176 to 220
- Adjust inner ring from 44 to ~70 (gives room for the lens content)
- Keep `CX`/`CY` at 200 (center of the 400x400 viewBox)

**2. Add metadata map**
```
const HUD_META: Record<string, string> = {
  practice: "PT 1–90 Available",
  bootcamps: "15 Modules",
  classroom: "12 Sessions",
  analytics: "Live Tracking",
  schedule: "Daily Planner",
};
```

**3. Replace the fixed top-center HUD with a centered Orbital Lens**
- Remove the `fixed top-8 left-1/2` card entirely
- Add a new `absolute` div centered in the orbital container (`absolute inset-0 flex items-center justify-center pointer-events-none z-20`)
- Inside, render `<AnimatePresence mode="wait">` with a keyed `motion.div`
- Styling: `bg-transparent`, no border, no shadow — just crisp text centered in the hub
- Max width ~200px so it fits comfortably inside the ring

**4. Content hierarchy (top to bottom, all centered)**
- Node name: `text-sm tracking-[0.2em] uppercase text-zinc-400 mb-1`
- Purpose: `text-xl font-medium text-zinc-100 mb-4` (use exact copy from `HUD_CONTENT`)
- Metadata: `text-xs text-zinc-500 font-mono mb-3` (from `HUD_META`)
- Access pill (de-emphasized):
  - Locked: `bg-zinc-900 text-zinc-500 px-2 py-1 rounded-full text-[10px] uppercase tracking-wider` + tiny Lock icon
  - Unlocked: `text-emerald-500/70 px-2 py-1 text-[10px] uppercase tracking-wider` no background

**5. Smooth morphing transitions**
- `AnimatePresence mode="wait"` ensures outgoing content fades before incoming
- `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`
- Duration ~0.2s for snappy feel

**File: `src/pages/AcademyFoyer.tsx`**

**6. Expand the hub container**
- Increase from `min(440px, 80vw, 80vh)` to `min(560px, 85vw, 85vh)` to accommodate the larger orbit

### Files Modified
| File | Change |
|------|--------|
| `src/components/foyer/OrbitalHub.tsx` | Expand radius, replace HUD with centered Orbital Lens, add metadata, morphing transitions |
| `src/pages/AcademyFoyer.tsx` | Increase hub container size |


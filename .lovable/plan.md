

The user wants the Foyer ring + dock to visually match the older reference screenshot they shared (image-52/53 and now this attached one). Key cues from their message:

- "visually identical to the style in the previous version" — older ring style
- "color scheme" identical to old
- "dock bar should be updated with the current nodes" — wait, dock has icons not nodes; they likely mean keep current icons but match older dock style
- "function identically to the previous ring with different nodes" — keep current 3 nodes (SMART DRILL, ASK, RESUME), routing unchanged
- "visually identically the same adjusting for sizing and spacing"
- "current ring is not visually good"
- "the dock bar was hover like before I want it to be like that" — older dock had hover-reveal behavior (icons/labels appear on hover)

I need to look at git history or the older version. Let me check chat history for what the older version looked like — based on the reference screenshots in prior turns (image-52/53 showed PRACTICE/CLASSROOM/BOOTCAMPS/ANALYTICS/SCHEDULE 5-node ring with subtle hairlines, small dots, label outside ring, dock as floating pill with hover reveal).

Plan: restore the older visual treatment on both components while keeping current 3 nodes and current dock icon set + handlers.

## Plan — Restore older Foyer visual treatment

### FoyerHeroRing.tsx (visual rewrite, same nodes & handlers)

Match older reference exactly:
- SVG container `max-w-[560px] aspect-square mx-auto`
- Outer ring: 1px hairline, `stroke-border` at opacity 0.25 (ghost line)
- Inner echo ring at ~32% radius, opacity 0.18
- Dot anchors: `r=3.5`, solid `fill-foreground`, no glow by default
- Labels: 10px uppercase, `tracking-[0.28em]`, `font-medium`, `fill-foreground/70`, positioned ~46px outside ring path along the radial direction (recalc offsets per node so all three sit at same perpendicular distance)
- Active state (hover/focus):
  - Dot grows to `r=5` and gets soft primary halo `r=22, fillOpacity=0.18, blur(6px)`
  - Label brightens to `fill-foreground` opacity 1
  - 1px primary underline beneath label, label-width, 5px below baseline, fade in 200ms
- Keep 3 nodes at 12 / 4 / 8 o'clock — SMART DRILL, ASK, RESUME — same handlers (navigate /drill, toast, navigate /drill)
- Empty center, no card/text

Color tokens only: `stroke-border`, `fill-foreground`, `fill-primary`, `stroke-primary`. No hardcoded hex.

### FoyerDock.tsx (restore hover-reveal pill)

Older behavior was a minimal pill where icons sit muted and only "light up" on hover/focus. Restore that:
- Pill: `rounded-full border border-border/60 bg-background/80 backdrop-blur-md shadow-lg shadow-black/30 px-2 py-2 gap-1`
- Each button: `h-11 w-11 rounded-full` with **transparent** default background, icon color `text-foreground/55`
- On hover/focus: background fades to `bg-foreground` and icon flips to `text-background` over 200ms (this is the "hover like before" behavior — buttons are flat/ghost until hovered, then become the filled dark circle)
- Inbox unread badge unchanged (red dot top-right with count)
- Same 3 buttons + handlers: Inbox → /inbox, Bell → toast, LifeBuoy → toast
- Keep `aria-label`s and focus rings

### AcademyFoyer.tsx (one-line spacing)

- Ring↔dock vertical gap: `gap-8` → `gap-12`

### Verification

- `/foyer` at 1561px viewport: ring contained ≤560px, ghost stroke, tiny dots, labels breathing room, dock floats below with clear gap
- Hover any ring node → dot halo + label brightens + underline fades in
- Hover any dock icon → button fills dark, icon flips light (hover-reveal restored)
- All 6 click targets route/toast as before
- `npm run build` clean

### Files

- `src/components/foyer/FoyerHeroRing.tsx` (visual rewrite)
- `src/components/foyer/FoyerDock.tsx` (hover-reveal restoration)
- `src/pages/AcademyFoyer.tsx` (gap-8 → gap-12)

### Out of scope

- Sidebar untouched
- Routing/handlers/node count/icon set untouched
- No new dependencies, no token changes in `index.css` or `tailwind.config.ts`


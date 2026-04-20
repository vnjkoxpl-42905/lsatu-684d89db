

## Plan — Replace Foyer ring with RadialOrbitalTimeline component

The user wants to swap the current `FoyerHeroRing` for the snippet's `RadialOrbitalTimeline` — an animated, auto-rotating orbital with expandable nodes, energy bars, related-node connections, and pulsing effects. This replaces the static 3-dot SVG ring with a richer interactive surface.

### Files to add

1. **`src/components/ui/radial-orbital-timeline.tsx`** — paste the component, fixed for our codebase:
   - Repair broken JSX (the snippet has stripped/empty divs from copy-paste — reconstruct the standard published version with proper container, central orbital sphere, dashed orbit ring, node buttons with icon + label, expanded card with status badge, date, content, energy bar, and related-node chips).
   - Strip generics that lost type params (`useState>` → `useState<Record<number, boolean>>`, `useRef>` → `useRef<Record<number, HTMLDivElement | null>>`, etc).
   - Use design tokens (`bg-background`, `text-foreground`, `border-border`, `bg-primary`) instead of hardcoded white/black so it works in our dark-first palette with bronze accents.
   - Keep auto-rotate, click-to-expand, related-node pulse, status styling.

2. **`src/components/ui/badge.tsx`** — already exists, no change.

3. **`src/components/ui/card.tsx`** — already exists, no change.

4. **`src/components/ui/button.tsx`** — already exists, no change.

5. **CSS animations** — `pulse` and `ping` are already in Tailwind defaults (`animate-pulse`, `animate-ping`), no `index.css` additions needed.

### Files to modify

6. **`src/pages/AcademyFoyer.tsx`** — swap `<FoyerHeroRing />` for `<RadialOrbitalTimeline timelineData={foyerNodes} />`. Define `foyerNodes` array inline with our 3 real nodes wired to existing handlers:
   - **Smart Drill** (Zap icon, status `in-progress`, energy 80) → `navigate('/drill')`
   - **Resume** (Play icon, status `pending`, energy 60) → `navigate('/drill')`
   - **Ask Joshua** (MessageCircle icon, status `completed`, energy 100) → toast "Ask Joshua coming soon"
   - Wire navigation by intercepting node click via a wrapper or by extending `TimelineItem` with an optional `onClick` (cleanest: add `onActivate?: (id: number) => void` prop on the timeline component, fire it on `toggleItem` when the node opens).
   - Keep `gap-12` spacing and `<FoyerDock />` underneath untouched.

7. **`FoyerHeroRing.tsx`** — leave file in place (do not delete) but no longer imported. Safer for rollback.

### Out of scope (per instructions)

- `FoyerSidebar.tsx` — untouched.
- `FoyerDock.tsx` — untouched (filled circular icon buttons stay as-is).
- Routing, handlers, node count (3), node labels — preserved.
- No new npm installs needed (`lucide-react`, `class-variance-authority`, `@radix-ui/react-slot` already installed).

### Verification

- `/foyer` shows orbital ring with 3 auto-rotating nodes (Smart Drill, Resume, Ask Joshua), bronze-accented in dark mode.
- Clicking a node expands its card with energy bar + related nodes; clicking outside collapses.
- An "activate" action (e.g. clicking the expanded card's primary CTA, or double-click on node) triggers the existing handler (`/drill` or toast).
- Sidebar and dock unchanged.
- `npm run build` clean.


## Add RadialOrbitalTimeline component

Create a new reusable orbital timeline UI component (clean, fixed version of the snippet you pasted — the original had broken JSX/TS syntax) and wire it up so you can use it anywhere.

### Files to create

1. **`src/components/ui/radial-orbital-timeline.tsx`**
   - Properly typed `TimelineItem` interface (id, title, date, content, category, icon, relatedIds, status, energy)
   - State: `expandedItems`, `rotationAngle`, `autoRotate`, `pulseEffect`, `activeNodeId`, refs for container/orbit/nodes
   - Auto-rotate orbit (0.3°/50ms) that pauses when a node is expanded
   - Click node → expand card with status badge, date, content, energy bar, related-node chips
   - Click empty space → collapse all
   - Full-screen black background (`bg-black`), white orbit rings, white node icons — **no card-style colors, pure black/white per your request**
   - Expanded card: `bg-black/90` with `border-white/30`, white text, subtle backdrop blur

2. **`src/components/ui/radial-orbital-timeline-demo.tsx`**
   - Demo with 5 nodes (Planning, Design, Development, Testing, Release) matching your screenshot
   - Exported so you can drop it into any page

### Dependencies
All already installed in this project — no `npm install` needed:
- `lucide-react` ✓
- `class-variance-authority` ✓
- `@radix-ui/react-slot` ✓
- `@/components/ui/badge`, `button`, `card` ✓

### CSS
Skip the globals.css block from the snippet — Tailwind v3 in this project already provides `animate-pulse`, `animate-ping`, `backdrop-blur-lg`, opacity utilities, etc. Adding it would duplicate/conflict with existing tokens.

### Where it gets used
This plan **only creates the component + demo**. I will not auto-mount it on `/foyer` (that route already uses `FoyerHeroRing` per project rules). Tell me where you want it shown after the component lands — e.g. a new `/timeline` route, inside a bootcamp page, or replacing another widget — and I'll wire it up in a follow-up.

### Technical notes
- Fixes from the original snippet: typed `useState<Record<number, boolean>>`, typed refs (`HTMLDivElement`), restored all JSX (the paste lost most of the markup), removed unused imports (`ArrowRight`, `Link`, `Zap`, `CardHeader`, `CardTitle`)
- Black-only palette: replaces the original status color logic so all three states (`completed`, `in-progress`, `pending`) render on black with white borders/text at varying opacity instead of inverted white cards

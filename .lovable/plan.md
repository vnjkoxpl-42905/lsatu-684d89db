## Goal

Make sure the foyer orbital nodes are mathematically and visually locked to one circular path. Nothing should ever appear to drift, float inside, or break through the ring — at any viewport, any rotation angle.

## Root cause

In `src/components/ui/radial-orbital-timeline.tsx`:

- The component currently draws **four concentric rings** at radii 192, 200, 200 (dashed/spinning), and 210.
- Node centers ride on radius 200 (correct), but each node bubble is 48px wide (~26px visual radius including border).
- Result: the inner ring at r=192 and the outer ring at r=210 cut straight through every node as it rotates. The node is locked to the orbit, but the *extra rings* make it look like it's escaping.

## Fix

Collapse to a **single clean ring** with nodes centered exactly on it. One source of truth for the orbit radius — used for both the ring and the node positions — so they can never get out of sync.

### Changes in `src/components/ui/radial-orbital-timeline.tsx`

1. Define a single constant `ORBIT_RADIUS = 200` at the top of the component (or module).
2. Replace the four ring `<div>`s with **one** ring sized from that constant: `width/height = ORBIT_RADIUS * 2`. Keep the subtle border + soft shadow for the premium look. Remove the dashed spinning ring and the inner/outer echoes.
3. Use the same `ORBIT_RADIUS` inside `calculateNodePosition` instead of the hardcoded `200`. This guarantees ring and nodes always share the exact same path.
4. Keep the center sphere as-is (it's well inside the ring and doesn't intersect anything).
5. Leave node size, opacity-by-angle depth, and z-index logic untouched — those are correct.

### Verification

- Visually confirm at /foyer that every node's center sits exactly on the ring, and the ring passes cleanly through the middle of each bubble at every rotation angle.
- Resize viewport (mobile + desktop) to confirm alignment holds — since both the ring and node positions derive from the same constant, they cannot diverge.

## Files touched

- `src/components/ui/radial-orbital-timeline.tsx` (only)

No other components, routes, or data flows are affected.

## Problem

When a node is clicked, two things break the visual:

1. `centerViewOnNode` re-rotates the ring so the clicked node jumps to a new angle — the other nodes appear to "drift off" the path.
2. The expanded node gets `scale-150` and the popover card is anchored to the node — so the node visually leaves the ring line and the card overlaps the orbit.

Result: nodes look like they fall off the circle (see screenshot 2 — Resume sitting inside the ring).

## Fix (in `src/components/ui/radial-orbital-timeline.tsx`)

1. **Stop re-centering on click.** Remove the `centerViewOnNode(id)` call in `toggleItem`. Auto-rotate still pauses on expand, but the ring keeps its current angle so every node stays exactly where it was on the path.
2. **Keep node geometry identical when expanded.**
   - Drop `scale-150` from the expanded node class. Use a subtle visual change instead (filled bg + ring-2 ring-black/40), so the node footprint never changes and its center stays glued to the orbit path.
   - Make sure `radius` (200) continues to exactly match the ring's `w-[400px] h-[400px]` (already aligned).
3. **Render the expanded card off the ring, not attached to the node.** Move the `renderExpandedContent` block out of the per-node `<div>` and render it once, absolutely positioned at the bottom of the orbit container (e.g. `absolute left-1/2 -translate-x-1/2 bottom-4 w-[300px]`). This way:
   - The node itself has no child popover pushing it visually off-axis.
   - The card always appears in the same readable spot, never clipped, never overlapping the center orb.
4. **Optional connector:** thin 1px line from active node toward the card anchor, computed from `position.x/y`, so the relationship is still clear without moving the node.

## Out of scope

- No changes to `FoyerFindCard` or routing.
- No changes to ring size, center orb, or rotation speed.

## Outcome

Nodes are permanently fixed on the ring path. Clicking only swaps which node is "active" and reveals a fixed card below the orbit — the ring composition never shifts.

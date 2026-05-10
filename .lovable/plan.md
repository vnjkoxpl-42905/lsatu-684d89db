## Compact, usable Find-a-Question card

### Problem

The Find popover stretches too tall — FINDER badge, "Find a Question" title, "Jump to a specific question" subtitle, then 3 stacked label+select blocks plus a button. On the orbital ring it overflows the orbit and overlaps the center orb. The header is redundant: the user already clicked the **Find** node.

### Plan

**1. Strip the header in `src/components/foyer/FoyerFindCard.tsx`**
- Remove `CardHeader`, `Badge` (FINDER), `CardTitle` ("Find a Question"), and the subtitle ("Jump to a specific question").
- Drop the per-field uppercase labels — the placeholders ("Test", "Section", "Question") already convey it.
- Keep just three compact selects in a row of stacked rows, plus the Open button.

**2. Tighten layout**
- Wrap content in a single padded `div` (no Card subcomponents), `space-y-2` between selects.
- Selects: `h-9 text-sm`, placeholders changed to plain `Test`, `Section`, `Question`.
- Open button: full width, `size="sm"`, primary, sticky-feeling at the bottom (no separator needed).

**3. Constrain the popover wrapper in `src/components/ui/radial-orbital-timeline.tsx`**
- The `renderExpandedContent` slot currently uses `top-24 left-1/2 -translate-x-1/2` with no width/height limits — wrap the rendered content in a fixed-size shell: `w-[280px] max-h-[360px] overflow-visible rounded-xl border border-black/15 bg-white/95 backdrop-blur shadow-xl p-3`.
- Result: the card is short (~260px tall), uniform width, and never overruns the ring.

### Outcome

Three labelled selects + Open button, ~260px tall, fits cleanly inside the orbit. No redundant title/subtitle. Same logic, same routing — only the chrome is cut.

### Files touched
- `src/components/foyer/FoyerFindCard.tsx` — strip header/labels, compact layout
- `src/components/ui/radial-orbital-timeline.tsx` — wrap `renderExpandedContent` in a fixed-size shell
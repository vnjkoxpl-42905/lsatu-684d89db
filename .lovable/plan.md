

## Problem Analysis

The dark bars on the left and right sides of the drill page are caused by the main content wrapper at line 1758 of `Drill.tsx`:

```
<div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full max-w-7xl mx-auto">
```

This `max-w-7xl mx-auto` caps the content at ~80rem and centers it, exposing the dark `bg-background` (near-black, `0 0% 3.9%`) behind it. The two content panels inside use `bg-white`, creating an obvious contrast gap on wider screens.

Additionally, the outer container at line 1697 has no background override — it inherits the dark theme background.

## Fix

**File: `src/pages/Drill.tsx`**

1. **Remove `max-w-7xl mx-auto`** from the content wrapper (line 1758) so the two panels stretch edge-to-edge.
2. **Add `bg-white`** to the outer `min-h-screen` wrapper (line 1697) so any remaining gaps also show white instead of dark.
3. **Ensure the `DrillTopBar`** sits on a consistent background — it currently uses `bg-background` (dark). Change it to match the drill page's white/light content theme (e.g., `bg-white text-neutral-900 border-b border-neutral-200`).

**File: `src/components/drill/DrillTopBar.tsx`**

4. Update the bar's root container background from dark theme tokens to `bg-neutral-900 text-white` or keep it as-is if the dark bar is intentional (matching the reference screenshot). The reference shows a dark top bar with white content below — so only the side gaps need fixing.

### Summary of changes
- Remove `max-w-7xl mx-auto` so panels fill the full width
- Add `bg-white` to the page-level container so no dark bleed-through occurs on sides


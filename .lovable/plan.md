

## Plan: Reposition Tools and Remove Pool Chip

### Problem
Looking at the reference image vs current layout:
1. The highlight tools (underline, color dots, eraser) and flag are clustered left-center — they should sit further right, closer to the right-side controls
2. The "Unseen only" chip (from `QuestionPoolChip`) is showing in the bar and shouldn't be there

### Changes

**File: `src/components/drill/DrillTopBar.tsx`**

1. **Move highlight tools + flag to the right side** — relocate the highlight tools block (underline, yellow/pink/orange dots, eraser) and the flag button from their current position (before the spacer) to after the spacer, placing them just before the Tutor toggle and AI button on the right side.

2. **Remove the QuestionPoolChip** — delete the pool chip rendering block (lines 270-276) so "Unseen only" no longer appears in the top bar.

3. **Remove unused props** — clean up `poolStatus`, `totalPoolSize`, `availablePoolSize` from the component interface since they're no longer rendered.

**File: `src/pages/Drill.tsx`**

4. **Stop passing pool props** to `DrillTopBar` — remove the `poolStatus`, `totalPoolSize`, `availablePoolSize` props from the `<DrillTopBar>` usage.

### Resulting layout (left → right)
`<< BACK` | Search input | Question ID | Undo | *(spacer)* | Underline | Dots | Eraser | Flag | Tutor toggle | AI button




## Plan: Unify Drill Top Bar to Match Reference Design

### What Changes
Merge the current two-row header (exit bar + highlight toolbar) into a single compact toolbar row matching the reference screenshots. The reference shows one horizontal bar with all controls inline: back button, search field, action icons, text tools, highlighters, timer, and menu.

### Layout (left to right, matching reference)
1. **"<< BACK"** link-style button (replaces current "Exit" with arrow icon)
2. **Search/Find field** — text input placeholder "Find Text, Type Here"
3. **Separator**
4. **Action icons row**: checkmark (submit), eye (show/hide answer), undo
5. **Text tools**: font size (A), list/align, pen/draw
6. **Separator**
7. **Underline** (U icon)
8. **Highlighter dots** (yellow, pink/light, orange)
9. **Eraser**
10. **"Elapsed Time: X:XX"** label with timer
11. **More menu** (vertical dots)
12. **Blue circle button** (tutor/AI chat trigger)

### Steps

**1. Merge two bars into one in `Drill.tsx`**
- Remove the second `border-b` toolbar div (lines ~1804-1816)
- Integrate `HighlightToolbar` contents inline into the main header bar
- Restructure the header flex layout to fit all items in one row

**2. Restyle the back button**
- Change from ghost button with ArrowLeft icon to a text link reading "<< BACK" in blue/cyan

**3. Add a "Find Text" search input**
- Add a small text input with placeholder "Find Text, Type Here" next to the back button
- Wire it to highlight/scroll-to matching text in the stimulus (find-in-page functionality)

**4. Reorganize icon groups with separators**
- Group: submit check, show/hide eye, undo
- Group: text format A, align/list, pen
- Separator
- Group: underline U, highlighter dots (yellow, pink, orange), eraser
- These map to existing highlight toolbar functionality

**5. Restyle the timer**
- Change from mono font block to inline "Elapsed Time: X:XX" label text matching reference

**6. Add more-menu (three dots)**
- Vertical dots icon button for overflow actions (flag, settings, etc.)

**7. Move tutor/AI button to far right**
- Blue filled circle button at the end of the bar (currently the tutor chat trigger)

**8. Responsive handling**
- On mobile (<768px), collapse less-critical tools into the three-dot overflow menu
- Keep back, timer, and tutor button always visible

### Files Changed
- `src/pages/Drill.tsx` — merge header sections, restructure layout
- `src/components/drill/HighlightToolbar.tsx` — may inline its contents or adapt for single-bar layout
- Potentially new: `src/components/drill/DrillTopBar.tsx` — extracted component for the unified bar


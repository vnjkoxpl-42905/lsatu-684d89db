# Fix Official Answer Navigator

The bottom answer-navigator strip in `/drill?layout=official` currently wraps every queued qid into a giant multi-row grid (200+ ovals). The real LSAT digital test shows a single horizontal row of ovals for the current section only, with prev/next arrows pinned right. It also hides entirely when only one question is on screen.

## Changes

### 1. `src/components/drill/official/OfficialAnswerNavigator.tsx`
- **Hide when single question**: if `questionQueue.length <= 1`, return `null`. The navigator is only meaningful for sets.
- **Single-row layout**: replace `flex-wrap` with a single-row horizontally scrollable list (`overflow-x-auto`, `flex-nowrap`, hidden scrollbar). The ovals must never wrap to a second row — match the screenshot exactly.
- **Tighter visuals to match the real test**:
  - Smaller ovals (`h-6 min-w-[24px]`, 11–12px tabular num text)
  - Bottom-row baseline alignment, the I-beam tick above the current oval stays
  - Plain unfilled outline for unanswered, soft fill for answered, bold border + tick for current
- Keep prev/next arrow buttons pinned to the right, outside the scroll area, sized to match.

### 2. No changes to `src/pages/Drill.tsx`
The page already passes `questionQueue` and `currentIndex`. The navigator decides on its own whether to render.

## Acceptance

- Drill with a single question: no bottom strip at all.
- Drill with a set (e.g. 25 questions): one horizontal row of 25 ovals, current bolded with tick, answered filled, prev/next arrows on the right — visually indistinguishable from the official LSAT screenshot.
- Long sets (>~30) scroll horizontally inside the strip rather than wrapping.

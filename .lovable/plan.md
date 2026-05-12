# Fix three drill UI issues

Three small, independent fixes to the adaptive drill page. Done in order.

## 1. Tutor Mode toggle auto-opens the AI tutor chat

**File:** `src/pages/Drill.tsx` (around line 2073)

Today `onTutorModeChange={setTutorMode}` only flips state — nothing opens the chat. Wrap it so flipping ON also launches the chat for the current question:

```ts
onTutorModeChange={(next) => {
  setTutorMode(next);
  if (next && currentQuestion && session?.mode === 'adaptive') {
    setTutorQuestionSnapshot(currentQuestion);
    setTutorUserAnswerSnapshot(selectedAnswer ?? null);
    setTutorChatOpen(true);
  } else if (!next) {
    setTutorChatOpen(false);
  }
}}
```

Apply the same wrapper to the matching `onTutorModeChange` on `DrillTopBar` (line 2235) so both toggles behave identically and stay in sync.

The existing wrong-answer auto-open path (line 954) is unchanged — it still fires on submit when tutor mode is on.

## 2. Stop the answer-choice layout shift when tutor chat opens

**File:** `src/pages/Drill.tsx` (lines 2330–2376)

When `tutorChatOpen` flips, the answer list switches from a `RadioGroup` (`space-y-1 -mx-5`, radio circles visible) to a plain `div` (`space-y-0`, no radios, extra blur wrappers, `my-4` on the focused row). The different outer spacing/margins/padding is what makes the row jump.

Make the focused-mode block match the resting layout exactly:

- Use the same outer wrapper classes (`space-y-1 -mx-5`) for both branches.
- For the focused row, keep `renderAnswerChoice` rendering the radio slot with `visibility: hidden` instead of `showRadio: false`, so left padding doesn't change.
- Remove `my-4` on the focused container; rely on the existing `space-y-1` rhythm.
- Keep the blur/dim treatment on non-selected rows, but apply it via class only (no extra wrapping `<div>` that adds its own vertical spacing).

Net effect: enabling tutor mode dims the other choices in place; the selected row stays at the same Y position.

## 3. Underline tool should not show a colored highlight

**File:** `src/components/drill/HighlightedText.tsx` + `src/lib/highlightUtils.ts`

`getHighlightStyles('underline')` already sets `backgroundColor: transparent`, so the visual tint must be coming from an overlapping older highlight that `replaceOverlappingHighlights` is preserving when the user underlines on top of yellow/pink/orange.

Two-part fix:

1. In `replaceOverlappingHighlights` (or wherever underline is captured), treat underline as additive — when an underline is drawn over an existing color highlight, keep both as separate spans rather than merging the new one's color into the old. Confirm the stored `color` for the new span is exactly `'underline'`.
2. In `HighlightedText.renderSegments`, ensure underline spans render on top with `background: transparent !important` and never inherit `mix-blend-mode: multiply` from sibling spans.

Also double-check `OfficialDrillToolbar` passes `'underline'` (not `'yellow'`) as the active color when the underline tool is selected.

---

## Out of scope

- No backend, edge-function, or tutor-prompt changes.
- No changes to the bottom-left tutor FAB or the top-right tutor switch added in the previous step.
- No changes to non-adaptive drill modes.

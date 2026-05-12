# Drill: Mini Notepad + Highlight Polish

Three small UI/presentation changes to the official drill runner (`/drill`). No schema or business-logic changes.

## 1. Mini Notepad (bottom-left corner)

A persistent notepad pinned to the bottom-left of the drill page.

- New floating launcher button (notebook icon) in the bottom-left corner, visible only on the official drill runner.
- Click → expands into a small panel (~320×360px) with a textarea, "Clear" link, and close (×) button.
- Auto-saves to `localStorage` so notes survive question navigation and reloads (per-session key).
- Hidden when the section is paused (matches existing pause overlay).
- Mobile: expands as a bottom sheet (max-height 60vh).
- New file: `src/components/drill/DrillNotepad.tsx`, mounted from `OfficialDrillFrame.tsx`.
- Does not collide with `FloatingTutorButton` — the tutor button is already hidden on `/drill` per `HIDDEN_ROUTES`.

## 2. Fix the bright yellow underline artifact

Currently, when the user activates **Underline** and marks text, a soft-yellow band still appears behind the underlined text (visible on the highlighted patch in the user's screenshot). Underline should be a clean black line under the text — no fill, no yellow tint.

In `src/components/drill/HighlightedText.tsx` `getHighlightStyles()`:
- For `color === 'underline'`: explicitly clear `backgroundImage` and `backgroundColor` (set to `'none'`/`'transparent'`) so no fill survives from any prior style.
- Keep only `text-decoration: underline` (black, 2px, 3px offset).
- Also lower the marker fill alpha (yellow/pink/orange) from 0.5 → ~0.32 and switch to flat `backgroundColor` (drop the inset gradient band) so highlights look like a calm marker pass and overlapping ranges don't visually double up into a brighter patch. Add `mix-blend-mode: multiply` to keep overlaps stable.

## 3. Stop underline from shifting the stimulus text

Activating underline currently nudges/expands the surrounding text because the underlined `<span>` introduces extra padding/line-height versus the unmarked text.

Fix in the same `getHighlightStyles()` base style:
- Remove the `padding: '2px 0'` from the base (which applies to underline too) — pad only the marker variants, and use `padding: 0` for underline.
- Force `lineHeight: 'inherit'` and `verticalAlign: 'baseline'` (already set) and ensure no margin/border is added on toggle.
- Use `text-underline-offset` only (no padding) so the underline sits below the glyph without changing the line box.
- Net effect: toggling underline should not reflow or visually grow the stimulus text.

## Out of scope

- No changes to highlight data, ranges, persistence, toolbar, timer, or backend.
- Notepad content is local-only (no DB sync) for v1.

## Files touched

- `src/components/drill/DrillNotepad.tsx` (new)
- `src/components/drill/official/OfficialDrillFrame.tsx` (mount notepad)
- `src/components/drill/HighlightedText.tsx` (underline cleanup, marker tone, no-reflow)

## Goal

Add a **Tutor toggle button in the top-right corner** of the official drill header (next to the existing Help icon and "Welcome, …"), so the user can flip Tutor Mode on/off from there. When ON, the AI tutor auto-pops after a wrong answer (already wired today for adaptive mode); when OFF, it stays quiet.

## What changes

1. **`src/components/drill/official/OfficialDrillFrame.tsx`** — add three optional props:
   - `tutorToggleVisible?: boolean`
   - `tutorMode?: boolean`
   - `onTutorModeChange?: (next: boolean) => void`

   Render a small pill toggle in the existing top-right strip (the row that holds the Help icon + "Welcome, {name}"), placed just left of the Help icon. Visual: shadcn `Switch` with a "Tutor" label, matching the rest of that bar's typography (slate-700, 13px). On mobile it collapses to an icon-only round button (graduation-cap icon) that toggles the same state. Hidden entirely when `tutorToggleVisible` is false.

2. **`src/pages/Drill.tsx`** — pass the new props into `OfficialDrillFrame`:
   - `tutorToggleVisible={session?.mode === 'adaptive'}` (same gate as the existing top-bar toggle)
   - `tutorMode={tutorMode}`
   - `onTutorModeChange={setTutorMode}`

   No changes to `tutorMode` state, the wrong-answer auto-open logic, or `TutorChatModal` — they already react to this state.

3. **No removal** of the existing `DrillTopBar` Tutor switch — both stay in sync because they share the same `tutorMode` state. (If you'd rather have it only in the header, say the word and we'll drop the top-bar one.)

## Out of scope

- No backend, no edge-function, no tutor-prompt changes.
- No changes to the bottom-left FAB / notepad layout.
- No changes for full-section or non-adaptive modes (toggle stays hidden there, same as today).

## Files touched

- `src/components/drill/official/OfficialDrillFrame.tsx`
- `src/pages/Drill.tsx`

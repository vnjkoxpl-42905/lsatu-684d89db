## What's missing

The bottom-center quick-launch dock on `/foyer` (the "GooeyDock" with Inbox / Schedule / Notifications / Profile / Settings / Help icons that used to float well below the orbital ring) is gone.

## Why

In `src/pages/AcademyFoyer.tsx` the `FoyerQuickDock` component is still fully defined (line 281+), including its layout-prefs lookup, permission gating, badge counts, and `<GooeyDock items={items} />` rendering. But the component is never mounted — the `<FoyerQuickDock />` JSX call was removed from the Foyer's main return. The top-right `FoyerDock` cluster (chat preview + notification bell) is unrelated and still renders fine.

## Fix

1. In `src/pages/AcademyFoyer.tsx`, inside the main `<main>` block of the Foyer page (just before `<FoyerFloatingChat />`, after the orbital hero), render `<FoyerQuickDock onReplayTour={...} />`, passing the same tour-replay handler the page already uses for the welcome tour (or omit if not wired).
2. Verify on `/foyer` desktop (1273px) that the dock appears bottom-center, well below the orbital ring (`bottom-10`, centered), and that icons reflect the user's `layout_prefs.dock` order and permission gates.
3. Do not touch `FoyerDock` (top-right), `FoyerFloatingChat`, or any dock styles. No changes to other routes — the dock must remain Foyer-only per project rules.

## Out of scope

- No new dock items, no reordering, no style changes to GooeyDock itself.
- No changes to drill / tutor / answer-choice work from prior turns.

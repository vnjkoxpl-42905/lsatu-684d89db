## Goal

Replace the current static "fixed-on-Foyer" modal walkthrough with a guided tour that **actually navigates her through the app**, dropping a small, sleek tooltip-style debrief on each real page as she lands on it.

## How it will feel

1. After onboarding, a tiny "Welcome — take the 60-sec tour?" prompt appears (Start / Skip).
2. On Start, a small floating coach card (bottom-right, ~360px wide, glass + bronze accent) appears on the **Foyer** itself — pointing at the orbital ring with a 1–2 sentence debrief.
3. She clicks **Next** → tour navigates to `/drill` (Smart Drill page). Coach card reappears on that page with a 1–2 sentence note about adaptive practice.
4. Continues the same way through: `/bootcamps`, `/inbox`, `/schedule`, `/analytics` (or whichever real surfaces we pick), ending back at `/foyer` with a "You're all set" card and a Start Smart Drill CTA.
5. The card is **light, non-blocking** (no full-screen backdrop) so she can see the page behind it. Step counter + Skip + Back/Next.

## Steps (proposed, all real routes)

1. Foyer — "Your home base. Orbital ring = top 3 actions, sidebar = full workspace."
2. /drill — "Smart Drill. Adaptive engine picks questions from your weakest types."
3. /bootcamps — "Multi-day modules that teach the mechanics before you drill them."
4. /inbox — "1:1 thread with Joshua. Real messages, PDFs, real responses."
5. /schedule — "Your weekly plan and what's due next."
6. /foyer (final) — "You're all set. Start Smart Drill →"

## Technical notes

- Replace `WelcomeWalkthrough` modal with a new `GuidedTour` component mounted once at the App layout level (so it survives navigation).
- State (current step, active flag) lives in a small `TourContext` + `localStorage` key `lsatu_guided_tour_v1`. Keep the old `lsatu_welcome_walkthrough_v1` flag respected so existing users don't see it again.
- Each step has `{ path, eyebrow, title, body }`. On Next: `navigate(step.path)` then re-render the floating card after route mount (small delay for transition).
- Card: fixed `bottom-6 right-6` (mobile: bottom sheet style), pointer-events on the card only — page behind stays interactive. Esc/Skip dismisses, Back/Next navigates.
- Hook the prompt into `AcademyFoyer` where the current walkthrough is triggered (`!hasSeenWalkthrough()` block).
- Add a "Replay tour" entry in the Help/dock menu that calls `resetTour()` then triggers it.

## Files to change

- New: `src/components/foyer/GuidedTour.tsx` (floating card + step engine + storage helpers).
- New: `src/contexts/TourContext.tsx` (start/stop/next/prev/skip + persistence).
- Edit: `src/App.tsx` — wrap routes with `TourProvider` and render `<GuidedTour />` once.
- Edit: `src/pages/AcademyFoyer.tsx` — replace `WelcomeWalkthrough` trigger with `useTour().start()` (auto on first visit after onboarding).
- Edit (optional): help/dock menu to expose "Replay tour".
- Delete or keep as legacy: `src/components/foyer/WelcomeWalkthrough.tsx` (delete after migration).

## Out of scope

- No spotlight/highlight ring on individual UI elements (could come later — would need anchor refs across many components). The card alone, on the real page, is enough to feel guided and stays sleek.

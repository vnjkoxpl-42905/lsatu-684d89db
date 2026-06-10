## Stop the Smart LR card from covering the orbital's left node

In `src/pages/AcademyMainhub.tsx` (lines 215–233), the layout is:

- max 1060px container, `gap-3`
- left column: `SmartLRTrainingCard` fixed at 360px (390px at 2xl)
- right column: orbital section, 460×500 absolute-centered

At ~1280–1328px viewports the orbital's left node ("Wrong Answer Journal") and its long label sit right at the card's right edge, so the card overlaps the node/label.

### Fix
Edit only the wrapping flex container in `AcademyMainhub.tsx`:

1. Increase the gap between the card and orbital so the WAJ node's label has clearance: change `gap-3 ... 2xl:gap-4` → `gap-8 2xl:gap-12`.
2. Slim the card column slightly so the orbital gets more room on narrower xl screens: change `w-[360px] ... 2xl:w-[390px]` → `w-[320px] 2xl:w-[360px]`.
3. Add left padding to the orbital section equal to roughly the label overhang so the absolute-centered orbital shifts right of the card: add `pl-6 2xl:pl-10` to the orbital `<section>`.

These are pure layout tweaks — no changes to `SmartLRTrainingCard`, `RadialOrbitalTimeline`, content, or behavior. The result is the card and orbital nodes no longer overlap at 1280–1440px widths while staying centered at ≥1536px.
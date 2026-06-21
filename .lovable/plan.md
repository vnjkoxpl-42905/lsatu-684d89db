## Goal

Replace the flat grid of cards on the three Teacher Desk → Library tabs with a horizontal carousel, so Guided Drills, Activities, and Bootcamps each browse as a swipeable row instead of a long vertical list.

## Scope (UI only, no business logic changes)

Affected files:
- `src/pages/teacher/desk/library/DeskLibraryGuidedDrillsSurface.tsx`
- `src/pages/teacher/desk/library/DeskLibraryActivitiesSurface.tsx`
- `src/pages/teacher/desk/library/DeskLibraryBootcampsSurface.tsx`

Out of scope: Assignments tab, filters/search behavior, the Open/Assign actions, data fetching, routes.

## Implementation

1. Install dep: `@ark-ui/react`.
2. Add a thin wrapper `src/components/ui/card-carousel.tsx` built on `Carousel` from `@ark-ui/react/carousel`. It accepts `items: T[]` + `renderItem`, plus `slidesPerView` responsive config (1 mobile / 2 tablet / 3 desktop). Includes Prev/Next triggers styled with existing tokens (bronze accent, glass surface) and an indicator dot row.
3. Update each of the three surfaces to render their existing card components inside `<CardCarousel>` instead of the current grid. Keep the existing search/week/reasoning filters above the carousel; the carousel renders the filtered result set.
4. Edge cases: when filtered list ≤ slidesPerView, hide Prev/Next + indicators and render as a static row. Empty state unchanged.
5. Preserve white-bg desk aesthetic and bronze Assign button styling. No color hardcoding — reuse existing token classes already in those files.

## Verification

- `npm run build` succeeds.
- Manually open `/teacher?ws=library&tab=guided-drills`, `&tab=activities`, `&tab=bootcamps` in preview and confirm carousel paging + Assign still works.

## Not doing

- No changes to Assignments tab.
- No changes to card internals (titles, badges, Open/Assign buttons).
- No data/model changes.

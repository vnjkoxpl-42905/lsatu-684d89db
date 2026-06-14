## Goal

Rebuild the Activity Runner (currently shown on `/activities/:assignmentId`, e.g. Negation Station) so it matches the reference quiz in `quizhd.mp4`:

- Sticky left "hero" panel with cover image, title, subtitle, byline, and a progress bar pinned to the top of the panel.
- Right side is a single vertical scroll column of questions, one after another, each with:
  - Small green `QUESTION N` label
  - Bold question/statement text
  - The interaction area (textarea + Submit) for the active question
  - Upcoming and resolved questions rendered faded/locked so they preview above and below the active one
- Active question advances by scrolling smoothly to the next card once the current one is resolved (correct, revealed, or out of attempts), instead of swapping a single panel.

Scope: visual + layout redesign of the runner. No backend, no schema, no scoring logic changes.

## What changes

**`src/features/activity-centre/components/ActivityRunner.tsx`**
- Replace the centered single-column wrapper with a two-column layout:
  - Left: new `ActivityHeroPanel` (sticky on `md+`, full-width banner on mobile).
  - Right: new `ActivityQuestionStack` that renders every item in order.
- Remove the old `ProgressHeader` from the right column; progress bar lives in the hero panel.
- Keep all existing state (`phase`, `verdicts`, `responses`, `index`, `handleRecord`, `handleResolved`, `handleNext`). `handleNext` now scrolls the next item card into view in addition to incrementing `index`.

**New `src/features/activity-centre/components/ActivityHeroPanel.tsx`**
- Cover image (use `assignment.cover_image_url` if present, else gradient fallback using existing `--ac-emerald` token).
- Title, subtitle, tag chips, and a "Activity" / instructor byline.
- Slim top progress bar bound to `current / total`.
- Sticky positioning (`md:sticky md:top-0 md:h-screen`); on mobile collapses to a short banner above the questions.

**New `src/features/activity-centre/components/ActivityQuestionStack.tsx`**
- Maps over all `items`. For each item renders an `ActivityQuestionCard` with:
  - `state`: `done | active | upcoming`
  - `index === activeIndex` → renders full `ActivityItemView` interactions
  - `done` → renders the resolved response + verdict, slightly muted
  - `upcoming` → renders only the `QUESTION N` label + statement at ~40% opacity, non-interactive, mirroring the faded "Question 3" peek in the reference
- Each card has a `ref`; on `activeIndex` change the stack scrolls that ref into view (`scrollIntoView({ behavior: "smooth", block: "center" })`).

**`ActivityItemView` / `AnswerPanel` / `StatementPanel`**
- `ActivityItemView` no longer renders its own 2-column grid — it now renders a single right-column-friendly card: green `QUESTION N` eyebrow, statement, then the answer panel directly underneath.
- `StatementPanel` becomes the eyebrow + statement block used inside the card (the "type" chip stays, since it's useful, but matches the reference's quieter chip styling).
- `AnswerPanel` keeps its existing logic; only the surrounding card chrome changes to match the reference (rounded card, soft border, full-width green Submit button).

**`src/features/activity-centre/activity-centre.css`**
- Add tokens/utility classes for: hero gradient overlay, sticky hero, the green `QUESTION N` eyebrow color (reuse `--ac-emerald-strong`), faded upcoming-card style, and the full-width emerald submit button used in the reference.

## Out of scope

- No changes to `activity-coach` edge function, `activitiesClient`, schema, or scoring.
- No changes to `ActivityIntro` (the pre-start screen) or `CompletionSummary`.
- No new fields on `activities` — cover image uses the existing `cover_image_url` column if set, otherwise falls back to a tokenized gradient.

## Mobile behavior

Current viewport is 624×904. On `< md`:
- Hero collapses to a short banner (image + title + progress) above the question stack.
- Question cards take full width.
- Sticky hero is disabled on mobile (it would eat the viewport).

## Verification

- `npm run build` and visual check at `/activities/3dfbf3de-70c2-45e0-a9bf-e85980481506` at both desktop and 624px widths.
- Confirm Submit → coach verdict → Next still advances and that the next card scrolls into view.

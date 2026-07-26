# Classroom redesign — FROZEN BUILD SPEC

Status: **locked, approved for implementation 2026-07-26.** Do not re-litigate decisions here.
Visual reference (approved, verified running): **`CLASSROOM-MOCKUP.html`** in this directory — serve it and look at it before writing code. It is the source of truth for layout, colour and type.
Argument trail: `PLAN-REVIEW-LOG.md` (two rounds of adversarial review, 27 of 28 findings accepted).

---

## Goal

Rebuild `/classroom`, the first surface a paying 1:1 student lands on. It currently fails **7 of 7 Tier 1 correctness gates**: the loudest element on the page is *Sign out*, the page is ordered most-full to most-empty and ends in three empty grey boxes, and three navigations compete while "Classroom" appears on screen three times.

The design base is jeffsu.org, copied verbatim. All values below were parsed from its live stylesheet and HTML, not inferred.

---

## 0. SCOPE LOCK — overrides everything below

**Exactly one page changes.**

**Must not touch:** `src/components/mainhub/StudentShell.tsx`, `MainhubSidebar.tsx`, `StudySidecar.tsx`, `src/contexts/ThemeContext.tsx`, global token blocks in `src/index.css`, shared scales in `tailwind.config.ts`, or any page other than the Classroom.

**May touch:** `src/pages/Classroom.tsx`, `src/components/classroom/**`, a new `src/components/classroom/shell/**`, the `/classroom/*` route block in `src/App.tsx`, one new scoped stylesheet, an additive font link in `index.html`, plus the named migrations in §7.

### CSS isolation — enforce mechanically, not by care
- **Every rule prefixed `.classroom-root`.** No `:root`, no bare element selectors (`body`, `h1`, `a`), no `@layer base`, no utility overrides.
- **Dark mode keys off `html.dark .classroom-root`**, never `html.dark` alone.
- **The font link is additive only.** Adding Outfit and Roboto Mono must not change `font-family` anywhere outside `.classroom-root`. Lexend stays the app default.
- **Proof required:** grep the new stylesheet for `:root`, `@layer`, and any selector lacking `classroom-root` — must return empty. Then screenshot `/mainhub`, `/practice`, `/bootcamps` before and after; must be pixel-identical.

---

## 1. Routing

`/classroom` currently renders inside `StudentShell`, which draws its own 240px sidebar and docks `StudySidecar` at 360–640px. The Classroom now owns its whole frame, so it must leave the shell. `StudentShell`'s own docstring establishes the precedent: Drill and bootcamp runners already route outside it at full viewport.

- Define `/classroom` as a **guarded layout route with an `<Outlet>`** and nest **all six** children beneath it: index, `uploads`, `recaps`, `item/:itemId`, `ta/:assignmentId`, `:assignmentId`. Moving only the index causes chrome whiplash the moment a student opens any item.
- **Preserve `ProtectedRoute flag="has_classroom_access" allowSignedIn` verbatim.** Relocate the existing element; do not re-author it.
- **Replace the onboarding gate the shell was silently providing.** It redirects to `/onboarding` when `profiles.display_name` is absent. Outside the shell that gate disappears and `allowSignedIn` admits any authenticated user. Match today's predicate exactly (`display_name`), including `authReady` handling and the redirect return path.
- `StudentShell` is **not edited.** Routes move; the component does not.

---

## 2. Layout — three columns

```
┌ sidebar 320 ┐┌ section list 320 ┐┌──── reading column, max 720 ────┐
│ card in an  ││ rounded-r,       ││ plain white. no wash.           │
│ 8px gutter  ││ border-l-0,      ││ date line → title → content     │
│ sticky      ││ -ml-4 so it      ││                                 │
│             ││ fuses into one   ││                                 │
│             ││ joined card      ││                                 │
└─────────────┘└──────────────────┘└─────────────────────────────────┘
```

- Sidebar inner padding `24px`; section list `24px 28px`; reading column `80px` top (`my-20`).
- **Classroom index is two columns.** The section list is absent.
- Choosing **Notes and recaps / Assigned work / Recaps** slides the section list in with that list; picking an item renders it in the reading column. The student never leaves the Classroom.
- Choosing a **Study or Review destination** (Drill, Practice, Bootcamps, Activities, Wrong answers, Flagged, Analytics) **navigates away**. It does not open the list.
- Below `xl` (1280px) the section list is replaced by a full-width trigger bar that opens it as an overlay. Below `lg` the main sidebar goes off-canvas.

---

## 3. Colour — parsed from source, exact

### Tokens
| Role | Light | Dark |
|---|---|---|
| Reading surface | `#FFFFFF` | `#0F0E17` |
| Panel base (both sidebars) | `#FFFFFF` | `#0A0913` — **darker than the page** |
| Border, everywhere | `#F3E3D6` | `#17161C` |
| Body text | `#43403C` | `#E5E5E5` |
| Heading text | `#43403C` | `#FFFFFE` |
| Mono metadata | `rgb(166,162,158)` @ `.7` | `rgb(167,169,190)` @ `.7` |
| Dates / soft meta | `rgba(67,64,60,.4)` | `#A7A9BE` |
| Row hover | `#F6EBE1` @ 40% | `#44403C` @ 40% |
| **Active pill** | **`#43403C` bg, `#FFFFFF` text** | **`#3D3C48` bg, `#E5E5E5` text** |
| Dotted leader | `rgba(0,0,0,.15)` | `rgba(255,255,255,.15)` |
| Section-list trigger | `#FEFCF7` | `#0A0913` |

### The gradient is PER-PANEL, not per-page
```css
.bg-1 { background-image: linear-gradient(161.15deg,
          rgba(254,252,247,.4) 12.73%, rgba(243,227,214,.4) 72.95%) }  /* light */
.bg-2 { background-image: linear-gradient(161.15deg,
          rgba(41,37,36,.4)   12.73%, rgba(68,64,60,.4)   72.95%) }    /* dark  */
```
1. Both run at **40% alpha over a base colour** — a panel is base + wash, never a flat cream fill.
2. **Each panel carries its own pair of layers**, `absolute inset-0` *within that panel*, so the 161.15° run travels across that card's own box. A single fixed full-viewport layer is wrong and destroys the effect.
3. Applied to **the two sidebars only**. The reading column has no wash — the source's `<body>` is `bg-white dark:bg-gray-13`.
4. Theme change = the two layers cross-fading opacity over 300ms. **Never switch `background-color`.**

### Orange is a highlight, not a theme
`#FF8906` appears in exactly **two** roles, per `.prose a:not(.btn)` and the accent button:
- inline links inside note content (hover reverts to `#43403C`)
- the single primary button

It is **never** used for statuses, active states, progress, borders, or section chrome. Statuses use `rgba(67,64,60,.4)`. **A build that reads "orange" has misassigned the accent.** The active state is a dark charcoal pill, not orange and not cream.

### Theme plumbing
**Consume the existing `ThemeContext` as-is.** Do not add an init script or storage key: the app stores under `lsatu-theme` and applies a `light` class, with dark as the absent state. The source's three-way Light/Dark/Auto is deliberately not copied — it would mean touching shared theme code.

---

## 4. Type

Outfit + Roboto Mono, applied only under `.classroom-root`.

- Page title **30px, `36px` at `lg`, weight 700**.
- **Body weight 500** — the source sets `font-medium` on `<body>`.
- **Roboto Mono weight 500 only** — the sole weight the source loads.
- One mono size, `.75rem`, for every piece of metadata. This rule alone fixes today's hierarchy inversion, where section headers are smaller and dimmer than their own content.
- Section headers (20px/600) must be larger than the content they head. `tabular-nums` on all stats.
- Date line above every title: 14px, weight 500, soft meta colour, `<time> | kind`.

---

## 5. Content

### Leader rows
Title left, dotted leader, mono status right, whole row an invisible covering anchor (`position:absolute; inset:0; opacity:0`). Mobile: column stack, dash hidden.

### Order — fixed and load-bearing
Always-populated first, conditional below, so the page **gets shorter, never emptier**:
1. Date line + "Welcome back, `<name>`"
2. The coach's most recent message — **no label**, just avatar, name, timestamp, body, and a reply affordance
3. Next session
4. Up next
5. Notes and recaps
6. What you have practised
7. Wrong answers waiting
8. This week / Bootcamp (conditional)

**A section with no content does not render.** No dashed box, no placeholder.

### Notes render rich content — the real target
Inside the 720px column: images full-bleed with `srcset` and `sizes="(min-width: 720px) 720px"`; callout boxes (emoji + text, tinted bordered); blockquotes; `h2`/`h3`; an optional embed slot. The note scrolls while both sidebars stay put.

**No video section exists.** Video is not a focus — if one ever appears it is an embed block inside a note, needing no schema change.

---

## 6. Correctness rules — these are the ones that bite

1. **Three states per block: loading / error / empty.** Only a *successfully returned empty* result hides a section. A failed query must never render as absence — combined with the hide-empties rule it would show a calm, normal page telling a student they have no homework, no message and no booking while five things are due. Loading shows a skeleton; errors show an inline retry; prior data is retained while refetching.
2. **DOMPurify on every inline `content_html`.** Already the house pattern (`ClassroomItem.tsx:61`, `ClassroomTAAssignmentDetail.tsx:98`). Omitting it ships stored XSS.
3. **The coach's latest word filters by admin `sender_id`.** The messages table holds both sides; unfiltered "most recent" shows students their own words attributed to their coach. Fall back to the seeded welcome only after a *successful* no-admin-message result.
4. **Exclude the day-0 welcome from the notes list** — it is type `note` and would otherwise appear twice on one page.
5. **Dedupe "Up next" by `(source_table, source_id)`**, not `source_id` alone. Ids from different tables collide.
6. **Respect `MIN_SAMPLE` / `hasData`** in `src/lib/mainhubAnalytics.ts`. Omit or label insufficient data rather than drawing a chart from one attempt.
7. **No fake data, ever.** Every number traces to a named hook and a table with real rows.

---

## 7. Migrations

1. **`profiles.test_date`** (nullable date) + capture in onboarding + edit control in Profile. Define null, past-date and timezone behaviour using `src/lib/localDate.ts`. The deck degrades to the name alone when null. Enumerate every file this touches.
2. **Partial unique index** on `classroom_items (student_id, source_table, source_id)` for the welcome marker. Verified: the table has **no unique constraint beyond its primary key**, so `ON CONFLICT` is otherwise unimplementable.
3. **Privileged trigger or Edge Function** writing the day-0 welcome, fired on the access-grant/enrolment transition (**never** on signup), authored by a resolved admin id, failing loudly if absent. Students cannot insert `classroom_items` under RLS, so the seed cannot be client-side.

Regenerating Supabase types is part of the migration step.

---

## 8. Voice

The room addresses the student directly and **never names the coach in the furniture**. Second person: "Welcome back, Lexi", "your next session". The message block carries **no label** — it reads as a person, not a UI section. The coach's name appears only where he signs something he wrote. **No em-dashes in any student-facing string.**

---

## 9. Out of scope for this release

- **Uploads ship no capability.** Zero rows, and `parse-external-work/index.ts` writes `extracted_text`, `parsed_json`, `confidence_score` to columns that **do not exist in production** — the pipeline is already broken. Surfacing a submit control that feeds a broken parser is worse than omitting it. Separate work.
- **No `lecture_video` type.** `classroom_items_type_check` allows ten types and this is not one; adding the TS union member alone causes a runtime insert failure.
- **Notes ship dormant** — the list, renderer and column are all built, but zero rows of `note` / `session_recap` / `announcement` / `smartboard_recap` have ever existed. The redesign cannot create the content it displays.
- Admission predictor. Live 7Sage sync. Separate calendar. Knowledge graph. Streaks, badges, projected score. Any change to Foyer or `/mainhub`. Unifying the two chromes.

## Accepted tradeoffs, on the record

`#B3B0AC` on white is ~2.2:1 and **fails WCAG AA** for body text. Source fidelity was reaffirmed twice; this is a known, accepted decision. Benchmark gate C3 is retired; C5 (must match `/mainhub`) is **suspended, not met** — the Classroom will look like a different product from the rest of the app, the accepted cost of the scope lock.

---

## 10. Verification — not done until seen running

1. Signed in as a student, screenshot at narrow / mid / wide. Section list appears only above `xl`; trigger bar below it.
2. Notes / Assigned work open the section list and keep the student in the Classroom; Drill / Practice navigate away. Both checked by hand.
3. **Squint test:** the next action dominates. If Sign out is visible at all, it failed.
4. **Empty-state test:** a student with zero assignments, plan and recaps still sees a page worth being on.
5. **Failure test:** force a query error; the page must report it, not render as "nothing assigned".
6. **Colour audit:** walk every rendered element's computed styles — exactly one may carry `#FF8906` on the index (the primary button).
7. **Isolation proof:** the grep in §0, plus before/after screenshots of `/mainhub`, `/practice`, `/bootcamps`.
8. Route checks: student / admin / unauthenticated; onboarding redirect still fires for a profile with no `display_name`.
9. Seed idempotency under retry.
10. `npm run typecheck` before any push — the repo's hard gate.
11. Re-score all 7 Tier 1 gates and record the result.

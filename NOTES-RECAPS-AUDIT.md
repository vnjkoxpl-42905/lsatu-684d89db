# Notes and recaps — technical audit

**Date:** 2026-09-08
**Surface:** `/classroom/recaps` (index) and `/classroom/item/:id` (note detail)
**Theme audited:** shipped light only, at Joshua's instruction. The dark alternate was
spot-checked once and passes; it is not the subject of this document.
**Method:** live production at lsatprep.study, signed in, measured in-browser at 375px,
1134px and 1440px. Contrast ratios are computed against the actually-rendered
background, per DESIGN.md's rule that the token file is not evidence.

## Files

| File | Role |
|---|---|
| `src/components/classroom/ClassroomRouteViews.tsx` | `ClassroomRecapsView` (L188), `ClassroomItemView` (L85) |
| `src/components/classroom/StageIndexList.tsx` | the in-stage list and the count hint |
| `src/components/classroom/shell/ClassroomLayout.tsx` | shell, sidebar, `SectionList` rail, overlay |
| `src/components/classroom/classroomData.ts` | `groupNotes`, `NOTE_TYPES` |
| `src/components/classroom/classroom.css` | all `classroom-*` rules (shared, 4890 lines) |
| `src/contexts/QuestionBankContext.tsx` | the prefetch that dominates this page's bytes |

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2/4 | Every date and every secondary line on the page renders at **2.10:1**. AA needs 4.5:1. |
| 2 | Performance | 1/4 | **1.79 MB** of question-explanation JSON (7.18 MB decoded, 59 requests) on a page that shows three note titles. |
| 3 | Responsive Design | 3/4 | The 1280px column swap is correct and verified. But at ≥1280 the main column is nearly empty. |
| 4 | Theming | 2/4 | Two tokens are consumed but undefined; the documented body typeface never renders. |
| 5 | Anti-Patterns | 3/4 | No AI slop. Restrained and deliberate. Marked down for typography drift, not for taste. |
| **Total** | | **11/20** | **Acceptable — significant work needed** |

## Anti-patterns verdict

**Pass.** This does not look AI-generated, and that is a real achievement.

The deterministic scan (`npx impeccable --json`) returned **zero findings** on
`ClassroomRouteViews.tsx` and `StageIndexList.tsx`. Across the whole `classroom/`
directory it reported 166 findings, 92 touching this surface's files, of which 74 are
advisory type-ramp and palette drift in the shared stylesheet. Checked by hand:

- No gradient text, no glassmorphism, no hero-metric block, no identical card grid, no
  modal-as-first-thought, no decorative colour.
- No `box-shadow` on any Workroom surface here. Depth is hairline and tone, as DESIGN.md
  specifies.
- **The one "side-stripe border" hit is a false positive.** `classroom.css:2343` is
  `border-left: 4px solid` on `.classroom-prose blockquote` — the conventional
  typographic form for a quotation, not a coloured accent stripe on a card or callout.
  Leave it.

Two genuine bans are broken in `classroom.css`, but on **other** classroom surfaces, not
this one. Recording them here so they are not lost:

- `classroom.css:3813` and `:4566` put **Fraunces** on `.classroom-orientation h2` and
  `.classroom-admissions-head h1`. DESIGN.md: *"The Serif Stays At The Door Rule.
  Fraunces and Cinzel belong to the Hall. A serif appearing in the Workroom chrome means
  the seam has leaked."*
- `classroom.css:3866` animates `width` on `.classroom-orientation-progress span`. That
  is a layout property.

## Findings by severity

### [P1] Every date and secondary line on the page fails WCAG AA

**Location:** `classroom.css:25` — `--classroom-meta-soft: rgba(67, 64, 60, 0.4)`
**Category:** Accessibility
**Measured in the browser, light theme, against the real white ground:**

| Element | Ratio | Needs |
|---|---|---|
| Row date, every row (`.classroom-panel-item time`, 12px) | **2.10:1** | 4.5:1 |
| The count hint, "All 3 read." (15px) | **2.10:1** | 4.5:1 |
| The dateline above the H1 (14px) | **2.10:1** | 4.5:1 |
| Note description on the detail view | **2.10:1** | 4.5:1 |
| Row title | 10.31:1 | pass |
| H1 | 10.31:1 | pass |

**Impact:** the date is the only distinguishing information between two notes with
similar titles, and it is the piece a student cannot read. Two of the three notes on the
live page are titled "Conditional Logic: the Cheat Sheet" and "Conditional Logic: the
Cheat Sheet (five-section cut)"; the date is what separates them. PRODUCT.md makes AA a
binding floor and calls a finding below it a bug, not an argument.

**The fix already exists in the codebase.** The same token in the dark alternate is a
solid `#a7a9be` and measures 8.27:1. The light value is the only broken one, and it is
broken because it is a 40% alpha rather than a resolved colour. `--classroom-meta-text:
#6d6a67` is already defined one line away as the "text-safe pair" and measures ~4.9:1.
The four call sites above should use it.

**Suggested command:** `$impeccable audit` → fix, then `$impeccable polish`

### [P1] 1.79 MB of question explanations load on a page with three rows of text

**Location:** `src/contexts/QuestionBankContext.tsx:37`, `src/lib/questionLoader.ts:958`
**Category:** Performance
**Measured on a clean load of `/classroom/recaps`:**

- 59 requests to `/data/explanations/PT*.json`
- **1.79 MB transferred, 7.18 MB decoded**
- **44%** of the page's total 4.08 MB
- 13.6 s of cumulative request time; slowest single file 501 ms
- 33 of the 59 return **404** (PT106–PT138), logging an error each

`QuestionBankProvider` sits on the catch-all route and loads the full bank unless the
path matches `BANK_FREE_PREFIXES`, which is `['/activities', '/activity-lab', '/auth',
'/rc']`. `/classroom/recaps` is not in it, so this text-only page pays for the entire
Logical Reasoning corpus plus one explanation fetch per PrepTest.

**The comment on that denylist is now stale and understates the cost.** It documents
"9-14 explanation fetches". The measured number is **59**. The bank grew; nobody
re-measured.

**Recommendation:** the file's own rule is to grep a route's whole subtree before adding
it. Do that for `/classroom/recaps` before adding it — the classroom shell is shared with
`/flagged` and `/journal`, which *do* read the bank, so this needs the prefix to be the
full `/classroom/recaps`, not `/classroom`. Separately, the 33 404s are worth fixing on
their own: `mergeExplanationSidecars` should read the manifest of which PrepTests have
sidecars rather than probing all of them.

**Suggested command:** `$impeccable optimize`

### [P1] A student with no notes sees a title and nothing else

**Location:** `ClassroomRouteViews.tsx:215`
**Category:** UX / anti-pattern (verified by reading the code path, not by emptying data)

```jsx
{!query.isLoading && !query.error && total > 0 ? (
  <> ...lists... </>
) : null}
```

There is no else branch. A student with zero notes gets the dateline, the H1 "Notes and
recaps", and empty space. The rail panel behaves the same way: `classroom-panel-empty` in
`ClassroomLayout.tsx` is gated on `section === "flagged"` (L718) and the journal (L822),
so the notes rail is also empty-stateless.

PRODUCT.md, principle 1: *"An honest empty state beats invented content. If nothing has
been assigned, the product says so and stops."* The product currently just stops.

This matters most for exactly the student who most needs reassurance: a new client whose
first session has not been written up yet. The copy already exists elsewhere in the
codebase — `RecapsSection.tsx:20` says *"Recaps from your sessions with Joshua will show
up here."*

**Suggested command:** `$impeccable onboard`

### [P1] The overlay list is not a dialog

**Location:** `ClassroomLayout.tsx:1113-1129`
**Category:** Accessibility
**Verified in the browser at 375px:**

- Opening it does **not** move focus into the overlay; focus stays on the row behind it.
- **Escape does not close it.** Only the X button or the backdrop.
- The `<aside>` carries **no attributes at all** — no `role="dialog"`, no `aria-modal`,
  no `aria-label`.
- No focus trap, so tabbing walks straight into the content behind the scrim.

This is the shared classroom overlay, so the fix lands on every section, not just notes.

**Suggested command:** `$impeccable harden`

### [P2] "Open the list" opens a copy of the list already on screen

**Location:** `ClassroomLayout.tsx:1096`, `StageIndexList.tsx`
**Category:** UX
**Verified at 375px:** the overlay renders the same three rows, under the same heading
"Notes and recaps", while the stage list stays `display: grid` behind it.

The trigger is right on the index route. It earns its place on a *detail* route
(`/classroom/item/:id`), where the stage holds the note and the list is otherwise
unreachable below 1280px. On the index route the list is already the page.

**Fix:** hide the trigger when the stage index is visible and non-empty.

**Suggested command:** `$impeccable distill`

### [P2] At ≥1280px the main column is nearly empty

**Location:** `ClassroomRouteViews.tsx:201-239`
**Category:** Layout
**Measured at 1440px:** the main column is **720px** wide and holds three things — a
dateline, the H1, and one 15px line reading "All 3 read." at 2.10:1. The actual content
lives in a **336px** rail to its left. Everything below the fold in the widest, most
prominent region of the page is white space.

The title also appears three times simultaneously: the active sidebar item, the rail
panel heading, and the H1.

PRODUCT.md principle 2 is *"Compute the next step; do not present a grid."* This page
does not present a grid, but it does not compute anything either. It has real material to
work with: which note is newest, which are unread, when the last session was.

**Suggested command:** `$impeccable shape`

### [P2] Two tokens are consumed but never defined

**Location:** `classroom.css:4514`, `:4529`
**Category:** Theming
**Verified:** `getComputedStyle(.classroom-root).getPropertyValue('--classroom-accent')`
returns `""`. Same for `--classroom-surface`.

```css
.classroom-unread-dot   { background: var(--classroom-accent, currentColor); }
.classroom-unread-count { background: var(--classroom-accent, currentColor);
                          color: var(--classroom-surface, #fff); }
```

Both fall through to their fallbacks, so the unread dot renders in the same ink as the
title text beside it. It is still *visible* — it has size and position, and the row also
carries an `sr-only` "(unread)", so this is not a colour-only signal and not an AA
failure. But an accent was intended and does not exist.

DESIGN.md: *"a token that resolves to nothing is a defect, not a subtle effect."* That
record already documents three names that pointed at nothing for five months. These are
two more.

**Suggested command:** `$impeccable colorize`

### [P2] The documented body typeface never renders

**Location:** `classroom.css:39`
**Category:** Theming / typography
**Verified in the browser:** `Lexend` is downloaded and `status === 'loaded'`, and
renders on **zero** elements on this page.

`body` is correctly `Lexend, Outfit, …`. Then `.classroom-root` hard-overrides to
`"Outfit", ui-sans-serif, system-ui, sans-serif`, so the entire classroom runs on Outfit.

Two families render on this page: **Outfit** and **Roboto Mono**. Roboto Mono is on the
sidebar group labels ("Classroom", "Study", "Review"), the `›` chevrons, the brand
lockup, the unread badge and the "Teacher" role label.

Against DESIGN.md:
- Workroom body is declared **Lexend**. It renders nowhere.
- The mono face is declared **IBM Plex Mono**. Roboto Mono is used instead — and IBM Plex
  Mono is already loaded on the page.
- *"The One Face Rule. A second family inside the Workroom is a defect unless it is the
  Outfit question lock."* The second family here is Roboto Mono in chrome, which is not
  the question lock.

Either the code should follow the record, or the record should be corrected to say the
classroom deliberately runs on Outfit. Right now they disagree and the code is winning
silently.

**Suggested command:** `$impeccable typeset`

### [P3] Reading measure is unconstrained on the note detail

**Location:** `classroom.css`, `.classroom-prose`
**Measured at 1440px:** prose renders at **720px** at 16px Outfit — roughly **90
characters** per line. Impeccable's shared law caps body at 65–75ch, and DESIGN.md has
its own *Reading Measure Rule*: *"Any surface carrying an LSAT passage, stimulus, or
explanation constrains its own line length. The container's maximum is a ceiling for
layout, never a licence for prose."*

A coach's recap is exactly the prose this rule was written for.

### [P3] Raw database enums are shown to students

**Location:** `ClassroomRouteViews.tsx:167` — `item.type.replace(/_/g, " ")`
**Observed:** the detail dateline reads `August 19, 2026 | note`. Students see the raw
column value: `note`, `session recap`, `smartboard recap`, `announcement`. Lowercase,
machine-shaped, and "smartboard recap" is internal vocabulary.

### [P3] The index page is stamped with today's date

**Location:** `ClassroomRouteViews.tsx:204` — `date={new Date().toISOString()}`
**Observed:** the index reads "September 8, 2026 | Classroom", which is simply the day
the student happened to visit. It sits in the position that, on every note detail page,
holds the date the coach wrote the note — so it reads as metadata about the content while
tracing to `Date.now()`. Minor, but it is the one number on the page that does not trace
to stored data.

## Patterns and systemic issues

1. **Alpha-based muted text is the contrast bug.** `rgba(ink, 0.4)` cannot be reasoned
   about against a ground, and it is why one token breaks four separate places on one
   page. The dark theme resolved the same token to a real colour and passes at 8.27:1.
   The light theme should do the same. There is already a `--classroom-meta-text`
   defined for exactly this and it is unused at these call sites.
2. **The record and the code have drifted on typography, and nobody notices** because
   both faces are geometric sans and the difference is invisible at a glance. DESIGN.md
   already carries a "known gaps" appendix; this belongs in it either way.
3. **Route-level cost is invisible at the provider.** A shell-mounted provider means a
   text page silently pays a drill page's bill, and the only record of the cost is a
   comment that is now wrong by 4-6x.

## What is working

- **The focus indicator is genuinely good.** Verified with a real keyboard Tab: a solid
  2px ink outline at 2px offset, no fade-in, high contrast. The zero-specificity
  `:where(...)` floor in `index.css:196` catches `.classroom-panel-item`, which defines
  no focus treatment of its own. This is the fix from 2026-09-05 doing its job.
- **The responsive column swap is correct and well-reasoned.** Verified at 375, 1134 and
  1440: the rail shows and the in-stage list hides at ≥1280, and the reverse below, with
  the hidden copy `display: none` so it stays out of the accessibility tree. I checked
  specifically for a double-read and there is none. The comment in `StageIndexList.tsx`
  explaining why both copies render is accurate.
- **Unread state is not carried by colour alone.** The dot has size and position, and the
  row carries an `sr-only` "(unread)". This survives the accent token being undefined,
  which is exactly the robustness the comment claims.
- **Touch targets pass comfortably.** Rows are 66px, well over the 44px floor, and they
  get there by real height rather than by wrapped text.
- **Loading and error states both exist and are honest.** `DetailLoading` renders
  skeletons; `DetailError` gives a real retry that calls `refetch`. Read-marking is
  deliberately failure-tolerant (`ClassroomRouteViews.tsx:108`) so a convenience never
  blocks the note.
- **The surface is not AI slop.** It is quiet, flat, hairline-separated and free of every
  cliché on the list. The restraint is real and it should survive the fixes below.

## Recommended actions

1. **[P1] `$impeccable audit`** — resolve `--classroom-meta-soft` in the light theme to a
   real colour (`--classroom-meta-text: #6d6a67` already exists and clears AA), fixing
   the row dates, the count hint, the dateline and the note description in one change.
2. **[P1] `$impeccable optimize`** — keep the question bank off `/classroom/recaps`, and
   stop `mergeExplanationSidecars` probing 33 PrepTests that have no sidecar.
3. **[P1] `$impeccable onboard`** — write the zero-notes empty state for both the page and
   the rail.
4. **[P1] `$impeccable harden`** — give the section overlay `role="dialog"`,
   `aria-modal`, an accessible name, a focus move on open, a focus trap and Escape.
5. **[P2] `$impeccable shape`** — decide what the main column says at ≥1280px, and drop
   the redundant trigger on the index route.
6. **[P2] `$impeccable typeset`** — settle Lexend vs Outfit and Roboto Mono vs IBM Plex
   Mono, then correct whichever of the two records is wrong.
7. **[P2] `$impeccable colorize`** — define `--classroom-accent` and
   `--classroom-surface`, or remove the two `var()` calls that reach for them.
8. **[P3] `$impeccable clarify`** — replace the raw type enum with student-facing labels,
   and drop today's date from the index dateline.
9. **[P3] `$impeccable polish`** — constrain `.classroom-prose` measure to 65–75ch, then
   re-verify contrast in a browser.

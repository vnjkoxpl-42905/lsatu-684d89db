# Notes and recaps — critique and remediation plan

**Date:** 2026-09-08
**Companion to:** `NOTES-RECAPS-AUDIT.md` (technical audit, 11/20)
**Theme:** shipped light only, at Joshua's instruction.
**Method:** two independent assessments, run in isolation and never shown each other's
output — a hands-on technical audit and a separate LLM design review — plus the
deterministic `npx impeccable` detector. Where they agree, the finding is marked
**[both]**. Every contrast number below was measured in a browser against the
actually-rendered background.

---

## Design Health Score — 21/40

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | The only status line, "All 3 read.", is 2.10:1 and is `display:none` below 1280px, so mobile gets no count at all |
| 2 | Match system / real world | 2 | Four DB types merged with no row showing which; detail shows the raw enum "note" |
| 3 | User control and freedom | 2 | Overlay has no `role="dialog"`, no focus trap, no Escape, no focus return |
| 4 | Consistency and standards | 2 | Flagged and Journal panels both get search and an empty state; Notes gets neither |
| 5 | Error prevention | 3 | Solid. "No longer available" also fires on a still-loading cache |
| 6 | Recognition over recall | 2 | A row is a title and a date; two live rows differ only by a parenthetical |
| 7 | Flexibility and efficiency | 1 | No search, filter, type toggle or grouping. Breaks at ~40 notes |
| 8 | Aesthetic and minimalist | 2 | Aesthetic is genuinely good; proportion is broken — 89px of content in a 900px column |
| 9 | Error recovery | 3 | `DetailError` retry works. Marked down for 33 console 404s |
| 10 | Help and documentation | 2 | The page never says what these items are or who writes them |
| **Total** | | **21/40** | **Needs work** |

Combined with the audit's **11/20**, the picture is consistent: the surface is
well-engineered and tastefully restrained, and it is under-designed and under-finished.

## Anti-patterns verdict — pass

**This does not look AI-generated, and it is not close.** Both assessments reached that
independently.

- The deterministic detector returned **zero findings** on `ClassroomRouteViews.tsx` and
  `StageIndexList.tsx`.
- Verified live: **zero box-shadowed elements** under `.classroom-root`. The Flat Rule
  holds on this surface even though the shared `ui/card.tsx` still ships `shadow-sm`.
- No gradient text, no glassmorphism, no hero metric, no card grid, no modal-first.
- Motion is correct: the stage-enter animation sits inside
  `@media (prefers-reduced-motion: no-preference)` and animates only `opacity`/`transform`.
- **The detector's one "side-stripe border" hit is a false positive** — it is a
  `blockquote` rule, the legitimate use. Leave it.

The failure mode here is the opposite of slop. Slop is over-decorated sameness. This is
under-designed emptiness.

---

## The ledger

Everything both assessments found, consolidated. This is the list the plan closes.

| # | Finding | Sev | Where |
|---|---|---|---|
| 1 | All secondary text fails AA — 2.10:1 **[both]** | P0 | `classroom.css:25` + 6 call sites |
| 2 | Rail group labels and role label at 2.54:1 | P0 | `--classroom-meta` sites |
| 3 | Unread badge, white on `#ff8906`, 2.38:1 | P0 | `classroom.css:2299` |
| 4 | Main column is empty at ≥1280px **[both]** | P0 | `ClassroomRouteViews.tsx:201` |
| 5 | Zero-note state renders nothing, in both columns **[both]** | P1 | `ClassroomRouteViews.tsx:215`, `ClassroomLayout.tsx:717` |
| 6 | Overlay is not a dialog: no role, trap, Escape or focus return **[both]** | P1 | `ClassroomLayout.tsx:1104`, `:1024` |
| 7 | 1.79 MB / 59 requests of unused explanation JSON | P1 | `QuestionBankContext.tsx:37` |
| 8 | 33 console 404s from sidecar probing | P1 | `questionLoader.ts:958` |
| 9 | Below 1280px the list is offered twice **[both]** | P1 | `classroom.css:4479` + `:3044` |
| 10 | Rail rows are 34px, under the 44px floor | P1 | `classroom.css:244` |
| 11 | `.classroom-panel-search:focus { outline: none }` | P1 | `classroom.css:2503` |
| 12 | Row never shows its type; 4 types look identical | P2 | `StageIndexList.tsx:51` |
| 13 | A note is a dead end — no Ask, no next, no back | P2 | `ClassroomRouteViews.tsx:163` |
| 14 | `--classroom-accent`, `--classroom-surface` undefined **[both]** | P2 | `classroom.css:4514`, `:4529` |
| 15 | Lexend never renders; two families, neither documented **[both]** | P2 | `classroom.css:39` |
| 16 | No search, filter or grouping — breaks at ~40 notes | P2 | `ClassroomRecapsView` |
| 17 | Note styling is unscoped and can restyle the room | P3 | `classroomData.ts:34` |
| 18 | Reading measure ~90ch on the detail view | P3 | `.classroom-prose` |
| 19 | Raw DB enum shown to students | P3 | `ClassroomRouteViews.tsx:167` |
| 20 | Index page stamped with today's date **[both]** | P3 | `ClassroomRouteViews.tsx:204` |
| 21 | "Notes and recaps" printed three times at ≥1280px | P3 | shell + view |
| 22 | `.classroom-empty-copy` styles real authored content | P3 | `ClassroomRouteViews.tsx:171` |

---

## Two decisions that change the work

Everything else is mechanical. These two are yours, and the plan branches on them.

### Decision A — what is `/classroom/recaps` for?

The page renders 89px of content into a 900px column because the list lives in the rail.
Two defensible answers:

- **A1 — Make it a real landing.** The stage opens the newest unread note inline (or its
  first ~150 words with a "Read it" control), above a short line saying what this surface
  is. Follows Principle 2, "compute the next step". More work; better answer.
- **A2 — Admit it is a redirect.** `/classroom/recaps` redirects to the newest note, the
  way a mail client opens the newest message, and the rail is the index. Much less work;
  honest; loses the chance to say anything.

**Recommendation: A1.** Principle 2 is explicit, and this is the surface where the "a real
coach is in it" claim is weakest. A2 is a legitimate fallback if you want this closed fast.

### Decision B — is the classroom a "world" or a corridor?

`classroom.css:39` overrides the body face to Outfit, so **Lexend renders nowhere** in the
classroom despite being downloaded. Roboto Mono is the second family, where DESIGN.md
declares IBM Plex Mono. DESIGN.md says rooms may be worlds but *"corridors never are"*,
and the classroom rail is a corridor. It is currently neither.

- **B1 — Sanction it.** The classroom is a world. Add `.classroom-root` to DESIGN.md's
  scoped-world list, write `.impeccable/surfaces/classroom.md`, and swap Roboto Mono for
  the documented IBM Plex Mono. Code stays; the record catches up.
- **B2 — Bring it home.** Delete the `font-family` on `classroom.css:39` and let Lexend
  through. The record stays; the code catches up. Visually this changes every classroom
  surface, so it needs a look before it ships.

**Recommendation: B1.** The classroom's warm palette and Outfit are deliberate and good —
both assessments called the aesthetic a genuine asset. The defect is that it is
undocumented, not that it exists. B1 also costs far less and risks nothing visual.

---

## The plan

Nine phases, ordered so the cheapest highest-impact work lands first and nothing depends
on an unmade decision. Each phase is one commit and one verification.

**A note on shipping:** per `PRODUCT.md`, deployment is not a side effect of pushing to
`main` — production at lsatprep.study needs an explicit publish step. Every phase below
ends at "merged", not "live". Publishing stays your call.

### Phase 1 — Contrast (closes 1, 2, 3) · P0 · ~1 hour

The whole fix is a token swap, and `classroom.css:15-22` already argues for it in a
comment: *"Use these two instead whenever the colour carries words or notation."* The
text-safe tokens exist and are barely used.

| Token | Measured on white | Use for |
|---|---|---|
| `--classroom-meta-soft: rgba(67,64,60,.4)` | **2.10:1** | rules and fills only, never text |
| `--classroom-meta-text: #6d6a67` | **5.37:1** ✓ | any text |
| `--classroom-link: #ff8906` | **2.38:1** as text | fills only |
| `--classroom-link-text: #a25704` | **5.39:1** ✓ | any text or number |

1. Swap `--classroom-meta-soft` → `--classroom-meta-text` at the text call sites:
   `.classroom-dateline` (`:2063`), `.classroom-empty-copy` (`:2480`),
   `.classroom-panel-item time` (`:2707`), `.classroom-panel-empty` (`:2509`).
2. Darken the `--classroom-meta` triplet, or swap to `--classroom-meta-text`, for
   `.classroom-nav-group > b` and `.classroom-profile-copy small` (both 2.54:1).
3. `.classroom-nav-badge` (`:2299`): the number needs a text-safe ground. Either darken
   the fill to `--classroom-link-text` with white text, or keep the orange fill and use
   `--classroom-ink` for the numeral.
4. Grep the remaining 15 `-soft` and 53 `rgb(var(--classroom-meta))` uses and split them
   text vs. fill. Most are outside this surface but the token is shared, so this is where
   the systemic fix happens.

**Verify:** re-run the in-browser contrast probe. Every text node on
`/classroom/recaps` and `/classroom/item/:id` at ≥4.5:1, normal text. No exceptions —
PRODUCT.md makes AA a defect gate.

### Phase 2 — Empty states (closes 5) · P1 · ~1 hour

1. `ClassroomRouteViews.tsx:215` — add the else branch. Copy already exists in the repo:
   `RecapsSection.tsx:20`, *"Recaps from your sessions with Joshua will show up here."*
2. `ClassroomLayout.tsx:717` — un-gate `.classroom-panel-empty` from `section === "flagged"`
   so `notes` and `work` get one too, matching Flagged and Journal.
3. Keep it honest. Say what these are and who writes them. Do not invent a count, a
   schedule, or a promise that does not trace to stored data.

**Verify:** point the query at an empty array in a test render and confirm both columns
say something. Do not empty live data to test this.

### Phase 3 — Overlay accessibility (closes 6, 11) · P1 · ~2 hours

Fixes the shared classroom overlay, so it lands on every section at once.

1. Move `.classroom-section-overlay` and `.classroom-mobile-menu` onto the Radix Dialog
   already in the dependency tree. That supplies `role="dialog"`, `aria-modal`, the focus
   trap, Escape, and focus restore in one move rather than four hand-rolled ones.
2. Give each an accessible name.
3. `classroom.css:2503` — delete `outline: none` on `.classroom-panel-search:focus`, or
   ship a real ring in the same rule. DESIGN.md names this exact anti-pattern: a border
   shift is too quiet to be the only indicator.

**Verify:** keyboard only. Open the drawer, confirm focus moves in, Tab stays inside,
Escape closes it, focus returns to the trigger. Confirm the search field shows a ring.

### Phase 4 — Performance (closes 7, 8) · P1 · ~2 hours

1. Grep the `/classroom/recaps` subtree for `questionLoader` per the rule written into
   `QuestionBankContext.tsx`. The classroom shell is shared with `/flagged` and
   `/journal`, which *do* read the bank, so the denylist entry must be the full
   `/classroom/recaps`, never `/classroom`.
2. Add it to `BANK_FREE_PREFIXES`.
3. **Update the stale comment.** It documents "9-14 explanation fetches"; the measured
   number is **59**. That comment is how the next person will reason about this.
4. Separately, make `mergeExplanationSidecars` read a manifest of which PrepTests have
   sidecars instead of probing all of them. That kills 33 404s everywhere, not just here.

**Verify:** clean load of `/classroom/recaps`, then confirm zero `/data/explanations/`
requests and page transfer down from 4.08 MB. Then load `/flagged` and `/journal` and
confirm questions still resolve — that is the regression this change risks.

### Phase 5 — The duplicate list (closes 9, 21) · P1 · ~1 hour

Two rules fire at the same breakpoint: `.classroom-stage-index` becomes `grid` at
≤1279px and `.classroom-section-trigger` becomes `flex` at ≤1279px. The trigger is also
the first thing in the reading column, above the `<h1>`.

1. Suppress the trigger on any route that renders its own `StageIndexList`. Cleanest is a
   flag through `ClassroomLayoutContext` set by the index views.
2. The invariant to hold: **never show both.**
3. While here, drop one of the three simultaneous "Notes and recaps" strings at ≥1280px.

**Verify:** at 375, 900, 1134, 1440. Exactly one list, and the trigger appears only where
there is no inline index (a note detail, an assignment).

### Phase 6 — Touch targets (closes 10) · P1 · ~30 min

`.classroom-nav` computes to **34px** (14px × 1.45 + 7px × 2). PRODUCT.md requires 44×44
*"by being that size rather than by a side effect"*. The same class draws the mobile
drawer, where it is a real touch failure.

Raise the padding so the row is 44px by construction. The mobile menu button is already a
correct 44×44 and needs nothing.

### Phase 7 — The stage (closes 4, 20, 22) · P0 · ~half a day · **depends on Decision A**

Under **A1**: the stage opens the newest unread note inline, or its opening ~150 words
with a "Read it" control, above one line saying what this surface is and who writes it.
Under **A2**: `/classroom/recaps` redirects to the newest note and the rail is the index.

Either way:
- Drop the dateline from index routes (`ClassroomRouteViews.tsx:204`). Today's date above
  a list whose newest item is 24 Aug dates nothing, and it is the one number on the page
  that traces to `Date.now()` rather than stored data.
- Stop rendering a note's real `description` in `.classroom-empty-copy`
  (`ClassroomRouteViews.tsx:171`). Authored content should not inherit empty-state styling.

### Phase 8 — Typography and tokens (closes 14, 15) · P2 · ~1–2 hours · **depends on Decision B**

Under **B1** (recommended): add `.classroom-root` to DESIGN.md's scoped-world list, write
`.impeccable/surfaces/classroom.md` recording Outfit + the warm palette as deliberate, and
swap Roboto Mono → IBM Plex Mono (already loaded, already the documented mono).
Under **B2**: delete `classroom.css:39` and review every classroom surface on Lexend.

Independently of A or B:
- Define `--classroom-accent` and `--classroom-surface`, or delete the two `var()` calls
  that reach for them. Right now the unread dot falls back to `currentColor` and renders
  as the same ink as the title beside it, while the Messages badge is orange — two unread
  markers, two colours, one of them accidental. DESIGN.md: *"a token that resolves to
  nothing is a defect, not a subtle effect."* That record already lists three names that
  pointed at nothing for five months.
- Remove the hex literals at `classroom.css:290`, `:302`, `:4529`.

### Phase 9 — Content and scale (closes 12, 13, 16, 17, 18, 19) · P2/P3 · ~half a day

1. **Show the type on each row.** "Session recap · 23 Aug" vs "Note · 24 Aug". Four DB
   types currently render identically on a page whose title promises two categories.
2. **Map the enums to student words.** `smartboard_recap` is internal vocabulary; the
   detail view currently prints the raw column value.
3. **End a note with something.** `CONTEXT.md` already defines the affordance — "Ask",
   always labelled "Ask", carrying the student's comment from the surface they are on.
   Route it into the existing 1:1 inbox thread, prefilled with the note title. Add
   "Next note" and "Back to notes and recaps".
4. **Constrain `.classroom-prose`** to 65–75ch. It currently runs ~90ch at 720px/16px,
   against DESIGN.md's own Reading Measure Rule.
5. **Scale.** At ~25 sessions a week this list is in the hundreds within a year, and it
   has no search, filter or grouping while Flagged and Journal both do. Month grouping is
   probably the better answer than search for a chronological archive — but this is worth
   its own `$impeccable shape` rather than a guess.
6. **Scope note styling.** Allowing authored CSS is well-reasoned and documented, but
   there is no containment, so a note's `h2 {}` styles the room. `@scope` or a shadow
   root. Downgraded to P3 on 2026-09-08 after measurement, see below.

## Correction — authored note content, 2026-09-08

An earlier pass in this session reported that the "Conditional Logic: the Cheat Sheet"
note carried **20 elements at 2.03:1**, and called it arguably P1. **That was wrong, and
it was my measurement, not the content.** The probe treated any background with
alpha > 0 as opaque, so a `rgba(0,0,0,0.04)` tint over white was scored as solid black.

Re-measured with the full ancestor background stack composited correctly, that note has
**one** failure: a 10px uppercase label ("the trigger") at **3.90:1** on a `#dbdbdb`
chip. Everything else in 564 authored text nodes passes.

The note also turns out to author *against the design tokens* —
`color: var(--classroom-meta-text)`, `var(--classroom-link-text, #a25704)` — rather than
hard-coding hex. That is good authoring and it means Phase 1's token fix reaches the note
content automatically.

Two consequences:

- A blanket contrast floor on `.classroom-prose` is **not justified** by one 10px label,
  and would flatten deliberately coloured pedagogy. Not recommended.
- The same compositing bug means the *chrome* numbers in the original audit were
  understated, not overstated. The sidebar group labels are **1.85:1**, not 2.54:1, once
  the 0.7 opacity is counted. Phase 1 fixes them to 5.37:1.

---

## Sequencing

```
Phase 1  Contrast          P0  ──┐
Phase 2  Empty states      P1    │  independent, ship in any order
Phase 3  Overlay a11y      P1    │
Phase 4  Performance       P1    │
Phase 5  Duplicate list    P1    │
Phase 6  Touch targets     P1  ──┘
Phase 7  The stage         P0  ←── needs Decision A
Phase 8  Typography        P2  ←── needs Decision B
Phase 9  Content + scale   P2/P3 ←── after Phase 7
```

Phases 1–6 close 11 of the 22 findings including all three P0 contrast items, need no
decisions, and are mostly token swaps and prop threading. That is the first day's work.

## Definition of done

- Every text node on both routes measures ≥4.5:1 **in a browser**, not in the token file.
- A zero-note student sees an honest sentence in both columns.
- Keyboard only: drawer traps focus, Escape closes, focus returns, search shows a ring.
- Clean load of `/classroom/recaps` makes **zero** `/data/explanations/` requests, and
  `/flagged` and `/journal` still resolve questions.
- Exactly one list at every width from 375 to 1440.
- No rail target under 44px.
- Re-run `$impeccable audit` (target: 11/20 → 17+/20) and `$impeccable critique`
  (target: 21/40 → 30+/40).

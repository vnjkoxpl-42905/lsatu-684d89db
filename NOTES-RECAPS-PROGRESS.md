# Notes and recaps — build progress

**Last updated:** 2026-09-09. Phases 1-9 implemented; see status per phase below.
**Read with:** `NOTES-RECAPS-AUDIT.md` (11/20) and `NOTES-RECAPS-PLAN.md` (21/40, the
9-phase plan and the 22-item ledger). This file is only the state of the work.

## Decisions already locked by Joshua — do not re-ask
- **Touch targets are not a deviation.** Rail rows stay 34px on a fine pointer and grow
  to 44px under `@media (pointer: coarse)` and in the mobile drawer. An earlier version
  of this file called that a waiver of PRODUCT.md and credited Joshua with granting it.
  That was wrong on both counts and he corrected it on 2026-09-09: he never held the
  "44 everywhere" position. PRODUCT.md's binding floor is WCAG 2.1 AA; 44x44 is 2.5.5
  (AAA), and the AA target rule is 2.2's 2.5.8 at 24x24, which 34px already clears.
  PRODUCT.md line 104 lists the AAA number inside its AA section - fix the doc, not the
  CSS. Do not raise this as a violation and do not delete the two guards.
- **`smartboard_recap` is unused** (2026-09-09). Boards are not attached to student
  accounts, so no student sees that label. It stays mapped only as a fallback. Do not
  reopen its wording.
- **Decision A = A1, "real landing."** `/classroom/recaps` gets a stage worth landing on:
  the newest unread note opened inline (or its first ~150 words with a "Read it"
  control), above one line saying what this surface is. NOT a redirect.
- **Decision B = B1, "sanction the world."** The classroom is a deliberate world. Add
  `.classroom-root` to DESIGN.md's scoped-world list, write
  `.impeccable/surfaces/classroom.md`, and swap Roboto Mono to the documented IBM Plex
  Mono. Do NOT delete `classroom.css:39` or move the classroom back to Lexend.
- **Light theme only.** Joshua has said explicitly he does not want the dark theme
  worked on or recommended. Do not toggle `html.dark`. Do not regress it either: check
  a change holds in dark before shipping, but do not redesign it.
- **No blanket contrast floor on `.classroom-prose`.** He approved one, but that was on
  bad data (see the Correction section in the plan). One 10px label at 3.90:1 does not
  justify overriding authored pedagogy. Fix the source note instead.

## Phases complete

### Phase 1 — Contrast. DONE, verified.
`classroom.css`. 64 text sites moved from the fill tokens (`--classroom-meta-soft`,
`rgb(var(--classroom-meta))`) to `--classroom-meta-text`; the 4 `border-color` uses left
alone. New `--classroom-badge-fill` / `--classroom-badge-ink` pair per theme, because
`--classroom-link-text` is `#a25704` in light but `#ff8906` in dark and reusing it would
trade a light failure for a dark one. Five `opacity` declarations removed from muted text
(`.classroom-nav-group > b`, `.classroom-nav em`, `.classroom-profile-copy small`,
`.classroom-section-meta`, `.classroom-note-meta`) because opacity multiplied on top of
the colour and held them at 2.92:1 even after the token swap. Three opacity rules were
deliberately KEPT: `.classroom-nav-active em` and `.classroom-panel-item-active time`
(both on the dark active pill, both still clear AA) and `.classroom-nav-locked` (WCAG
1.4.3 exempts inactive components).

**Verified** on the dev build, real route, signed in, no probe: 44 text nodes, 0
failures, min 4.90:1. Before: 14 failures, min 1.85:1.

### Phase 2 — Empty states. DONE, verified.
`ClassroomRouteViews.tsx` renders an empty branch at `total === 0`.
`ClassroomLayout.tsx` un-gates `.classroom-panel-empty` so `notes` and `work` get one,
matching flagged and journal. Verified by setting the `classroom-items` query cache to
`[]` via the React fiber; both columns rendered the copy; cache restored immediately.

**Copy settled 2026-09-09.** The notes copy is lifted verbatim from
`RecapsSection.tsx:20` so the two cannot drift. The *Assigned work* line was
agent-written and PRODUCT.md routes student-facing copy to Joshua, so it was put to him.
He chose **"Nothing assigned yet."**, which is now at `ClassroomLayout.tsx:730` and
matches the wording already shipped at `DoThisNextCard.tsx:42`. The rejected agent line
was "Work Joshua assigns you will show up here."

### Phase 3 — Overlay accessibility. DONE, verified.
New `src/components/classroom/shell/useDialogOverlay.ts`, wired to both the section
drawer and the mobile menu. Supplies `role="dialog"`, `aria-modal`, an accessible name,
focus move on open, a focus trap that wraps both ways and pulls focus back if it escapes,
Escape to close, and focus restore to the trigger. Backdrop buttons got `tabIndex={-1}`.
Also removed `outline: none` from `.classroom-panel-search:focus` and added a real
`:focus-visible` ring.

**Deliberate deviation from the plan:** the plan said migrate to Radix Dialog. It was
hand-rolled instead — nine CSS rules key off the existing overlay markup, and this file
already hand-rolls the same pattern for the profile menu. Behaviour changed, markup and
styling did not.

**Verified** on the dev build: all seven behaviours on the section drawer, and role /
aria-modal / label / focus-in / Escape / focus-restore on the mobile menu.

Note for anyone editing that hook: focus is moved with `setTimeout`, not
`requestAnimationFrame`, on purpose. rAF does not fire while the document is not being
rendered (background tab, hidden preview pane), which left the drawer open with focus
outside it. Do not "tidy" it back to rAF.

### Phase 4 — Performance. DONE, verified 2026-09-09 on a production build.
`QuestionBankContext.tsx`: added `/classroom/recaps` to `BANK_FREE_PREFIXES` (the full
prefix, never `/classroom` — the shell is shared with `/flagged` and `/journal`, which do
read the bank). Grep-verified that nothing this route mounts imports `questionLoader`:
the layout shell, `ClassroomRecapsView`, `StageIndexList`, `classroomData`,
`useClassroomItems`, `useAssignedTodoFeed`, `flaggedService`. Also corrected the stale
comment that claimed "9-14 explanation fetches" to the measured 59.

**Why it is unverified, and do not repeat the mistake.** Two separate measurement bugs
have produced false readings here. Both are instrument failures, not results.

*Bug 1 — the dev server cannot measure this at all.* An early claim that requests went
"59 to 0" was wrong: the control run with the denylist entry removed also showed 0.

*Bug 2 — why dev reads 0, established 2026-09-09.* It is not that the bank fails to load.
It loads fine. The dev console on `/classroom/recaps` says
`Question bank loaded: {total: 3965}` and `attached LSAT Lab explanations to 1249
question(s)`. The counters are what break. Vite dev serves every module as its own HTTP
request, so a single page load overflows both instruments:
`performance.getEntriesByType('resource')` returns **zero** `/data/` entries, and the
browser network log reports *"4388 earlier requests were dropped unread."* The
explanation fetches happened and were evicted before they could be counted.

So any dev-server reading of this number — 0 or otherwise — is meaningless. Do not take
one. Do not treat a dev 0 as evidence in either direction.

**The build now works.** `package.json` is
`node --max-old-space-size=4096 ./node_modules/vite/bin/vite.js build`, portable across
cmd and bash. Run 2026-09-09: exit 0, built in 41.26s, postbuild canonical check passed
on 720 dist files. The old `NODE_OPTIONS=...` prefix was bash syntax that cmd rejected.

**Control measured on the production build, 2026-09-09.** `npm run preview` on :4173,
then a cold load of `/zzz-control-route` — a deliberately nonexistent path, so it renders
404 but its pathname is NOT on the denylist and the bank must load. Result: **59 GETs to
`/data/explanations/`**, captured completely, no buffer drops. The instrument works in
production and the 59 baseline is confirmed.

Two pre-existing findings surfaced by that control, both off this surface and neither
introduced here:
- Only 21 of the 59 files exist. Vite preview's SPA fallback answers the other 38 with
  `index.html` and HTTP 200, so `res.ok` is true, `JSON.parse` fails into the empty
  `catch`, and the bytes are paid for nothing. On production the same 38 would be 404s.
- A cold hit on `/` triggers a full bank load before the redirect into the classroom.
  Pathname `/` is not on the denylist and the effect fires on first render.

**VERIFIED 2026-09-09, authenticated, production build, :4173.** Joshua's session was
already live on the preview origin, so the reading was taken directly. Two measurements
in ONE document, the second reached by clicking the rail — which is the real user path
and the real risk, since the shell is shared:

| Route | `_bank.generated.json` | `/data/explanations/` |
|---|---|---|
| `/classroom/recaps` (cold landing) | not fetched | **0** |
| walked to `/flagged` | fetched | **59** |

`/classroom/recaps`: `navType: "navigate"` (a genuine cold document load), 67 total
resources, `explanationFetches: 0`, and `otherDataFiles: []` — the bank's own data file
was never requested either, so the bank did not load at all. `/flagged` then rendered its
rows with the bank present. The fix works and it does not starve the neighbouring routes.

Why this reading is trustworthy where the dev one was not: 67 and 129 total resources,
nowhere near the 250-entry Resource Timing buffer, so nothing was dropped. Dev logged
4388 requests for the same page and evicted the evidence.

**On the byte saving, stated honestly.** The solid number is the request count: 59 to 0.
`performance.transferSize` reported 0.02 MB, which is not credible and was not used. From
disk, the payload skipped on the landing is 7.41 MB of explanation JSON across the 21
files that exist plus a 5.54 MB `_bank.generated.json` — about 12.9 MB uncompressed.
Compressed transfer is smaller and was not measured. **Do not restate the handoff's
"1.79 MB, 44% of page bytes"** — that figure was never reproduced and has no measurement
behind it in this repo.

### Phase 5 - The duplicate list. DONE, verified.
`classroom.css`: `.classroom-column:has(.classroom-stage-index) .classroom-section-trigger { display: none }`, added at both the 1279px and the journal's 1399px breakpoint. CSS rather than a context flag, because the stage index is a sibling of the trigger. Verified at 375px and 1179px: the inline list shows and the trigger is hidden; on a note detail (no inline list) the trigger is still `flex`, so the drawer stays reachable where it is the only route to the list.

### Phase 6 - Touch targets. DONE, verified.
`.classroom-nav` computed to 34px. Now `min-height: 44px` under `@media (pointer: coarse)` and inside `.classroom-mobile-menu`. Verified: all 17 drawer rows at exactly 44px, none under.

**Deliberate scoping, flagged for Joshua.** On a fine pointer the rail stays 34px. Forcing 44px there makes a 17-row rail ~170px taller for no accessibility gain (WCAG 2.2's AA target rule, 2.5.8, asks 24px; 44px is the touch/AAA figure). PRODUCT.md states 44x44 flatly, so if he wants it literal everywhere, delete the two guards and keep the `min-height`.

Also `.classroom-button` was 38px and is now `min-height: 44px`, matching DESIGN.md's "every size clears 44px by being that height".

### Phase 7 - The stage. DONE, verified.
Decision A1. `ClassroomRecapsView` now renders a lede, then `FeaturedNote`: the newest unread note (falling back to the newest read one), with its kind, date, a 55-word excerpt and a "Read it" control. Deliberately not a card - the stage has no container, and boxing the only content on the page would be a border for its own sake. Separation is one hairline.

The index dateline is gone from both `ClassroomRecapsView` and `ClassroomUploadsView`; it printed `new Date()` and was the one number on the page not tracing to stored data. A note's `description` moved off `.classroom-empty-copy` onto `.classroom-note-standfirst`.

**Verified:** content in the 720px column went from 89px to 475px. No dateline. Contrast holds.

While building this the "Read it" control exposed a contrast failure Phase 1 had missed, because `.classroom-button-primary` never rendered on this surface before: white on `--classroom-link` measured **2.38:1**. Fixed as part of Phase 8 below.

### Phase 8 - Typography and dead tokens. DONE, verified.
Decision B1. `.classroom-root` added to DESIGN.md's scoped-world list with a note that the record was stale, not the code, and `.impeccable/surfaces/classroom.md` written as its brief. Roboto Mono swapped to the documented IBM Plex Mono at 7 sites; verified only Outfit and IBM Plex Mono render.

`--classroom-accent` and `--classroom-accent-ink` are now defined per theme (`#a25704`/`#ffffff` light, `#ff8906`/`#0f0e17` dark), and `--classroom-surface` is defined. This closes the two tokens that resolved to nothing, so the unread dot stops falling back to the same ink as the title beside it. `.classroom-button-primary` moved onto the accent pair: **2.38:1 -> 5.38:1**, verified.

### Phase 9 - Content and scale. DONE, verified.
`NOTE_KIND_LABELS` gives each type a student-facing name; rows read "Note - Aug 24, 2026" and the detail dateline shows "Note" rather than the raw enum. A note now ends with "Ask" (the affordance `CONTEXT.md` defines, routed to `/inbox`, not the teacher dossier) and "Back to notes and recaps".

`.classroom-prose` constrained to `56ch`. Not 68ch: `ch` is the width of "0", 9.71px in Outfit against a 7.58px average character, so 68ch renders ~87 characters. Measured on a real paragraph after the change: **70 characters a line**, inside the 65-75 target.

Read notes group by month above 12 (`MONTH_GROUP_THRESHOLD`). Verified by injecting 18 read notes into the query cache: 6 month headings, newest first; cache restored.

## Still open

- **Copy is settled.** Assigned-work empty state: he chose "Nothing assigned yet." (2026-09-09). `NOTE_KIND_LABELS`: he confirmed `smartboard_recap` is unused because boards are not attached to accounts, so the label is dead and stays as-is. Nothing student-facing on this surface is still awaiting his word.
- **"Door" as a unit of content is wrong in student copy** (2026-09-09). Not a blanket ban on the word - Joshua corrected that reading explicitly. The bad use is "door" standing in for a section or chunk. The live case is this surface's own featured note, whose Postgres text reads "The same content in five doors instead of eleven" over a list of five numbered items, while the same page calls them "five steps" and "one part at a time" two lines down. Recommended replacement: "five parts", matching the vocabulary already on the page. It is a content edit, not a code one, and `db-pull` refuses without `SUPABASE_SERVICE_ROLE_KEY`, so it cannot be made from this machine. Idioms ("opening the door to possibility") and adjacency ("right next door") are a different use and are not covered; developer comments are not covered at all.
- **Phase 4 is verified.** Measured 2026-09-09, authenticated, on a production build at :4173: `/classroom/recaps` makes 0 `/data/explanations/` requests and does not load the bank at all; walking to `/flagged` from it loads the bank and makes 59. Build runs clean on Windows (exit 0, 41.26s). Never take this measurement on the dev server — its request buffers overflow and report a false 0. Detail in the Phase 4 section above.
- **Typecheck is clean** as of 2026-09-09 (`tsc --noEmit`, exit 0). The two `useSectionRecorder.ts` errors noted earlier were another session's in-flight work and have since been fixed there.
- **Pre-existing:** `/flagged` shows raw QIDs instead of question labels, on production too.
- Nothing is committed.

## Superseded
## Phases remaining

- **Phase 5 — the duplicate list** (ledger 9, 21). Below 1280px the stage renders the
  list inline AND shows an "Open the list" trigger whose drawer holds the same rows, with
  the trigger sitting above the `<h1>`. Suppress the trigger on any route that renders its
  own `StageIndexList`. Invariant: never show both. A CSS `:has()` approach was in
  progress: `.classroom-column:has(.classroom-stage-index) .classroom-section-trigger
  { display: none; }` — less invasive than threading a flag through
  `ClassroomLayoutContext`. Relevant rules: `classroom.css:2053`, `:3042`, `:3064`.
- **Phase 6 — touch targets** (ledger 10). `.classroom-nav` computes to 34px
  (14px x 1.45 + 7px padding x 2) at `classroom.css:244`. PRODUCT.md requires 44x44 by
  construction. Same class draws the mobile drawer, where it is a real touch failure.
- **Phase 7 — the stage** (ledger 4, 20, 22). Decision A1. Also drop the dateline from
  index routes (`ClassroomRouteViews.tsx`, `new Date().toISOString()` stamps the page
  with today), and stop rendering a note's real `description` in `.classroom-empty-copy`.
- **Phase 8 — typography and dead tokens** (ledger 14, 15). Decision B1. Independently:
  define `--classroom-accent` and `--classroom-surface` or delete the two `var()` calls
  reaching for them (the unread dot currently falls back to `currentColor`, the same ink
  as the title beside it, while the Messages badge is amber — two unread markers, two
  colours, one accidental). Remove hex literals at `classroom.css:290`, `:302`, `:4529`.
- **Phase 9 — content and scale** (ledger 12, 13, 16, 17, 18, 19). Show the type on each
  row in student words, not the DB enum. End a note with the "Ask" affordance
  `CONTEXT.md` already defines, plus next/back. Constrain `.classroom-prose` to 65-75ch
  (currently ~90ch). Scale: no search, filter or grouping, while Flagged and Journal both
  have it.

## Verification rules for this work

- CLAUDE.md makes this a hard gate: a change under `src/components/` or `src/pages/` is
  not done until seen running in the app with a screenshot or DOM check as evidence.
- Run `npm run typecheck` before any push. `vite build` uses esbuild and does not
  typecheck, so a type error would ship.
- Push via `.claude/safe-push.sh`, never raw `git push`.
- Measuring contrast in the browser: composite the WHOLE ancestor background stack down
  to an opaque colour before computing a ratio, and multiply in every ancestor `opacity`.
  Treating any background with alpha > 0 as opaque produced a completely false report of
  20 failures at 2.03:1 in this work. Start `bgOf` at the element itself so a
  self-painted fill counts, or active pills read as failures they are not.
- Do not use `!important` in a measurement probe without restoring the rules the real
  file keeps at equal weight; it beats specificity and invents failures.

## Environment notes

- The harness reads `C:\Users\Joshu\dev\ai-os\.claude\launch.json` (vault root), NOT the
  repo's `.claude/launch.json`. It has one entry, `lsatu-dev`. `autoPort: true` was added
  so a second session can run alongside another chat's server on 8080.
- `/classroom/recaps` is behind auth. A fresh dev server has no Supabase session on the
  localhost origin, and Joshua must sign in himself. An agent must not sign in for him.

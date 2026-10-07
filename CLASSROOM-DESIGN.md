# Classroom — Design Specification

Status: **locked for build** · Date: 2026-07-26 · Author: Jay 2
Audit and benchmark: `~/ai-os/brainstorms/2026-07-26-classroom-redesign.md`
Source teardown: `~/ai-os/research/2026-07-26-jeffsu-org-teardown.md`

---

## 0. Scope lock — read this before touching anything

**`/classroom` is the only page that changes. Nothing else in the app is edited.**

This is the hardest constraint in the document and it overrides every other instruction here. If a change in this spec appears to require editing a shared file, stop and raise it rather than editing.

**Do not touch:**
`src/components/mainhub/StudentShell.tsx` · `src/components/mainhub/MainhubSidebar.tsx` · `src/components/mainhub/StudySidecar.tsx` · `/mainhub`, `/bootcamps`, `/inbox`, `/practice`, `/journal`, `/activities`, `/schedule`, `/booking` or any other page · the global token blocks in `src/index.css` · the shared scales in `tailwind.config.ts` · `src/contexts/ThemeContext.tsx`.

**May touch:**
`src/pages/Classroom.tsx` · `src/components/classroom/**` · a new `src/components/classroom/shell/**` · one route move in `src/App.tsx` · **additive-only** entries in `src/hooks/useClassroomItems.ts` and `src/lib/classroomItems.ts` · one new scoped stylesheet · `index.html`'s font link (additive).

**Three approved exceptions**, each explicitly authorised on 2026-07-26 and each carrying work outside `src/pages/Classroom.tsx`:
1. **`profiles.test_date`** — one nullable `date` column, plus a capture point in onboarding and an edit control in Profile. Migration required.
2. **Route move** — `/classroom` moves out of the `StudentShell` layout route in `src/App.tsx`. This is a move, not an edit: `StudentShell` itself is not modified.
3. **Day-0 seed** — one `classroom_items` row of type `note` created on enrolment.

### Why the route moves out of the shell

`/classroom` currently renders inside `StudentShell` (`src/App.tsx:339`), which already draws a 240px `MainhubSidebar` and docks `StudySidecar` at 360–640px on the right. The instruction is that the Classroom be identical to the jeffsu.org layout, which includes jeffsu's own sidebar — and that the shell not be edited. Both at once, inside the shell, puts **two sidebars on screen** and fails gate G4.

`StudentShell`'s own docstring establishes the escape hatch: *"Actual LSAT question surfaces (Drill, sections, in-bootcamp runners) are routed OUTSIDE this shell and take over the full viewport, unchanged."* The Classroom joins them. It owns its full frame, one sidebar, exact 720px measure at every width, and the sidecar collision disappears without a line of shell code changing.

Consequence, accepted: the Classroom's own sidebar must carry the app's navigation, and leaving the Classroom returns the student to the existing grey shell. Two chromes coexist in the product until a later decision unifies them.

---

## 1. What this page is

The Classroom is the first surface a paying 1:1 student lands on and the one they return to. Students go there first because "classroom" is the word they already have a mental model for: homework, notes, the thing my teacher gave me. That mental model is an asset and the name stays.

It is built to home-OS standard: everything the student can do is reachable from here. Whether it formally replaces the Foyer as primary navigation is a separate call and is deliberately not decided by this spec.

**One sentence:** the Classroom is where a student sees that a specific human is paying attention to them, and what to do in the next twenty minutes.

---

## 2. Why the current page fails

The current page fails **7 of 7 Tier 1 correctness gates**. This is not a polish problem. Full findings in the audit; the three that drive the redesign:

- The highest-contrast element on the page is **Sign out**, louder than "Do this next" and louder than "Start"
- Sections are ordered most-full to most-empty, so scrolling is a descent into nothing, and the page **terminates in three consecutive empty grey boxes**
- Three navigations compete: a sidebar, a breadcrumb, and the page's own header, with "Classroom" written 3× and a back button duplicating a sidebar link

And the finding that sets the effort estimate: **the data is already there.** `useStudentAnalytics` returns streak current/longest/goal. `useBootcampProgress`, `useStudentBooking`, `useInbox`, `useCurrentWeeklyPlan`, `useStudentExternalUploads` all exist and are wired. The upload pipeline already accepts `pt_result`, `lr_section`, `rc_section`, `7sage_analytics` and `score_report` with a real parse status. `/practice` already renders all-time practiced count, accuracy, and recent sessions. **The Classroom uses none of it.**

---

## 3. Structure — single column, exact source fidelity

**Decision: stay at the source's 720px `.prose` cap. One column. No right-hand rail.** Keep it as identical to jeffsu.org as possible and change nothing structural — only the content differs, being Joshua's and the student's. The rail folds into the stream as ordinary sections.

Because the page now renders full-viewport (§0), 720px is achievable at every width with no compromise.

```
┌────────┐┌────────────────────────────────┐
│ SIDE   ││  THE DECK                      │
│ BAR    ││  Favour · 42 days to test      │
│        ││                                │
│ w-80   ││  ● Joshua              2d ago  │
│ rounded││    "Your conditional reasoning │
│ card   ││     is holding up. Watch       │
│ in 8px ││     pacing on RC."   [ Reply ] │
│ gutter ││                                │
│        ││  Next session ····· TUE 4:00PM │
│ nav    ││                                │
│ groups ││  LECTURE NOTES                 │
│        ││  Causation: the alibi ·· JUL 23│
│ ────── ││  Conditional logic ····· JUL 17│
│ theme  ││                                │
│ toggle ││  DRILLS DONE                   │
│ account││  First Sentence ······· 18/20  │
└────────┘│  Causation set ········ 14/20  │
          │                                │
          │  UP NEXT                       │
          │  Causation Day 3 ····· DUE TUE │
          │                                │
          │  RECENT ACTIVITY               │
          │  ...                           │
          └────────────────────────────────┘
                    720px
```

**The deck** owns identity and orientation — name, days to test. Answers "where am I" above the fold.

**The stream** is everything else, as leader rows in one column.

### The rule that fixes the fall-off
**A section with no content does not render.** No dashed box, no "nothing here yet", no placeholder. This inverts today's behavior, where six of eight sections render a dedicated empty box.

### How gates G2/G3 are met without a rail
The rail was the original fix for the fall-off because it was always populated. Without it, the ordering does the work:

1. **The always-populated blocks sit at the top.** Joshua's latest word is guaranteed by the day-0 seed (§7); the next session is present for every student who has booked.
2. **Conditional blocks sit below them** and are absent, not empty, when they have nothing.

The result is that the page **gets shorter, never emptier**. G2 and G3 both hold with no structural deviation from the source.

### Fidelity constraints, locked
- Content column stays `720px` (`.prose`)
- Sidebar stays `w-80` (320px), a rounded bordered card in an 8px gutter, `fixed` below `lg` and `sticky` at `lg` — **this is the Classroom's own sidebar, built new inside `src/components/classroom/shell/`. It is not `MainhubSidebar` and `MainhubSidebar` is not modified.**
- Vertical rhythm stays `my-24 lg:my-20`
- No new structural elements the source does not have

---

## 4. Surface system — jeffsu.org, copied warm

**Decision: the palette is taken verbatim from jeffsu.org, warmth included.** This is a deliberate, scoped override of the standing no-beige rule, which continues to apply to *decorative* warm metallics everywhere else.

**Scoping is mandatory.** Every token below is declared under a `.classroom-root` scope in a new stylesheet, never in the global `:root` block of `src/index.css`. No other page may inherit these values.

### Tokens — light

| Token | Value | Use |
|---|---|---|
| `--paper` | `#FFFFFF` | page and sidebar base |
| `--paper-warm` | `#FEFCF7` | gradient start |
| `--paper-cream` | `#F6EBE1` | soft fill |
| `--line` | `#F3E3D6` | **every border in light mode** |
| `--ink` | `#43403C` | primary text |
| `--ink-muted` | `#B3B0AC` | secondary text — source value, kept verbatim |
| `--rule` | `#E3E6E8` | footer rules |

### Tokens — dark

| Token | Value | Use |
|---|---|---|
| `--paper` | `#0F0E17` | page background |
| `--paper-deep` | `#0A0913` | sidebar — **darker than the page** |
| `--paper-raised` | `#1C1917` | header, raised surfaces |
| `--line` | `#17161C` | every border in dark mode |
| `--line-strong` | `#44403C` | emphasis border |
| `--ink` | `#FFFFFE` | primary text |
| `--ink-muted` | `#A7A9BE` | secondary text (passes AA on `#0F0E17`) |
| `--ink-faint` | `#A8A29E` | tertiary text |

Note the deliberate inversion: in light mode the sidebar sits at the same value as the page and is separated by a border alone; in dark mode it sits *below* the page. Depth comes from the direction of contrast, not from shadow.

### Accent
`#FF8906`. One accent, used for the primary action and live state only. Semantic correct/incorrect stay separate and are never decorative.

### Fidelity rule
**The palette is copied verbatim. No deviations.** An earlier draft darkened `--ink-muted` to `#8A8681` for contrast; that was reverted on Joshua's direction. `#B3B0AC` on `#FFFFFF` measures about 2.2:1 and does not meet WCAG AA for body text — this is a known, accepted tradeoff, not an oversight. Raise it as its own decision rather than quietly adjusting the token.

### The crossfade — the signature technique
Never switch `background-color`. Stack two gradient layers and cross-fade their opacity. Both share the same angle and the same 40% alpha, so a theme change reads as *lighting shifting on one surface* rather than two designs swapping.

```css
.bg-light { background-image: linear-gradient(161.15deg,
              rgba(254,252,247,.4) 12.73%, rgba(243,227,214,.4) 72.95%); }
.bg-dark  { background-image: linear-gradient(161.15deg,
              rgba(41,37,36,.4)   12.73%, rgba(68,64,60,.4)   72.95%); }
```

### Borders
Flat `1px solid var(--line)` — correct here, because `--line` is a warm cream rather than a dead grey. The original's restraint depends on it. No inset-light-edge, no glow, no grain: the source uses none of them.

**This formally retires benchmark gate C3** ("depth from elevation, not hairlines; no 1px solid grey as the primary separation device"). C3 was written against the old grey page and is incompatible with the chosen reference. Retired the same way C4 was, on the record, not silently.

**Benchmark gate C5** ("shares a visual system with `/mainhub`; the two cannot look like different products") is **suspended for this build**, not met. The Classroom will not match `/mainhub` — that is the direct and accepted consequence of scoping the redesign to one page. Revisit when a decision is made about unifying the two chromes.

---

## 5. Type

The current page has effectively two sizes, with section headers *smaller and dimmer than their own content*. That inversion is the direct cause of the flatness.

**Correction to an earlier draft:** Outfit is **not** the current LSAT U shell font. `src/index.css:178` sets Lexend first, with an in-file comment noting the app moved off Outfit; Outfit survives only in a scoped bootcamp block. `index.html:17` already loads Outfit and IBM Plex Mono.

**Decision: exact source type — Outfit and Roboto Mono.** Roboto Mono is added to the `index.html` font link (the one additive touch outside the Classroom). Both families are applied **only under `.classroom-root`**; the rest of the app stays on Lexend and is unaffected.

| Step | Family | Size / weight | Use |
|---|---|---|---|
| Display | Outfit | 40 / 600, tight | deck headline |
| H1 | Outfit | 28 / 600 | page title |
| H2 | Outfit | 20 / 600 | section headers — **larger than their content** |
| Body | Outfit | 15 / 400, 1.6 | descriptions |
| Meta | **Roboto Mono** | 12 / 500, opacity .7 | timestamps, counts, status |
| Label | **Roboto Mono** | 11 / 500, `0.04em`, caps | eyebrows |

The mono-for-metadata rule is doing most of the work. Small mono beside geometric sans is what produces the editorial, indexed, documented feel — and it fixes the hierarchy inversion for free, because meta stops competing with headings.

Stats use `font-variant-numeric: tabular-nums`.

### The leader row
The pattern that reads as paper you can click. Title left, dotted leader, mono status right.

```css
.row   { display:flex; align-items:center; gap:8px; min-width:0; position:relative }
.title { margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.dash  { flex:1 1 auto; height:1px; align-self:center;
         background-image: repeating-linear-gradient(to right,
           var(--line) 0 4px, transparent 4px 8px) }
.status{ font-family:"Roboto Mono",monospace; font-size:.75rem; opacity:.7; white-space:nowrap }
```

Mobile: `flex-direction:column`, dash hidden, status left-aligned.

### The whole-row anchor
Fixes finding F11. The row looks like a line of text; the entire block is the hit target.

```css
.row > a.cover { position:absolute; inset:0; opacity:0 }
```

---

## 6. Motion and theme

**The source has no animation library at all** — no GSAP, no ScrollTrigger, no scroll reveals, no parallax. All perceived polish is `duration-300` on every themed element.

Match that restraint. One transition token, 300ms, applied to theme-reactive properties. Optional entrance stagger of 40ms on first paint only. Nothing loops, nothing exceeds 400ms, everything respects `prefers-reduced-motion`.

### Theme — use the existing provider, do not replace it

**Correction to an earlier draft.** The previously specified inline init script is incompatible with the app on three counts: `ThemeContext` stores under `lsatu-theme` (not `theme`), applies a `light` class (dark is the absent state, not the added one), and has no three-way auto mode. Shipping that script would fight the provider.

**Decision:** the Classroom **consumes `ThemeContext` as-is** and derives its own scope from the same signal. No new storage key, no new init script, no edit to `ThemeContext.tsx`. Three-way Light/Dark/Auto is out of scope for this build; the Classroom's theme toggle drives the existing two-way provider.

```css
.classroom-root            { /* dark tokens — app default state */ }
:root.light .classroom-root{ /* light tokens */ }
```

---

## 7. Content

Joshua's brief: **lecture notes he posts, the drills the student has done and is about to do, messages, and anything else that earns its place.** Everything renders as a leader row unless noted.

**Every hook name below has been verified against the codebase.** An earlier draft cited several exports that do not exist; those are corrected here and the wrong names are called out so they are not reintroduced.

### Verified data sources

| Need | Real export | Notes |
|---|---|---|
| Classroom items | `useClassroomItems()` | `src/hooks/useClassroomItems.ts:51` |
| Weekly plan | `useCurrentWeeklyPlan()` | **not** `useWeeklyPlan` |
| Uploads | `useStudentExternalUploads()` | **not** `useExternalWorkUploads` |
| Next session | `useStudentBooking()` → `redemptions[]` | `start_at`, `end_at`, `status`, `meet_url`, `can_reschedule` |
| Assignments | `useStudentAssignments()`, `useStudentTAAssignments()` | dedupe by source id |
| Analytics / streak | `useStudentAnalytics()` | `analytics`, `streak{current,longest,questionsToday,goal,goalReached}` |
| Bootcamp | `useBootcampProgress(opts)` | takes an options object |
| Messages | `useInbox()`, `useConversationMessages(id)` | |
| Wrong answers | `getWAJEntries(class_id, filters?)` | `src/lib/wajService.ts` |
| Session log | `useStudentSessions(studentId)` | `student_sessions`; admin-authored |

**Do not use `useSessionBundles` as a read source.** It exports only mutations (`useSynthesizeBundle`, `useUpdateBundle`, `useApplyPartPatch`, `usePublishBundle`). It cannot supply "Joshua's latest word."

### The stream

**Joshua's latest word** — his most recent real message or recap line, verbatim, with a reply affordance. Always present. This is the thing no reference site could give us and the reason a student feels someone is paying attention.
`useInbox` + `useConversationMessages`, falling back to the most recent `session_recap` / `note` from `useClassroomItems`.

**Day-0 guarantee.** On enrolment, seed one `classroom_items` row of type `note`, authored by Joshua, carrying a real welcome in his voice (route the copy through `wiki/teaching-voice.md`). This is genuine authored content, not a placeholder, so the block is truthfully populated from the student's first minute and the ordering fix never collapses.

**Next session** — `useStudentBooking().redemptions`, earliest future `start_at`. Absent when the student has never booked; the deck then carries a single orange "Book your first session" action.

**Lecture videos** — **deferred in this build.** Hosting is unresolved and lecture-length mp4 in Supabase storage is a cost commitment that cannot be walked back once students hold the links. Ship the type and the slot, not the player:
- add `lecture_video` to the `ClassroomItemType` union at `src/hooks/useClassroomItems.ts:5` (additive)
- add a case to `resolveItemRoute` at `src/lib/classroomItems.ts:126` (additive)
- store `videoUrl`, `posterUrl`, `durationSeconds` in the existing `metadata_json` column, so no migration is needed
- design the 720×405 full-bleed slot in the mockup so the composition accounts for it

When hosting is settled, the player reuses the mechanism in `src/bootcamps/fallacy-flaw-v2/components/VideoCard.tsx` (native `<video>`, mp4 `<source>`, `poster`, `onError` fallback), restyled to source restraint: poster at rest, one centered play affordance, `1px solid var(--line)`, title in Outfit below with duration and date in Roboto Mono. No YouTube or Loom embed, no third-party player.

**Lecture notes and recaps** — what Joshua posts after teaching. The single most valuable *text* on the page and currently buried at the bottom under an empty box. Promote it. Rows read: note title, dotted leader, date in mono.
`useClassroomItems` (`session_recap`, `smartboard_recap`, `note`, `announcement`), rendering `content_markdown` / `content_html`.

**Inline images and GIFs in notes** — new, and cheap. `content_markdown`/`content_html` already store whatever Joshua writes; the renderer just has to display images at full column width with `1px solid var(--line)` and the shared radius, GIFs included. jeffsu.org leans on inline imagery throughout, so this is fidelity as much as feature. No schema change, no upload pipeline — it uses the storage paths already in use for classroom content.

**Drills done** — what the student has completed, with how it went. Title, leader, mono result (`18/20 · 90%`). Honest about weak results too; no hiding a 40%.
`useStudentAnalytics` (attempts-derived) plus guided-drill assignment `status` + `score`.

**Drills up next** — what is assigned and waiting. Title, leader, mono status (`NOT STARTED`, `DUE TUE`, `IN PROGRESS`). Merges today's three separate sources into one queue.
`useStudentAssignments`, `useStudentTAAssignments`, `listAssignmentsForStudent` — **deduplicated by source id**, which fixes finding F12.

**This week** — the published plan, day by day, when one exists. Absent entirely when it does not. `useCurrentWeeklyPlan`.

**Bootcamp** — Day N of M with a real progress bar. Absent when not enrolled. `useBootcampProgress`, `metadata_json.progress`.

### Confirmed additions

**Wrong-answer queue** — a live count and one click into the review surface. The highest-value thing in the product, today a caption with no affordance (F11). `getWAJEntries`.

**Upload status and submission** — the parse pipeline already supports `pt_result`, `lr_section`, `rc_section`, `7sage_analytics`, `score_report` and `drill_result` with live `processing_status` (`uploaded` → `processing` → `parsed` / `needs_review` / `failed`) and `applied_to_analytics`. Surface both halves: a way to submit a practice test or a section, and honest live state on what has been received and read. This is entirely existing capability that the Classroom currently ignores. `useStudentExternalUploads`.

**Consistency** — days active over the last 14, honest about gaps rather than punishing them. `useStudentAnalytics`. Deliberately not a streak flame.

**Accuracy sparkline** — one modest, honest line from real attempts. No projection, no trend claim beyond what the data shows. `useStudentAnalytics`.

### Order in the column

Fixed, and load-bearing — this ordering is what replaces the rail as the fall-off fix.

1. **Deck** — name, days to test
2. **Joshua's latest word** — always present via the day-0 seed
3. **Next session** — or "Book your first session"
4. **Lecture video** — conditional; largest object on the page when present (slot only in this build)
5. **Lecture notes** — conditional, images and GIFs inline
6. **Drills done** — conditional
7. **Up next** — conditional
8. **This week** — conditional
9. **Bootcamp** — conditional
10. **Wrong-answer queue** — conditional on having wrong answers
11. **Uploads** — submit control always present; parse rows conditional
12. **Consistency and accuracy** — populated once the student has done anything

### Explicitly rejected

- **Admission predictor.** Requires GPA, cycle data, and school-level admit distributions the app does not have and cannot honestly obtain. Any number would be invented. Violates the no-fake-data rule outright.
- **Live 7Sage sync.** That data comes from scraping Joshua's tutor account, not the student's, so it cannot be a student-facing live feature. The honest path is the upload pipeline, which is already in.
- **Separate calendar module.** Next session plus This week already answer it; a month grid at 720px is noise.
- **Knowledge graph.** Genuinely valuable and genuinely its own build. Deferred, not rejected.
- **Streak flames and badges.** Manipulative for an adult with a hard deadline, and they punish the rest day a good tutor prescribes.
- **Projected score.** Cannot be produced honestly from available data.

---

## 8. Navigation

The Classroom now owns its full frame, so it owns its navigation. This resolves the triple-navigation conflict by removing two of the three.

- The page **does not** draw a top header bar. No duplicate "Classroom" title, no "← Main Hub" back button.
- **Sign out moves into the account control at the foot of the sidebar** and is never a top-level element (gate G1).
- The current surface is named **exactly once** on screen (gate G4).
- Every row is a real link with a visible affordance at rest, not on hover (gate G6).

### Sidebar nav groups

Everything the student can reach, grouped jeffsu-style. This is what makes the page a hub and fixes P4 and the routing half of F1.

| Group | Items |
|---|---|
| *(top)* | Classroom |
| Study | Drill · Practice Hub · Bootcamps · Activity Centre |
| Review | Wrong Answer Journal · Flagged · Analytics |
| Admin | Messages · Schedule · Booking · Profile |
| *(foot)* | Theme toggle · Account (with Sign out) |

Visibility is filtered by `useUserPermissions` using the same flags `MainhubSidebar` uses — read the flags, do not import or modify the component.

---

## 9. Verification

Not done until seen running, per the repo's hard gate.

1. Signed in as a student in-browser, screenshot at narrow / mid / wide
2. **Scope check first** — `git diff --stat` must show no changes to `StudentShell`, `MainhubSidebar`, `StudySidecar`, `ThemeContext`, or any page other than the Classroom. A diff that touches them fails regardless of how the page looks.
3. **Regression check** — `/mainhub`, `/practice` and `/inbox` load and look exactly as before, in both themes
4. **Squint test** for G1 — the next action must dominate; if Sign out is visible at all, it failed
5. **Empty-state test** for G2/G3 — view as a student with zero assignments, zero plan, zero recaps; the page must still be worth being on
6. **Blur test** for C1 — greyscale and blur a screenshot; four hierarchy levels must remain separable
7. **Data trace** for G5 — every number on screen mapped to a named hook from the §7 table
8. `npm run typecheck` clean before any push
9. Re-score all 7 Tier 1 gates and record the result

---

## 10. Open

- **Video hosting** — blocks the player, not the build. Supabase storage is the obvious path and the obvious cost risk.
- **Foyer's fate** and whether the two chromes ever unify — deferred, Joshua's call
- Benchmark gate C5 is suspended, not met; it needs a real resolution when the chrome question is answered

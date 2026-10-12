# Surface brief: the classroom (`.classroom-root`)

**Scope.** Everything behind the `.classroom-root` wrapper: the rail, the section list,
the stage, and the routes under `/classroom`, `/flagged` and `/journal` that render
inside that shell. Not the bootcamps or the Activity Centre worlds, which have their own
wrappers.

**Register.** Product. Design serves the work; the student is here to read what their
coach wrote and to find the next thing to do.

**Status.** Sanctioned world, added to DESIGN.md's scoped-world list on 2026-09-08 by
Joshua's decision. The audit found the classroom running on its own typeface and a warm
palette while the app-wide record described the Workroom as neutral and Lexend-only. The
decision was that the code was right and the record was stale. This file is the record
catching up.

## What makes it its own world

**A warm paper ground, not the Workroom's neutral.** `--classroom-page` is `#ffffff`
with `--classroom-line` at `#f3e3d6` and `--classroom-hover` a warm translucent cream.
The rail reads as a study rather than an admin panel, and both independent design
assessments in the 2026-09-08 audit named that warmth as a genuine asset rather than
drift.

**Outfit, not Lexend.** `classroom.css` sets `font-family: "Outfit"` on the wrapper. The
app-wide Workroom face is Lexend, and Lexend renders nowhere inside the classroom. That
is deliberate as of this brief. Outfit is also the question lock, so LSAT text and the
room it sits in share a face, and a passage does not change shape when the student moves
between reading a note and reading a stimulus.

**IBM Plex Mono for instrument labels.** The rail group labels, the chevrons, the brand
lockup and the unread badge. Swapped from Roboto Mono on 2026-09-08: Roboto Mono was
undeclared anywhere in the design record, and IBM Plex Mono is the mono this project
already documents and already loads.

## Tokens this world owns

| Token | Light | Dark | Use |
|---|---|---|---|
| `--classroom-page` | `#ffffff` | `#0f0e17` | the ground |
| `--classroom-surface` | `#ffffff` | `#0a0913` | panel and card ground |
| `--classroom-ink` | `#43403c` | `#fffffe` | primary text |
| `--classroom-ink-body` | `#43403c` | `#e5e5e5` | body copy |
| `--classroom-meta-text` | `#6d6a67` | `#a7a9be` | **any text that is muted** |
| `--classroom-meta-soft` | `rgba(67,64,60,.4)` | `#a7a9be` | **fills and borders only, never text** |
| `--classroom-line` | `#f3e3d6` | `#17161c` | hairline separation |
| `--classroom-line-strong` | `#9c8f85` | `#646176` | a border that is itself the affordance (WCAG 1.4.11) |
| `--classroom-line-on-tint` | `#8a7d72` | `#7a7789` | the same job, for a control whose ground is a tint rather than the page |
| `--classroom-accent` | `#a25704` | `#ff8906` | a fill that carries text: primary button, unread badge, unread dot |
| `--classroom-accent-ink` | `#ffffff` | `#0f0e17` | the label on that fill |
| `--classroom-link` | `#ff8906` | `#ff8906` | **decorative fills only** |
| `--classroom-link-text` | `#a25704` | `#ff8906` | orange that carries words |

## Named rules

**The text/fill split is the load-bearing rule here.** `--classroom-meta` and
`--classroom-meta-soft` are tuned as fills and measure 1.85:1 and 2.10:1 as text on the
page. Every muted *word* resolves from `--classroom-meta-text`. The same split governs
`--classroom-link` and `--classroom-link-text`. Getting this wrong put every date, every
rail group label and the unread badge below the AA floor for months.

**Opacity multiplies against the colour.** Swapping a token is not enough if an
`opacity` sits on the same rule. `.classroom-nav-group > b` was `#6d6a67` at `0.7` and
still measured 2.92:1. Muted text carries its colour in the token, not in an alpha.

**A themed pair, not a shared colour, for anything on an accent fill.** The amber that
works on the light ground is `#a25704`; on the dark ground it is `#ff8906` with near-black
on top. Reusing one value across both themes trades a light failure for a dark one.

**The section list is reached from the chrome, not from the reading column.** The
"Open the list" trigger that used to sit inside `.classroom-column` was removed on
2026-09-09. Its stated justification - that on a detail route "nothing else reaches the
list" - was not true: between 1024px and 1279px the sidebar is fully on screen and its
own section item runs the same `openSection`, which opens the same drawer; and every
note already ends with "Back to notes and recaps". It cost 48px plus a 32px margin above
the article’s own dateline and h1, which measured 23% of a 390px screen and 25% of an
1100px one before a word the coach wrote.

What carries the job now: the sidebar above 1023px, and below it
`.classroom-mobile-bar-trigger`, the sticky bar’s section name promoted to a button. The
bar is sticky where the trigger was not, it names the section where the trigger said only
"Open the list", and it puts the room control and the section control in one row instead
of stacking two identically styled boxes that a student could not tell apart. The
index/detail split is `activeSection && activeId` in React rather than
`:has(.classroom-stage-index)` in CSS: an index route keeps a plain label, because a
control that opens a copy of what is on screen is still the no-op this shell removed once
before.

**A control whose border is its only edge uses `--classroom-line-strong`.** The warm
hairline `--classroom-line` measures 1.25:1 against the page and `--classroom-trigger`
measures 1.03:1, so a button built from that pair has nothing at 3:1 telling a student it
is a button. PRODUCT.md makes 3:1 on the visual boundary of an interactive control a
binding floor. `--classroom-line-strong` exists for this and measures 3.14:1 light and
3.21:1 dark; before 2026-09-09 it appeared once in 5,101 lines. Every interactive control
in this stylesheet now uses it: the mobile menu button, both `.classroom-button` variants,
sign-out, the overlay close, the drawer search, the account panel’s inputs, select and
ghost button, the announcement button, the toggle track and its knob, the journal and
review choices,
the textarea, the review control, and the five orientation controls. A rule is a control
if it carries `cursor: pointer`, `resize`, or an input/select/textarea selector; a scan on
that test returns zero controls left on the hairline.

**`--classroom-line-strong` is measured against the page and the panel, so a control on a
tinted ground takes `--classroom-line-on-tint` instead.** The two figures above are the
ratios against `--classroom-page` and `--classroom-surface`. They do not carry over to a
control sitting on something else. The toggle knob is the one case: it sits on the track,
which is `--classroom-hover` composited to `rgb(251,247,243)` light and `rgb(33,31,35)`
dark, and `--classroom-line-strong` read 2.68:1 there while reading 3.14:1 six pixels
away on the panel. Note the direction reverses between themes - the tinted ground is
darker than the panel on light and lighter than it on dark, so the token is darker than
`--classroom-line-strong` on light and lighter on dark. Measured 2026-09-09 on the
production build: knob border 3.75:1 against the track in both themes, 3.99:1 light and
4.55:1 dark against the knob fill. Before adding a third border token, check whether the
control's ground is genuinely a new one; two is the whole set.

`--classroom-line` stays what it always was: hairline separation between things, not the
edge of a control. It still carries the cards, the panels, the callouts, the prose media,
`.classroom-choice` (an `<li>` in an `<ol>`, not a button), `.classroom-review-correct-answer`
(a read-only display box, split out of the rule it used to share with the live control),
`.classroom-orientation-list-row` and `.classroom-orientation-day` (both `<div>`s).

**A border-colour change is not a focus indicator.** Three fields shipped
`outline: none` with only a border tint underneath: `.classroom-textarea`,
`.classroom-orientation-input` and `.classroom-review-control`. PRODUCT.md asks for a
visible focus indicator on every interactive element, and a tint that is now the same
colour as the rest border is no indicator at all. All three draw
`outline: 2px solid var(--classroom-ink)` on `:focus-visible`, the pattern
`.classroom-panel-search` already documented. No `outline: none` remains in this file.

**A focus ring uses `--classroom-link-text`, not `--classroom-link`.** The decorative
orange `#ff8906` measures 2.38:1 on the light ground, under the 3:1 a focus indicator
owes. `--classroom-link-text` is the themed pair that passes: 5.38:1 on light, the same
`#ff8906` on the near-black dark ground. The two focus rings this rule used to list as
open - `.classroom-icon-button` and `.classroom-overlay-close` - now ring in
`--classroom-link-text`; no `outline` in this file resolves from `--classroom-link` any
more.

**And so does a link inside a note.** `.classroom-prose a` was `--classroom-link`, which
put the one place a student reads what their coach wrote at 2.38:1 - the same text/fill
split that held every date below the floor for months, still live in the reading column
after the dates were fixed. Now `--classroom-link-text`, measured in the browser against
the live sheet on 2026-09-09: **5.38:1 light, 8.06:1 dark**. The rule also set
`text-decoration: none` and moved the colour to `--classroom-ink` on hover, so the link
was identifiable by colour alone and stopped being identifiable at all under the cursor
(WCAG 1.4.1). Underlined in both states now, `text-underline-offset: 2px`.

The last three uses of `--classroom-link` that carried words were moved to
`--classroom-link-text` on 2026-09-11: `.classroom-message-link` (a 16px link in
Messages, which is where the note's own Ask button lands),
`.classroom-annotate-button-active` (its `border-color` is a fill and keeps the
decorative token), and `.classroom-orientation-eyebrow` (11px at weight 600, which is
not large text). No `color:` in this file resolves from `--classroom-link` on anything
but an icon now; the remaining uses are icons, fills and `border-color`, and stay where
they are.

**Overlays are dialogs.** The section drawer and the mobile menu go through
`useDialogOverlay`: `role="dialog"`, `aria-modal`, an accessible name, focus moved in on
open, a focus trap that wraps both ways, Escape, and focus restored to the trigger. Focus
is moved on a timer rather than `requestAnimationFrame`, because rAF does not fire while
the document is not being rendered.

**Index routes carry no dateline.** It printed `new Date()`, so it stamped the page with
the day of the visit while occupying the slot that, on a note, holds the day Joshua wrote
it. Every number on a surface traces to stored data or it does not appear.

**The 44px touch floor is scoped to touch, and this is not a deviation.** `.classroom-nav`
computes to 34px on a fine pointer and grows to 44px under `@media (pointer: coarse)` and
inside the mobile drawer. PRODUCT.md's binding floor is WCAG 2.1 AA; 44x44 is 2.5.5,
which is Level AAA, while the AA target-size rule is 2.2's 2.5.8 at 24x24. A 34px row
clears the binding floor. PRODUCT.md line 104 lists the AAA figure inside its AA section,
which is a doc imprecision to fix there, not a defect here. Do not raise this as a
violation, and do not attribute a waiver to Joshua - there is nothing to waive.

**The switch's on-track is its own token, because `--classroom-active` was too close
to the off-track on dark.** Off-track versus on-track measured 9.68:1 on light but
1.51:1 on dark: `--classroom-hover` over the dark panel lands at `rgb(33,31,35)` and
`--classroom-active` is `#3d3c48`, so the 16px knob translation was carrying the state
by itself. Not a 1.4.11 failure, since position is non-colour information, but state
should not rest on one channel in one theme only. `--classroom-toggle-on-track` is
`#43403c` on light, which is `--classroom-active` unchanged, so light renders exactly as
before; dark is `#6f6d80`, a lighter sibling in the same hue. Scoped to this control so
the other 17 `--classroom-active` rules keep their colour. Measured 2026-09-09 on the
production build: off-vs-on 3.25:1 dark and 9.68:1 light, with the on-state knob at
3.93:1 against its track.

**A note body stored as markdown is rendered as markdown.** `content_markdown` was
printed as `<p>{item.content_markdown}</p>`. Markdown is newline-significant and
`.classroom-prose p` sets no `white-space`, so a recap reached the student as one run-on
paragraph carrying its own syntax: `- [ ] Redo PT 141 S2 - [ ] Blind review` on a single
line, `**1. What is a sufficient assumption?**` with the asterisks showing. Not a hand-
typed body that happened to contain punctuation - `partToMarkdown` in
`src/lib/sessionBundle.ts` emits those markers by construction from a field named
`body_markdown`, and every AI TA session bundle travels that path. `ClassroomMarkdown` is
the one renderer: headings demote to the h2/h3 this stylesheet styles so an authored `#`
cannot open a second document under the page's own `<h1 class="classroom-title">`, raw
HTML is skipped because that path belongs to `sanitizeClassroomHtml` and its `<style>`
allowance, task markers render as a box rather than the literal `[ ]`, and external links
open in a new tab while in-app paths stay put. The excerpt on the landing surface strips
the same syntax rather than rendering it, since it is the one place a body is shown
without going through the renderer.

**The typography plugin is registered, and its palette is this app's tokens.**
`@tailwindcss/typography` sat in `package.json` unregistered, so every `prose` class in
the codebase emitted nothing: measured 2026-09-09, zero `.prose` rules in the served
stylesheets and a rendered `<h2>` computing to the inherited body colour at 16px. Thirteen
live surfaces were styling markdown with classes that did not exist. Registering it alone
would have made several of them worse - the app is dark at `:root` and flips to light with
a `.light` class, so `darkMode: ["class"]` means the `dark:` variant almost never fires,
and the four call sites written as `dark:prose-invert` would have landed on Tailwind's own
gray-700 body text against a near-black ground. Both the `DEFAULT` and `invert` keys
therefore resolve from `--foreground`, `--muted-foreground`, `--border` and `--muted`, so
prose is correct in either theme whether or not a call site asks for `prose-invert`. This
does not touch `.classroom-prose`, which is this world's own stylesheet and stays hand-
written.

**Prose list markers have to be asked for.** Tailwind's preflight sets
`ol, ul, menu { list-style: none }` app-wide, and `.classroom-prose ol, ul` restored only
the indent. Every list in every note rendered as unmarked indented lines, and a numbered
list lost its numbers - a change of meaning, not of style, since "1, 2, 3" became three
lines that no longer said they were in order. Measured in the browser against the live
sheet: `list-style-type` computed `none` on a note's `<ul>`. `disc` / `decimal` / `circle`
are declared explicitly now, with `::marker` on `--classroom-meta-text`. Anything this
stylesheet inherits from preflight is worth checking the same way before assuming the
browser default is what renders.

**A row in this section opens what it says it opens.** `publishSessionBundle` stamps every
part of a session bundle with `source_table: 'ai_ta_drafts'` and the draft id, including
the homework part, which is a `homework` row carrying its own markdown and no assignment
row anywhere. `resolveItemRoute` read the bare `source_id` and sent the student to
`/classroom/<draft uuid>`, where the assignment view looked for a `homework_assignments`
row that has never existed and rendered "Assignment not found". The homework Joshua
reviewed and approved next to the recap was unreachable from the moment it was published.
`source_id` says what a row was made from, not that the thing it was made from is
openable; only `homework_assignments` is.

**The shell's four orphans are gone.** `src/pages/ClassroomRecaps.tsx`,
`src/components/classroom/RecapsSection.tsx`, `src/pages/ClassroomItem.tsx` and
`src/pages/teacher/TeacherRecaps.tsx` all predated this shell and nothing routed to any of
them: `/classroom/recaps` and `/classroom/item/:itemId` are `ClassroomRecapsView` and
`ClassroomItemView` in `ClassroomRouteViews.tsx`, and the teacher path is the dossier.
They were not merely unused. A live comment in `ClassroomRecapsView` cited `RecapsSection`
as the shared source of the empty-state wording "so the two places cannot drift", sending
the next reader to a file that was not running, and `pages/ClassroomItem.tsx` held a
`whitespace-pre-wrap` on the markdown body that the live view did not - so the dead copy
rendered a recap *better* than the one students used. Deleted 2026-09-09.

`src/pages/ClassroomTAAssignmentDetail.tsx` was a fifth orphan of the same kind - the
assignment surface rather than notes and recaps, but the same story: no importers, and
`/classroom/ta/:assignmentId` is `ClassroomTAAssignmentView`. Deleted on Joshua's word the
same day. Nothing under `/classroom` now has a routed view and a dead twin.

**`smartboard_recap` is a dead label.** Boards are not attached to student accounts
(confirmed 2026-09-09), so no student sees it. The mapping stays only so an unmapped
value cannot fall through to the raw enum. Not worth wording.

## Anti-references

Not a dashboard. Not an LMS. No progress rings, no streak badges, no card grid of
modules, no metric tiles. The classroom is a room with a desk in it, and the thing on the
desk is what the coach wrote.

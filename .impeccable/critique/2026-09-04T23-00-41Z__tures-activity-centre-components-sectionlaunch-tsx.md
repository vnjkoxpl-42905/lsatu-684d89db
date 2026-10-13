---
target: Read, Recall, Colour section launch surface
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 3
p1_count: 2
timestamp: 2026-09-04T23-00-41Z
slug: tures-activity-centre-components-sectionlaunch-tsx
---
Method: dual-agent (A: a200cc7666b02027d · B: a84343a9753367900)

# Critique: Read, Recall, Colour — section launch

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Four honest history states; but nothing warns that Start opens the mic and begins an unpauseable 25-min take |
| 2 | Match System / Real World | 2 | "STIMULI" printed 3x against PRODUCT.md's explicit ban; "91% carried" never defined; "Attempt" vs "run" split |
| 3 | User Control and Freedom | 2 | History rows are dead on the section page and buttons on the library; no Resume for an unfinished attempt |
| 4 | Consistency and Standards | 2 | Breaks the app on accent, tokens, label type and vocabulary; two tablists share one panel |
| 5 | Error Prevention | 2 | The phone warning renders below the button it gates; no mic check before a one-take recording |
| 6 | Recognition Rather Than Recall | 3 | Method fully on-page; but the four-state tick row has no legend anywhere |
| 7 | Flexibility and Efficiency | 2 | Run 40 gets the identical page as run 1; no way to skip the method |
| 8 | Aesthetic and Minimalist Design | 2 | The drawer duplicates the beat card verbatim; briefing inflates the page 1,079 -> 2,545px |
| 9 | Error Recovery | 3 | Best on the page — names failure, consequence, and what still works. No retry control |
| 10 | Help and Documentation | 3 | Real briefing in the coach's voice; its lede points at "the rules above", which this surface never renders |
| **Total** | | **24/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**Authored for this product — but poured into a generic skeleton.**

Could not be lifted anywhere else: the four-beat copy ("Out of order is fine. Casual is fine. Laughing is fine."), the four-state tick row where hollow means *our judge failed, not you*, the refusal arithmetic in `runStats.ts`, and "No runs yet. The first one is the baseline, not the test."

Borrowed: the composition. A four-up KPI strip, a tab strip, an accordion drawer, and a data table — the generic admin-panel skeleton. PRODUCT.md names "hero-metric dashboards" and "big-number stats tiles" as anti-references; DESIGN.md says "Don't build the hero-metric template."

`registry.tsx` deliberately gives this activity no world because "it asks the student to stop looking at the screen, so inventing a room for it works against the point." The surface answers that with the four most screen-native components in the vocabulary.

**Deterministic scan.** Six component files: exit 0, `[]`. Whole `activity-centre` directory: 149 findings, none in this surface. But that is partly a waiver — `.impeccable/config.json` carries ten `detector.ignoreValues` stamped 2026-09-04 written for this surface (10/11/12/14/18/20px, radii 4/1/6px and 50%, `#06231e`), and `section-launch.css` has 48 font-size/radius declarations.

**Visual overlay: injection succeeded.** Live server on port 8400, `detect.js` injected and read in-page. 31 findings at 1440 light, 32 at 375, 30 dark, 21 library, 22 empty. All 20 `undersized-ui-text` hits are `10px functional text (below 11px floor)` — the exact value the CLI config waives. The browser detector found what the file scan was configured not to report. Servers stopped and verified; no files written.

**False positives**: `dark-glow` (every shadow is zero-blur; a 1px ring is not a glow — though it fired because the detector correctly saw a dark body, which is the real bug), `kicker-above-heading` (the "Out loud" chip is a modality badge), `nested-cards` (a sheet containing panels, not stacked cards).

## Overall Impression

The prose is the best writing in the codebase and the arithmetic behind it is the most honest. The composition is letting both down. The method is stated four times before the essay, the loudest thing on screen is a KPI tray about past performance, and the one paragraph that would help a frightened student is buried six sections into a drawer behind a 2.9:1 text link.

Biggest opportunity: this page has one job — get her to press one button in the right frame of mind. Almost nothing in the layout says so.

## What's Working

1. **The refusal discipline is a design achievement.** `ticksFor()` returns null rather than draw a row from array order that would disagree with the authored section. `statsFor()` excludes runs with unknowable denominators from both halves of a fraction. `insideClock` recomputes rather than trust `within_goal`.
2. **The four-state tick, encoded as a different form rather than a different hue.** At 4px there is no room for a hue to do two jobs. An inset outline reads as present-but-unresolved without a contrast fight, and a grading outage never gets drawn as her skipped work.
3. **One frame, two doors.** `SectionLaunchFrame` owning the chrome while each surface owns only the slab beneath is the right seam. `SectionLibraryLaunch` refusing a stat strip because a cross-section trend "would be a number about nothing" is real restraint.

## Priority Issues

### [P0] The card is inverted against the page it sits on — in both themes

| view | `documentElement.className` | body background | `.sl` background |
|---|---|---|---|
| default | `""` | rgb(10,10,10) dark | rgb(244,247,247) light |
| `theme=dark` | `"dark"` | rgb(252,252,252) light | rgb(9,13,14) dark |

Cause: `src/index.css:151` is commented `/* .dark mirrors .light — reserved alias */` and sets `color-scheme: light` with light values. In this codebase `.dark` applies the LIGHT palette. `section-launch.css` wrote `.dark .sl` believing `.dark` meant dark. Combined with `ThemeProvider` only ever setting `.light`, and `ClassroomLayout` being the only code that sets `.dark` (and not on this route), the student gets a white card on a near-black page.

**Fix**: restyle to the app's actual convention — `.sl` carries dark values, `.light .sl` carries light overrides. Also fixes both contrast failures below.
**Command**: `/impeccable harden`

### [P0] The default theme fails WCAG AA on the primary action and every micro-label

| element | measured | needs |
|---|---|---|
| `.sl-start` | 3.52:1 | 4.5:1 (14px/600 is normal text) |
| `.sl-label` (crumb, stat labels, th) | 2.91:1 | 4.5:1 |
| `.sl-sd` | 2.83:1 | 4.5:1 |
| `.sl-n` | 2.74:1 | 4.5:1 |
| `.sl-brief` | 2.91:1 | 4.5:1 |
| `.sl-note` | 2.90:1 | 4.5:1 |

Dark is near-fine (`.sl-start` 8.02:1); `.sl-sd` misses by 0.02. Note: `.sl-sv[data-empty]` was not observed in any of the five harness states — the empty state removes the whole strip.

**Fix**: `--sl-ink-3` to ~`#5c6d73`, `--sl-accent` to ~`#07806d`; `.sl-label` to 11px, tracking 0.12em.
**Command**: `/impeccable harden`

### [P0] The phone warning renders below the button it exists to gate

`.sl-notice` fires on `(pointer: coarse)` — only on the warned devices, where `.sl-head` has collapsed so Start sits above it. Measured at 375x812: Start y=289, notice y=415. The code comment asserts the opposite. It is also full-bleed (`x=18 w=339` in a sheet of `x=18 w=339`) because `margin: 14px 0 0` on a direct child of `.sl-sheet`.

**Fix**: move `{notice}` above `.sl-head` or into `.sl-cta`; `margin: 14px 24px 0`. Rewrite to lead with what she should do.
**Command**: `/impeccable adapt`

### [P1] The drawer duplicates the beat card verbatim, and the briefing doubles the page

The "This beat" pane renders `current.label` and `current.body` — identical to the card above. "SELECT A BEAT TO READ IT" instructs the student to do what the page already did. `CONTEXT.md` defines a Beat as "each opening a drawer holding its own authored body"; the code shipped both halves. "The full briefing" grows the page 1,079 -> 2,545px with its close control ~2,200px above where reading ends.

`instructions.rules` (6 items) and `instructions.task` are never rendered on this surface, so the method is stated four times on screen (tagline, beat cards, drawer duplicate, aside) plus the briefing `<ol>`. The briefing lede "skim the rules above and go" is a dangling reference.

**Fix**: clamp `.sl-beat .sl-d` to two lines; move the briefing to a sheet with a persistent close; delete the "Before you start" aside.
**Command**: `/impeccable distill`

### [P1] "Recalled 73/75" does not mean what it says

The value is `t.recorded` summed across three runs — slots she spoke into at all, judged or not, across three separate 25-stimulus sections. The label is "Recalled". `runStats.ts` avoids the name `carried` internally "which already means something else", then the UI uses the drill's most loaded verb. Same class: "Last run / most recent" restates itself; "Trend" is newest-minus-oldest of exactly three points, with `RUNS_SHOWN = 3` hard-coded.

**Fix**: relabel to "Spoken", sub-label "73 of 75 slots, last 3 runs", or scope to the most recent run. `mean_coverage` already exists and is the number she thinks "Recalled" means.
**Command**: `/impeccable clarify`

## Persona Red Flags

**Jordan (first-timer)**: meta says "PT105.S2 · 25 STIMULI · EST 25 MIN" — she does not know what a stimulus is and PRODUCT.md forbids the word. She clicks a beat and gets back the paragraph she just read, so she stops trusting the drawer and never opens the briefing, where "You will think you have nothing to say. Everybody does." lives. Presses Start with no idea a mic prompt and an unpauseable 25-minute recording follow.

**Sam (screen reader + keyboard)**: roving tabindex and arrow traversal are correct. But clicking "The full briefing" leaves `.sl-beats` at 4 tabs, 0 selected (measured: 2 selected before, 1 after) while `sl-beat-tab-0` keeps `tabindex="0"`. The tick row's `aria-label` is on a roleless span, so `notJudged` vs `silent` reaches him as nothing, with no legend. Loading strip is `aria-hidden` with no `aria-busy`. `role="status"` will not announce first-paint content. 10 of 14 interactive elements under 44x44; smallest is `.sl-crumb-back` at 52.7 x 16.0px — the only way out.

**Casey (distracted mobile)**: 2,367px of door at 375px; stat strip 422px, beat strip 598px. No horizontal overflow anywhere. But the tick column is cut off in `.sl-scroll` with no fade, the warning is 126px below the button she already tapped, and nothing states the real precondition: somewhere she can speak out loud for 25 minutes.

## Minor Observations

- The Start button's arrow wraps to a second line — 60.4px tall in every view including 1440, where a single-line 14px button is ~36-40px. The inline `margin-left: 8px` on the SVG pushes it over.
- Library header says "three a day is the rhythm" while the briefing closer says "One a day holds you steady." Both on screen at once.
- A completed attempt is a button on the library and an inert `<tr>` on the section page. The richer view is the dead one.
- An unfinished attempt shows "not finished" beside a button labelled "Run it again" — no Resume, and the label does not say a new attempt is being created.
- `.sl-chip` renders "Out loud", registry says "Out Loud", CSS uppercases to "OUT LOUD".
- The crumb's `<strong>` is styled lighter than its surroundings.
- No `h1` in any state. Briefing H4s skip H3.
- Zero console errors in all five views.
- The `prefers-reduced-motion` block is thorough and correct, including the `::after` underline.
- `src/dev/sectionLaunchPreview.tsx` stubs `window.fetch` before the Supabase import so the real client and real derivation both run. Excellent tooling.

## Questions to Consider

1. What if this page had exactly one number on it? "Target · met on 1 of 3" is the only cell that says whether she is doing the drill correctly, and it is in the weakest position.
2. Should the method be on this page at all after the third run? `runStats` already knows `totalRuns`. Collapse to four labels once `totalRuns >= 3`. One conditional resolves most of the cognitive-load failures.
3. The drill is about speaking. What if the door were too? A 10-second mic check before the clock starts would confirm the mic, break the silence, and be the most product-specific interaction on the surface.
4. Why does the door to the one activity that asks her to stop looking at the screen look the most like a dashboard? What is the visual language of "look away from this"? That page probably has no stat strip at all.

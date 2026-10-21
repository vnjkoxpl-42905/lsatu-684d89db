# Spec: LR / RC section toggle on the drill hub

_Drafted 2026-08-26 by Claude, from Joshua's ask: "on the drill page I want RC as a toggle — LR and RC, top right." Four open decisions answered by Joshua the same day and folded in; see **Decisions**. Ready to build. Terms per `src/features/rc/CONTEXT.md` and `src/components/drill/CONTEXT.md`. Sits alongside `plans/rc-lr-unified-picker.md`; see **Relationship to the unified-picker plan**._

## The page

`/classroom/drill` → `src/pages/AcademyMainhub.tsx`, rendered inside the persistent `ClassroomLayout` shell. Today it is three bands inside a 1140px canvas:

1. `.drill-observatory-tools` — a single-item row holding `QuestionJump`, left-aligned.
2. `MainhubHero` — route label `DRILL / LOGICAL REASONING`, greeting, **Start Smart Drill**, and a right console with **Set up an LR drill**.
3. The deck — practice bay (`PracticeInsightStage`, or a `LauncherStage` when `?stage=full-section|type-drill`) beside `TodayFocusPanel`. `?stage=analytics` takes the whole below-hero area.

The whole page is Logical Reasoning by declaration — the route label literally says so.

## The problem

RC exists and is complete (59 PrepTests, 1,602 drillable questions, a player, search, results), but it is reached through three unequal side doors instead of one:

| Door | Where | What it gives |
|---|---|---|
| `PracticeInsightStage` → `RcQuickBuild` (`:307`) | practice bay tool row | count / pace / reveal, then `/rc?…&start=1` |
| `PracticeInsightStage` → "All passages and filters" (`:395`) | same row | `navigate("/rc")` |
| `SectionSelector` with `kind="rc"` (`:24`) | the full-section launcher | a real RC section, via `rcSectionHref` |

So RC is a tool inside a panel inside the LR page. `RcHub` (`src/features/rc/pages/RcHub.tsx`, 695 lines) is a full-screen route outside the Classroom shell. Its `rc.css` already borrows the observatory token ladder — the two are closer than they look — but it draws its own page frame, its own heading, and its own full-height background, so it lands as a separate destination rather than as part of the drill hub. There is no rail entry for it.

**The toggle is the fix**: RC becomes a *section of the drill hub*, peer to LR, chosen by one control in one place.

## The control

A two-option segmented control, **LR | RC**, at the **top right of the tools row**, opposite `QuestionJump`.

- `.drill-observatory-tools` becomes `flex items-center justify-between gap-4` (it is `display: block` today, CSS at `classroom.css:1094`).
- New component `src/components/drill/SectionToggle.tsx`. Two slots in one `role="group"`, `aria-pressed` on the active one, labels `LR` and `RC`, accessible names "Logical Reasoning" / "Reading Comprehension" via `aria-label`. It is a **flip switch, not a tab strip** — a sliding lit indicator behind the labels, see Motion. Dark-surface styling drawn from the existing `.rc-segmented` / observatory chip idiom, new classes `.drill-observatory-section-toggle[-option]` in `classroom.css` beside the tools row rule. No new colour values — `--observatory-ink-*` only.
- **Not** in `.drill-observatory-route-label`: that row is `aria-hidden` decoration. The route label instead *reflects* the toggle — `DRILL / LOGICAL REASONING` ⇄ `DRILL / READING COMPREHENSION`.
- Below 900px the tools row wraps and the toggle sits full-width under `QuestionJump` rather than shrinking. It is never hidden — unlike the route label's `span:last-child`, which already hides at 719px.
- Keyboard: left/right arrows move between the two options, `Enter`/`Space` activates, focus ring visible on the dark surface.

## URL contract

The toggle is **URL state, not component state** — a student links a friend to the RC hub, refreshes, or hits Back, and lands where they were.

```
/classroom/drill                 → LR (default, unchanged)
/classroom/drill?section=rc      → RC
/classroom/drill?section=rc&stage=type-drill   → the RC builder
```

- `section` is parsed alongside the existing `stage` in `AcademyMainhub`; any value other than `rc` is LR.
- Switching sections **replaces** the query rather than merging: `?section=rc` clears `stage`/`tab`, because an LR launcher stage has no RC counterpart at the same key. Toggling is `setSearchParams({...}, { replace: false })` so Back returns to the other section. The switch is unconditional — no confirm, per Decision 1.
- **Last section is remembered per browser** in `localStorage` under `lsatu.drill.section`, applied *only* when the URL carries no `section` param, and written on every toggle. A deep link always wins over the remembered value.
- `/rc`, `/rc/search`, `/rc/drill`, `/rc/results/:id` **all keep working, unchanged**. The player and results are full-screen takeovers by design and stay outside the shell (`src/features/rc/CONTEXT.md`). `/rc` becomes a *redirect* to `/classroom/drill?section=rc`, preserving its documented query forms (`?passages=`, `?count=`, `?timing=`, `?reveal=`, `?start=1`) — those links are already in the wild from `PracticeInsightStage` and from assignments. Contract-test each form.

## What RC mode renders

Same three bands, same canvas, same shell. Only the contents of the hero and the practice bay change; **`TodayFocusPanel` is shared and does not move** — assignments and notes are section-agnostic status.

| Band | LR | RC |
|---|---|---|
| Route label | `DRILL / LOGICAL REASONING` | `DRILL / READING COMPREHENSION` |
| Hero left | greeting + **Start Smart Drill** → `/drill` state `{mode:'adaptive'}` | same greeting + **Start Smart Reading Drill** → `/rc/drill` via the adaptive selection `RcHub` already runs (`selectPassages`, `RC_ADAPTIVE_LABEL`), 1 passage, untimed, reveal per-passage |
| Hero right console | "Build the drill you need." → **Set up an LR drill** (`?stage=type-drill`) | "Build the reading set you need." → **Set up an RC drill** (`?section=rc&stage=type-drill`) |
| Practice bay | `PracticeInsightStage` | `RcPracticeStage` — recent RC sessions with scores, resume, delete; **Search passages & questions** → `/rc/search`; **Full section** → `SectionSelector kind="rc"` |
| Launcher stage | `QuestionPicker` / `SectionSelector kind="lr"` | the `RcHub` build card (passages, timing, reveal, filters, hand-pick), moved into the observatory launcher panel |
| Analytics stage | unchanged, shared | unchanged, shared (RC analytics is out of scope) |

`QuestionJump` is shared and already returns both LR and RC hits (`questionFinderSearch` emits `/rc/drill?passage=…`) — it does not filter by the active section.

## Phasing

**Phase A — the toggle and the mount.** Ships alone and is the whole of Joshua's ask.

1. `SectionToggle` component + CSS; tools row becomes a two-item flex row.
2. `AcademyMainhub` reads `section`, drives the route label, and branches the hero and practice bay.
3. Extract `RcHub`'s **build card** and **history list** into `src/features/rc/components/RcBuildCard.tsx` and `RcSessionHistory.tsx` — pure presentation over props, no route knowledge. `RcHub` keeps its data loading and becomes their first caller, so nothing breaks while the hub mounts them too.
4. `RcSectionStage` (hero + practice bay) composes them inside the observatory surface. Styling comes from a scoped `.drill-observatory-launcher .rc-card { … }` override layer, **not** from editing `rc.css` — the standalone `/rc` route still uses it.
5. `/rc` redirects, query-preserving. `RcQuickBuild` and the "All passages and filters" link in `PracticeInsightStage` are **removed**: they become the toggle. `SectionSelector kind="rc"` stays where it is and is also reachable from RC mode.
6. The flip: indicator `layoutId` on the switch, the band rotation on the LR/RC branch, the reduced-motion rule. Built in this phase, not deferred — the flip *is* the control.
7. Rail entry for the drill hub is untouched, and RC gets none of its own — one door, two sections, which is the point.

**Phase B — visual parity.** RC's controls are restyled natively in the observatory idiom rather than through an override layer, and `rc.css` shrinks to the player. Deferred until Joshua has used Phase A.

**Phase C — RC on the insight stage.** RC accuracy, pace, and weak-type rows in `PracticeInsightStage`'s RC arm. Needs the first-attempt analytics split that `plans/rc-lr-unified-picker.md` step 34 defines. Explicitly not in this spec.

## Relationship to the unified-picker plan

`plans/rc-lr-unified-picker.md` Phase 5 builds **one picker** with an LR/RC mode toggle *inside it*, and retires `RcHub`'s builder. That is blocked behind Phase 3 (splitting the 5.5 MB bank) and Phase 4 (the RC session model, live migrations) — neither is built.

This spec is **not a competing design and not a substitute**. It moves the toggle up one level, from inside the picker to the hub, and ships now against the pickers that exist. When Phase 5 lands, the hub toggle stays and the launcher stage swaps its two panels for the one unified picker — `?section=` becomes the picker's initial mode. Nothing here has to be undone.

The one decision it forecloses: **section is a property of the hub, not of the picker**, so a student switching sections leaves an in-progress LR selection behind. Phase 5 step 38 planned to warn before discarding; Decision 1 overrules it — the switch is silent at both levels.

## Verification

Per `AGENTS.md`, every gate: `npm run typecheck`, `npm run test`, `npm run build` clean; released through `.claude/safe-push.sh`; and — because this is `src/pages` + `src/components` work — viewed running with screenshot evidence at narrow, mid, wide, and sidecar-docked widths. A push does not deploy; `lsatprep.study` needs an explicit Lovable publish, verified by bundle hash.

Contract tests:

- `?section=rc` renders the RC hero and practice bay; absent/garbage `section` renders LR.
- Toggle writes the URL; Back returns to the previous section; refresh holds.
- `localStorage` remembers the last section, and a deep-linked `?section=` overrides it.
- Every legacy `/rc?…` query form survives the redirect intact — `passages`, `count`, `timing`, `reveal`, `start`.
- Toggling out of `?stage=type-drill` clears the stage rather than carrying it across.
- `TodayFocusPanel` mounts once and does not remount on toggle (assert a stable instance, not just presence).
- `RcBuildCard` extracted: `RcHub` at `/rc` and the hub's RC stage produce the same `RcDrillConfig` for the same inputs.
- Toggle is keyboard-reachable, arrow-navigable, and announces the active section.
- A half-built LR selection is discarded on toggle without a prompt (asserted, so nobody "helpfully" adds a confirm later).
- `prefers-reduced-motion: reduce` renders the crossfade with no rotation and no indicator slide.
- The flip is screenshotted mid-transition **in a foreground tab** — a background tab freezes framer-motion at `initial` and reads as broken.

## Decisions (Joshua, 2026-08-26)

1. **Toggling always switches silently.** No confirm, no warning, even with a half-built LR set in the picker. Speed over rescue — the toggle is a flip, and a flip that stops to ask is not a flip. Consequence, accepted: an in-progress LR selection is discarded on switch and is not recoverable. (This also settles Phase 5 step 38's mode-switch warning one level up: there is no warning.)
2. **The page always opens on LR** unless the URL or the remembered value says otherwise. RC is never auto-selected from a student's assignments. The toggle is the discovery.
3. **Start Smart Reading Drill = 1 passage, untimed, reveal after each passage** — `RcHub`'s existing defaults, unchanged.
4. **No RC rail entry. The toggle is the door** — and it *reads* as a flip. See Motion.

## Motion — the flip

The toggle is not a tab strip that swaps content underneath it. **The section flips.**

- **The control.** A two-slot switch with a sliding indicator behind the active label — the indicator travels between LR and RC on a spring rather than cutting. The two labels stay visible at all times; only the lit one changes. `layoutId` on the indicator (framer-motion 12.38 is already a dependency) so the movement is one continuous object, not two states.
- **The bands.** Route label, hero, and practice bay flip together as one card: a Y-axis rotation of about 6-8 degrees with the outgoing section fading out through the first half and the incoming one fading in through the second, `perspective` set on `.drill-observatory-canvas` so it reads as depth rather than a squash. LR flips one way, RC the other, so the direction tells you which way you moved. Around 320ms total, on the observatory's existing easing curve. Never a page-load spinner: the RC passage index is fetched **on toggle mount**, and the flip plays over the fetch.
- **`TodayFocusPanel` does not flip.** It is section-agnostic status and sits still while the left side turns. That contrast is what makes the flip legible as "this half changed" rather than "the page reloaded."
- **It has to fit.** No new colour values, no new easing, no bounce that the rest of the observatory does not already do. The flip borrows `--observatory-*` tokens and the motion vocabulary already in `classroom.css`.
- **`prefers-reduced-motion: reduce` gets an instant crossfade** — no rotation, no slide, indicator jumps. `classroom.css:1834` already has the block; the rule lands there.
- **Verify it in a visible tab.** Background tabs suspend rAF and framer-motion freezes at `initial`, which looks exactly like broken rendering.


## Built (2026-08-26) — where it departed from the above

The spec above is what was designed. This is what shipped, and the four places the build knowingly diverged.

**New files**
- `src/lib/drillSection.ts` (+ `.test.ts`) — parse / remember / resolve. The one resolution rule lives here, not in the page.
- `src/components/drill/SectionToggle.tsx` — the switch; `layoutId` indicator, arrow keys, `aria-pressed`.
- `src/components/mainhub/RcPracticeStage.tsx` — the RC practice bay.
- `src/features/rc/components/RcHubSurface.tsx` — the builder, lifted whole out of `RcHub`.
- `src/features/rc/components/RcSessionHistory.tsx` — the drill list, self-loading.
- `src/features/rc/pages/RcRedirect.tsx` (+ `.test.tsx`) — the `/rc` adapter.
- `src/pages/AcademyMainhub.section.test.tsx` — 13 contract tests for the switch.

**Changed** — `AcademyMainhub` (section state, both branches, the flip), `PracticeInsightStage` (RC tile rewired, quick build removed), `SectionSelector` (`initialKind`), `classroom.css` (switch, flip, reduced motion), `rc.css` (`.rc-embedded`), `rcTypes.ts` (`REVEAL_LABELS`), `App.tsx` (`/rc`).

**Divergence 1 — one surface with a variant, not two extracted components.** The spec called for `RcBuildCard` and `RcSessionHistory` as pure presentation. The history split out cleanly and did. The build card did not: its controls read about twenty pieces of shared state, so a "pure" version would have been twenty props threaded through two callers and two ways for the same builder to disagree with itself. It became `RcHubSurface({ embedded, showHistory, onCancel })` — one component, two mounts, no duplicated state.

**Divergence 2 — the RC tile stayed.** The spec removed all three side doors. The quick-build back face and the "All passages and filters" link are gone, as specified; the Reading Comprehension tile in the LR practice bay stayed and now throws the switch instead of opening a builder of its own. It is a second affordance for one destination, not a second destination, and removing it would have left a two-tile row with a hole in it. `FlipDeck` and `RcQuickBuild` were deleted with the quick build.

**Divergence 3 — the switch is inked dark-on-light.** The spec assumed the tools row sits on a dark surface. It does not: the observatory is dark cards on a light cream stage, and the row is on the stage. The first pass shipped an ivory-on-ivory switch that was invisible in the browser — caught only because this was viewed running. It now takes the Question finder's light-tone values, which is what the strip beside it uses.

**Divergence 4 — no `animation-fill-mode` on the flip.** `both` held the face at `opacity: 0` until the animation ran, and a tab whose rendering is suspended never runs it — the whole section rendered invisible in the first screenshot. Without a fill the element's own styles apply outside the animation and the worst case is one unanimated frame.

**Also worth knowing**
- On a wide screen the switch wraps onto its own line under the Question finder, right-aligned to the hero's edge, because the finder claims the full row width. It reads as intended and was left.
- `useGreetingName` was lifted out of the hero so that keying the hero on the section (which is what replays the flip) costs no `profiles` query per toggle.
- Analytics stays shared and section-agnostic, as specified. RC analytics is still Phase C.

# Spec — Drill landing workspace: The Reasoning Observatory

Status: **visual proposal for Joshua's review. Do not implement until approved.**
Written: 2026-07-28.
Scope owner: Codex.

## Authority and relationship to earlier specs

This document is the visual authority for the pre-question workspace at
`/classroom/drill`.

- `2026-07-28-drill-single-route.md` remains authoritative for route
  consolidation, state, return paths, and functional behavior.
- This document supersedes that spec's frozen visual treatment of the hero,
  Practice/Insight stage, Today panel, and Drill-specific Classroom rail.
- The six files under `src/components/drill/official/` remain frozen. The
  official question-answering experience is not part of this redesign.
- No data model, permission, route, launch contract, query, or behavioral rule
  is changed by this proposal.

## Decision

Build the Drill landing workspace as **The Reasoning Observatory**: a precise,
compact reasoning instrument embedded in the warm Classroom frame.

It should feel otherworldly because of its material logic, light, depth, and
choreography, not because it looks like a game, spaceship dashboard, or neon
cyberpunk theme. The visual experience is a warm reading room containing one
beautiful optical instrument.

The redesign must:

1. Make the page fit naturally beside the persistent 320px Classroom rail.
2. Replace the current large hero plus independent card stack with one composed
   workspace whose structure is felt through tone, alignment, and rhythm.
3. Make the Drill console feel like the control surface of an instrument rather
   than a form placed in a glass card.
4. Preserve every feature and interaction exactly.
5. Keep the official question experience visually and behaviorally untouched.

## Why the current composition fails

At the verified 1514×1081 viewport:

- the rail occupies 320px inside a 336px shell;
- the Drill canvas expands to about 1170px;
- the hero alone is about 416px tall;
- the canvas has only 8px of warm inset;
- the default layout reads as three unrelated dark blocks on a warm page;
- the analytics state extends past 1600px and carries the full oversized hero
  above the working content.

The problem is not simply that individual cards are too large. The page lacks a
clear width model, a stable pane contract, and a shared material hierarchy.

## Reference synthesis

This is a synthesis, not a clone.

| Reference | Adopt | Reject |
|---|---|---|
| Jeff Su | A controlled content measure, warm peripheral field, generous but intentional whitespace, and a quiet persistent rail | A 720px article column for an interactive dashboard |
| Linear, March 2026 refresh | Working content earns the strongest contrast; navigation recedes; structure is felt through fewer, softer boundaries | Feature density that becomes visually flat or cold |
| Figma UI3 | Fixed, dependable panes and a work-first canvas; keep expert controls available | Floating control panels that cramp smaller viewports or hide routine controls |
| Raycast | Search as the fastest entry point, keyboard continuity, compact command-like results | Turning the whole page into a command palette |
| Teenage Engineering OP-1 Field | An instrument-grade control language, small technical labels, semantic color coding, and playful precision | Novelty controls, unlabeled symbolism, or skeuomorphic hardware cosplay |
| Apple spatial interfaces | Light, translucency, scale, and shadow used to clarify distance and presence | Heavy blur, illegible glass, or floating layers without hierarchy |
| Dia | Peripheral chrome that visually inherits the active workspace and becomes quieter | Route-specific shell changes that make the rail jump or feel replaced |
| Spline | Treat the robot as a spatial object inside the scene | Treating the mascot as a decorative image in a hero card |

Reference URLs:

- https://linear.app/now/behind-the-latest-design-refresh
- https://www.figma.com/blog/our-approach-to-designing-ui3/
- https://manual.raycast.com/quickstart
- https://teenage.engineering/products/op-1
- https://www.apple.com/newsroom/2023/06/introducing-apple-vision-pro/
- https://www.diabrowser.com/release-notes/1-28-0-look-closer

### Expanded discovery rule

Pinterest, Dribbble, and visual galleries are explicitly in scope, but they are
**divergence sources, not implementation authorities**.

The research stack is provenance-graded:

1. shipped product and live interaction;
2. official design documentation;
3. physical instrument or environmental system;
4. interaction recording or implementation demo;
5. portfolio case study;
6. static concept, Pinterest pin, or Dribbble shot.

An idea discovered in levels 5–6 may enter the build only when a second
reference from levels 1–4 proves that it survives real states, real content,
responsive pressure, and interaction.

The expanded search lanes are:

- editorial control rooms;
- warm-dark scientific instruments;
- observatory and cartographic interfaces;
- advanced filter and dependent-selector panels;
- editorial data storytelling;
- exhibition and wayfinding systems;
- high-density music-production tools;
- visual knowledge environments;
- diegetic game interfaces;
- transitions from expressive workspaces into focused task modes.

Additional sources:

- https://www.pinterest.com/pin/set-of-futuristic-user-interface-elements-for-dashboard-or-control--408138784975594979/
- https://dribbble.com/search/control-panel-ui
- https://www.cosmos.so/explore/ui-ux
- https://www.are.na/editorial/information-systems
- https://godly.design/sites/
- https://pageflows.com/
- https://tympanus.net/codrops/
- https://reutersagency.com/content/content-types/graphics/
- https://www.bloomberg.com/graphics/
- https://pudding.cool/about/
- https://www.ableton.com/en/push/manual/
- https://help.play.date/developer/designing-for-playdate/

The Dribbble control-panel scan contributed three useful ideas: flush
instrument bays, small monospaced labels, and a constrained spectrum reserved
for active state. It did **not** justify skeuomorphic knobs, fake system status,
or a cyberpunk shell.

## Pane contract

The visual redesign must not alter ownership or information architecture.

### 1. Classroom rail

The existing persistent `.classroom-sidebar` and `.classroom-sidebar-card`.

It owns:

- LSAT U identity;
- Classroom navigation and groups;
- locked Activities behavior;
- user profile and theme controls;
- the existing mobile menu behavior below 1024px.

It does not own Drill search, filters, selectors, launch controls, Practice,
Insight, Today, or Analytics.

### 2. Drill canvas

The route-specific workspace rendered by `AcademyMainhub`.

It owns:

- the welcome/date orientation layer;
- Smart Drill launch;
- the Spline robot;
- the Drill console;
- Practice and Insight actions;
- Today focus;
- the embedded Analytics stage.

### 3. Drill console

The route-specific control pane inside the canvas.

It owns:

- one clear entry point into the unified LR drill builder;
- a concise explanation of what students can configure there;
- the visual handoff from the hero into the full-width builder stage.

The August 2026 unified-builder decision supersedes the compact search,
Advanced-filter, dependent-selector, and single-question launch contracts that
previously lived in this pane. All exact lookup and filtered-set controls now
share one builder and one filter model.

### 4. Official drill surface

The question-answering experience after launch.

It owns every official question, answer, toolbar, session strip, navigator, and
answer-state interaction. This redesign cannot reach it through shared styles.

## Visual north star

### Concept

**Warm field, dark aperture, luminous logic.**

The Classroom remains a warm editorial room. The Drill canvas becomes a
centered precision chassis. Within it, the active reasoning area is a deep
graphite aperture with a very restrained spectral edge. Controls sit flush
inside machined recesses. The robot appears within the optical field, not in a
separate decorative column.

### Signature motif

Use one repeated motif: **the reasoning trace**.

It is a 1px path or arc that can appear as:

- the active Drill indicator in the rail;
- the edge highlight of the primary instrument;
- the selected step across PrepTest → Section → Question;
- the active insight dot;
- a quiet continuity line between Today and the next action.

The trace is never a progress claim and never implies data that does not exist.
It is decorative geometry with a single consistent visual grammar.

The trace should be drawn from LSAT-specific graphic culture rather than a
generic space HUD. Its forms may echo:

- argument underlining and proof marks;
- conditional arrows;
- logic-diagram junctions;
- exam-booklet registration marks;
- legal index tabs;
- celestial navigation and cartographic plotting.

This is the ownable layer. The finished page should read as a precision tool for
reasoning, not “space dashboard UI.”

### Emotional target

- serious, focused, and intellectually ambitious;
- cinematic at first glance, calm during use;
- warm enough to belong in Classroom;
- precise enough to feel like professional equipment;
- unmistakably LSAT U rather than a generic AI dashboard.

## Geometry and viewport occupancy

### Wide reference viewport: 1514×1081

The 336px rail footprint remains unchanged. The stage has about 1178px
available.

Target geometry:

- Drill canvas maximum width: **1040px**;
- outer stage gutter: `max(24px, (available width - 1040px) / 2)`;
- top inset: 24px;
- bottom inset: 32px;
- instrument corner radius: 28px;
- primary instrument height: **320–336px**, including its orientation band;
- gap between primary and lower workspace: 16px;
- lower workspace target height: **340–380px** in the default state;
- total default composition target: **760–820px** before page-bottom breathing
  room.

At this viewport, the entire primary instrument and the meaningful top of both
lower regions must be visible without the current oversized feeling. The canvas
must never expand merely because spare horizontal space exists.

### Occupancy budget at the wide reference viewport

| Region | Target |
|---|---:|
| Persistent rail | 22% of viewport width |
| Warm field around canvas | 8–12% of stage width |
| Primary instrument | no more than 32% of viewport height |
| Console within primary instrument | 36–40% of instrument width |
| Atmosphere/robot/action field | 60–64% of instrument width |
| Lower Practice/Insight region | 60–64% of lower width |
| Today region | 36–40% of lower width |

Beauty cannot be achieved by hiding frequently used controls. Search and the
three specific-question selectors remain visible in the wide and mid layouts.

## Composition

### A. Primary instrument

One continuous chassis replaces the current three-column hero card.

#### Orientation band

A 48–56px band across the top contains:

- `DRILL / LOGICAL REASONING` as a small technical route label;
- the existing localized date;
- the existing personalized welcome;
- a quiet readiness label that may only describe real loading state, never
  fabricated telemetry.

This band uses alignment and a single soft divider, not a nested card.

#### Focus bay

The left 60–64% is the focus bay.

- Smart Drill is the dominant computed action.
- The button label and launch behavior remain `Start Smart Drill`.
- The Spline robot remains the only rich visual object and is staged at a
  smaller, more deliberate scale.
- The robot occupies no more than 42% of the primary instrument's total area.
- The robot's mask must feather into the aperture so it feels present within
  the material.
- The existing Spline fallback remains graceful and non-blocking.
- No fake score, streak, energy, or readiness metric may be added.

The welcome copy sits on the same baseline system as the CTA. The scene should
read as one purposeful invitation, not a greeting column beside an illustration.

#### Console bay

The right 36–40% is a fixed control recess separated by a tonal shift and one
hairline. It is not a floating glass card.

Order remains:

1. question-text search;
2. Advanced / Clear filters row;
3. advanced controls when expanded;
4. PrepTest;
5. Section;
6. Question;
7. Start.

The dependent selector sequence reads as one continuous track. Labels are
always visible. Disabled steps are dimmed but legible. Selection is shown with
the reasoning trace and a subtle luminance change, not three independent boxes.

### B. Lower workspace

Practice/Insight and Today share one lower material plane. They are divided by
alignment, tonal temperature, and a soft vertical boundary rather than looking
like two unrelated cards.

#### Practice and Insight

- Preserve Full Section, Build a Set, Analytics, and Journal.
- Preserve all permission gates and destinations.
- Preserve the five-slide insight carousel, seven-second auto-rotation,
  pause-on-hover behavior, clickable dots, and current transition timing.
- Present the four modes as a compact command rail rather than a card grid.
- One mode may be visually primary; the remaining actions must remain plainly
  discoverable and equally functional.
- Insight content lives directly beneath or beside the rail within the same
  plane, using editorial rhythm and a single focal graphic.

#### Today

- Preserve the existing merge, dedupe, priority, loading, error, empty, and
  expansion behavior.
- Preserve the primary focus plus two supporting rails.
- Preserve Start, Continue, Reply, Resume, Review, Practice, and Open actions.
- The eclipse image may remain, but it becomes a quiet atmospheric anchor
  rather than the identity of a separate card.
- Use leader lines, compact status markers, and type hierarchy to group work.
  Do not wrap every item in an individual rounded tile.

### C. Analytics state

The primary instrument remains stable when
`?stage=analytics&tab=overview` is active so local search, filter, and selector
state is not visually or behaviorally discarded.

Below it:

- Analytics inhabits the same chassis language as the default workspace.
- Preserve the existing heading, counts, Open full analytics action, priorities,
  tabs, disabled tabs, charts, tables, and all loading/error/no-data states.
- The active tab reads as part of one compact view bar.
- Overview, Drills, and Priorities remain active.
- Sections, PrepTests, and Questions remain disabled exactly as they are now.
- Stat blocks use alignment and ruled sections, not a grid of equal floating
  cards.
- Long content may scroll. “Fit” means coherent proportions and efficient
  density, not forcing all analytics into one viewport.

## Material system

Do not add a fifth unrelated visual dialect. On approval, these become named
Drill-landing tokens in `DESIGN.md` and scoped CSS variables under the
Drill-root class.

### Contrast ladder

| Level | Role | Proposed value |
|---|---|---|
| L0 | Classroom warm field | `#FDF8F3` |
| L1 | warm instrument surround | `#F7EFE5` |
| L2 | primary graphite aperture | `#101218` |
| L3 | recessed control plane | `#171A22` |
| L4 | hover/selected dark plane | `#222632` |
| Ink | primary dark text | `#17141B` |
| Light ink | primary text on graphite | `#F7F4EF` |
| Muted light | secondary text on graphite | `rgba(247,244,239,.58)` |
| Warm line | field boundary | `#E4D6C7` |
| Dark line | instrument boundary | `rgba(255,255,255,.09)` |

### Accent contract

Accent color is sparse and semantic.

| Accent | Meaning |
|---|---|
| ion amber `#FF8A3D` | primary launch, active Drill identity, warm guidance |
| spectral blue `#79C4FF` | focus, search match, selected control path |
| mint `#74D6B2` | completion or positive analytics only |
| rose `#F06A76` | destructive/error only |
| violet `#A996FF` | Insight identity only, never a generic decorative wash |

No more than two accent families should be visible in one local region. State
colors always override decoration.

### Boundary strategy

Use:

- spacing for relationships within a group;
- a tonal step for major pane ownership;
- a hairline for sequences and table structure;
- one diffuse outer shadow for the entire primary instrument;
- a narrow spectral edge only at the active aperture;
- blur only behind the robot or one atmospheric light source.

Do not use:

- a border plus shadow plus gradient on every element;
- nested rounded cards;
- multiple floating glass panels;
- colored accent stripes;
- gradient text;
- a full-page starfield;
- large glow clouds behind ordinary controls.

### Spatial depth budget

Maximum:

- four luminance levels;
- two physical elevation levels;
- one blur family;
- one outer shadow family;
- one spectral edge family;
- two simultaneous animated layers, including the Spline scene.

If the interface needs more depth cues than this, the composition is too busy.

## Typography

Do not add a font dependency.

- Use Outfit for the Drill landing workspace because it visually connects the
  route to the Classroom shell.
- Preserve the native system stack in the official question experience.
- Route/orientation labels: 11px, 700, uppercase, `0.16em`.
- Control labels: 11–12px, 650, sentence case.
- Main welcome: 24–28px, 600, tight but not display-sized.
- Primary action: 14px, 650.
- Body and insight copy: 14–15px, 1.5–1.6 line height.
- Metadata and PT/Section/Question identifiers: 11–12px with tabular numerals.
- Never use a giant marketing headline. This is a workspace, not a landing page.

## Control language

### Unified LR drill builder

- The console opens the same full-width builder as every “Set up an LR drill”
  action on the page.
- PrepTests, sections, question number, question types, reasoning types,
  question features, levels, and question-text search live in that builder.
- Array facets are multi-select and independent. Values combine with OR inside
  a facet and AND across facets. PrepTest, section, and question number never
  clear one another.
- Contextual counts honor every other active filter. Unselected zero-match
  options hide; selected options remain visible and removable.
- The combined result count, empty state, selected-filter chips, per-category
  Clear actions, and Clear All make the active query explicit.
- A student chooses a set size, materializes an exact preview, and launches the
  frozen QID list. Manual selections take precedence when present.

### Buttons and hit areas

- Primary launch controls: 44px minimum height.
- Secondary controls: 40px minimum height.
- Icon-only controls: 40×40px minimum unless an existing compact rail control
  is already accessible by keyboard and has an accessible name.
- Focus ring: 2px spectral blue plus a 2px graphite or warm offset appropriate
  to the surface.

## Motion and ambient behavior

Spend the motion budget on three moments:

1. **Arrival:** instrument resolves with a 240–320ms opacity and 6px transform;
   internal regions may stagger by at most 40ms.
2. **Focus:** search/select/CTA receives a 140–180ms aperture-edge response.
3. **State transition:** default ↔ Analytics and insight changes crossfade in
   220–280ms.

Existing allowed motion:

- the Spline robot;
- the seven-second insight carousel;
- loading spinners.

Rules:

- no bounce, elastic, parallax, cursor-following glow, or continuous page
  shimmer;
- never animate layout width, height, padding, or margins;
- stop nonessential motion under `prefers-reduced-motion`;
- retain complete usability if Spline fails or animation is disabled;
- ambient light never responds to private data or implies a score/status that
  the backend did not provide.

## Mascot role

The robot is a **quiet guide and system presence**, not a coach making claims.

- It anchors the Smart Drill action spatially.
- It may idle and visually orient toward the console.
- It must not speak, grade, celebrate, or display fabricated readiness.
- It must never cover controls or increase page height to preserve an empty
  spectacle.

## Responsive compression

Responsiveness is defined by compression, not a naive vertical stack.

### Wide: 1440px and above

- 320px visible rail within its current 336px footprint.
- 1040px centered canvas maximum.
- 60/40 focus-to-console split.
- 62/38 Practice/Insight-to-Today split.
- Search and all three specific selectors visible.

### Mid: 1180–1439px

- Rail remains unchanged.
- Canvas uses 24px stage gutters.
- Primary instrument compresses to approximately 56/44.
- Robot scales down before controls narrow.
- Practice/Insight and Today remain side by side while each can meet its
  minimum useful width.
- Advanced filters may use one column inside the console.

### Compact desktop: 1024–1179px

- Rail remains visible under existing Classroom behavior.
- Primary instrument becomes two rows: focus bay above, full-width console
  below.
- The console uses a compact horizontal track where width permits; otherwise
  two logical rows.
- Lower regions stack with Today first only if Today contains the computed
  primary focus; otherwise Practice/Insight remains first.
- No control label truncates without a native tooltip or full selected value.

### Narrow: below 1024px

- Preserve the existing hidden rail and Classroom mobile-menu button behavior.
- Use 18px side gutters below 640px and 24px above it.
- Primary instrument becomes a single column.
- Robot becomes an ambient header object no taller than 150px.
- Search, Advanced, dependent selectors, and Start remain in document order.
- Search results open in-flow or in a safely bounded anchored layer.
- Practice/Insight and Today stack.
- No horizontal page scroll.

### Stress widths

Implementation must be reviewed at:

- 1514×1081 wide reference;
- 1280×800 mid;
- 1100×800 compact desktop;
- 1024×768 boundary;
- 820×1180 tablet;
- 390×844 phone;
- sidecar-docked state where available.

## State topology

Every region must receive an explicit visual treatment for these states.

| Surface | Required states |
|---|---|
| Search | idle, hover, focus, typing, loading-disabled, results, no results |
| Advanced | closed, open, filters active, clear available |
| Each select | placeholder, hover, focus, open, selected, dependent-disabled, loading-disabled |
| Start | disabled, ready, hover, focus, loading/navigation |
| Smart Drill | idle, hover, focus, navigation |
| Permission actions | available, loading-permission, locked |
| Insight | each of five slides, auto-play, hover-paused, dot-selected |
| Today | loading, error, empty, primary focus, supporting item, expanded |
| Analytics | loading, error, no data, partial data, populated, active tab, disabled tab |
| Spline | loading fallback, ready, failed/non-blocking |

Color alone cannot distinguish any state.

## Focus choreography

The intended eye path changes with the workflow.

1. **Entry:** Smart Drill action, then Drill console, then Today.
2. **Search focus:** search field and result layer become the local visual apex;
   robot and greeting recede.
3. **Filter configuration:** the dependent selector trace becomes prominent.
4. **Question ready:** Start becomes the hottest element in the console.
5. **Permission locked:** the unavailable action stays visible but recedes; the
   page must not appear broken.
6. **Analytics open:** Analytics heading and active view bar become the apex;
   the primary instrument remains present but quieter.
7. **Error:** the affected region owns the error. The whole page does not turn
   red.

## Functional invariant matrix

No row may change during implementation.

| Contract | Current authority | Verification |
|---|---|---|
| canonical landing route | `/classroom/drill` | direct load and history |
| old route behavior | `/mainhub` redirects | route probe |
| Smart Drill launch | `/drill`, adaptive mode, current `returnTo` | inspect location state |
| unified builder entry | every LR set-up action opens `stage=type-drill` | URL/history probe |
| filter semantics | OR within facets, AND across facets | unit and interaction tests |
| independent exact filters | PT, Section, and Q# never reset one another | interaction test |
| contextual options | hide unselected zero matches; retain selected values | unit and interaction tests |
| launch materialization | preview/manual selection launches exact QIDs | interaction and runner tests |
| permission gates | `useUserPermissions` flags | permitted and restricted fixtures |
| Analytics URL state | `stage=analytics&tab=…` | URL/history probe |
| insight behavior | five slides, seven seconds, hover pause, dots | timer/interaction test |
| Today data | existing hooks, merge, dedupe, priority | existing tests and fixture matrix |
| Today actions | Start/Continue/Reply/Resume/Review/Practice/Open | target audit |
| local hero state | preserved while embedded Analytics changes | browser probe |
| rail identity | same mounted rail during Classroom route changes | DOM identity probe |
| official drill | no visual or interaction changes | frozen-file diff and visual baseline |

## Accessibility under atmosphere

- Text and meaningful icons meet WCAG AA against every gradient and translucent
  layer.
- Focus remains visible over warm, graphite, and glass-adjacent surfaces.
- Selected, disabled, loading, locked, error, and completion states are not
  color-only.
- Controls retain accessible names and native semantics.
- Advanced retains `aria-expanded`; results retain an appropriate live region.
- Zoom to 200% must not hide launch controls or create horizontal page scroll.
- Support `prefers-reduced-motion`.
- Support forced colors/high contrast without losing control boundaries.
- Decorative traces, grid lines, light fields, and the robot are hidden from
  assistive technology where appropriate.

## Performance budget

Premium means instantly responsive.

- No new 3D runtime or second WebGL scene.
- Reuse the existing Spline scene and lazy boundary.
- No full-viewport canvas effect.
- Decorative background must be CSS or a small local SVG.
- Maximum one large blurred region.
- No filter backdrop over the entire scrolling page.
- Search input response and dropdown opening must remain immediate.
- No layout shift when Spline resolves.
- No decorative asset may block interaction readiness.

## Implementation boundary

Expected visual files after approval:

- `src/pages/AcademyMainhub.tsx`
- `src/components/mainhub/PracticeInsightStage.tsx`
- `src/components/mainhub/TodayFocusPanel.tsx`
- `src/components/mainhub/AnalyticsStage.tsx`
- `src/components/classroom/classroom.css`
- the smallest necessary Drill-route styling hook in the Classroom layout

Shared components may only change if the change is scoped and proven not to
affect other routes.

Frozen:

- `src/components/drill/official/OfficialQuestionPane.tsx`
- `src/components/drill/official/OfficialDrillFrame.tsx`
- `src/components/drill/official/OfficialDrillToolbar.tsx`
- `src/components/drill/official/OfficialSessionStrip.tsx`
- `src/components/drill/official/OfficialSmartDrillBar.tsx`
- `src/components/drill/official/OfficialAnswerNavigator.tsx`
- question data loaders, Supabase queries, permissions, route contracts, and
  launch logic except for refactors proven behaviorally identical

Do not use unscoped selectors that could reach `/drill`.

## Explicit anti-patterns

Reject the implementation if it becomes:

- a bento grid;
- a collection of rounded cards with shadows;
- a cyberpunk or gamer dashboard;
- a beige-and-gold “luxury” template;
- a glassmorphism showcase;
- a giant robot hero with controls pushed below the fold;
- a command palette that hides the PT/Section/Question path;
- a metrics dashboard with fabricated numbers;
- a mobile layout that is only the desktop layout stacked vertically;
- a static portfolio composition that breaks when labels are long, filters are
  open, search results exist, or an error appears;
- a Dribbble shot reproduced without full interaction and accessibility states;
- visually impressive but slower to search, configure, or launch.

## Acceptance criteria

### Visual

1. At 1514×1081, the canvas is visibly capped and centered with a real warm
   margin.
2. The primary instrument is no taller than 336px.
3. The default page reads as one composition, not three cards.
4. The console reads as a pane in the instrument, not a card on top of it.
5. The rail recedes but remains unmistakably part of the same product.
6. The robot is spatially integrated and does not dominate the viewport.
7. No more than two accent families appear in any local region.
8. No page-level horizontal overflow at any stress width.

### Functional

1. Every functional invariant in the matrix passes.
2. Search query `therefore` still returns the same six-result behavior.
3. Enter and Escape keyboard behaviors pass.
4. All dependent selector resets pass.
5. Smart Drill and specific-question URLs/state are unchanged.
6. Permission-locked Analytics and Journal remain locked.
7. Analytics URL tabs and browser history are unchanged.
8. Today actions preserve their destinations and `returnTo`.
9. The persistent rail survives route changes by DOM identity.
10. The official question experience has an empty diff and matching visual
    baselines.

### Quality gate

- `npm run typecheck`
- targeted existing tests:
  - `src/pages/AcademyMainhub.test.tsx`
  - `src/components/mainhub/smartLRQuestionSearch.test.ts`
  - `src/components/mainhub/TodayFocusPanel.test.tsx`
- add interaction coverage for keyboard search, selector dependency resets,
  analytics URL state, permission gates, and Spline fallback;
- browser verification at the full responsive matrix;
- compare before/after task time for:
  - Start Smart Drill;
  - search → open top result;
  - PT → Section → Question → Start;
  - open Analytics → change tab → return.

## Approval question

The one decision Joshua should judge before implementation is the concept
itself:

> Does “a warm reading room containing one dark precision instrument” feel like
> the right expression of premium LSAT U, or should the final direction be
> brighter and more editorial?

Everything else in this proposal follows from that answer.

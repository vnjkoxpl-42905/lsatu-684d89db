---
version: 1
slug: "src-features-activity-centre"
primary_target: "src/features/activity-centre"
related_targets: ["src/pages/ActivityCentre.tsx"]
---

# Activity Centre — surface brief

## Scope and mode

The Activity Centre wing: the home list (`/activities`), each Activity's intro, and the eight worlds that fill the runner's left column. Mode: **Experience** for the worlds (the student is inside the room the skill lives in), **Operate** for the answer loop on the right, which stays on the module's cream surface untouched.

## Direction (locked 2026-08-21)

**Eight worlds, eight universes.** Every Activity opens into a fully committed physical scene, saturated and material, scoped behind its wrapper class so nothing leaks into the shell. This is a deliberate, owner-approved departure from the app-wide monochrome-editorial restraint: the Centre is the one wing where the room IS the teaching instrument. The Coach and answer loop remain the constant; the room changes.

| World | Activity | Scene | Display face | Key hues |
|---|---|---|---|---|
| Polarity Chamber | Negation Station | obsidian void split by an aurora; survey-grid floor; prismatic glass plate | Italiana | ultraviolet 275°, polar cyan 190° |
| Specimen Lab | Vocab Rehab | Victorian naturalist's study; green wall, parchment bench, bell jar on brass plinth | EB Garamond | botanical green 162°, brass 40°, madder 8° |
| Signal Observatory | Spot the Relationship | celestial cartographer's dome; nebulae, twinkling stars, gilt ribs | Marcellus | indigo 233°, gold 45°, comet cyan 187°, rose 330° |
| Switchyard | Conditional Rephrase | midnight rail yard; sodium floods, fog, converging track fan, solari board | Barlow Condensed | steel-night 213°, sodium 36°, signal emerald 158° |
| Argument Atelier | Find the Conclusion | stained-glass workshop; lamp cone, dust, tinted panes in lead cames | Young Serif | umber 24°, lamp gold 40°, glass tints rotating |
| Debate Chamber | Rebuttal Rephrase | torchlit porphyry rotunda; bronze protractor inlaid in the floor | Cinzel | porphyry 356°, torchlight 36°, bronze 30° |
| The Press | Dumb it Down | hot-metal print shop; ink rollers, iron frame, vermilion proof red | Bevan | iron 20°, paper cream 42°, vermilion 14° |
| The Loom | Spot the Callback | indigo dye-house; warp threads, linen sheets with selvage, saffron thread | Alegreya | indigo 236°, linen 43°, saffron 42° |

Statement/body text across dark worlds runs Spectral 300; micro-labels stay on the shared `--ac-mono`.

## Standing rules

- **Scene layers are furniture, not content.** Every world's atmosphere lives in one `aria-hidden` layer stack (`.po-room`, `.sl-room`, …) painted below `z-index: 2` content; tested DOM never gains or loses nodes for scenery.
- **Meaning colors survive grayscale.** Hue is atmosphere on top of geometry/weight/position, never the only carrier of a verdict. Emerald still means "earned/true" wherever it appears.
- **One orchestrated entrance per world**, durations pinned by tests (1800–2500ms), always skippable, `useReducedMotion` short-circuits to `onDone()`.
- **Reduced motion**: every world CSS ends with a `prefers-reduced-motion` block; continuous loops stop rather than speed up.
- **The home is a hall of doorways.** Each `ActivityCard` carries a pure-CSS diorama of its world (`activity-scenes.css`, keyed by slug); the card's facts stay on the module paper below the scene. The intro borrows `--act-accent` from its world via the registry.
- **Registry accents** (`worlds/registry.tsx`) are each world's signature hue and feed the card eyebrow + intro accent.

## Unresolved

- Negation Station is not in `SEED_ACTIVITIES`, so its diorama only shows once assigned.
- Progress ornaments (chips, plaques, mileposts, seals…) remain unreachable from the runner; feeding them real verdicts is its own piece of work.

## Read, Recall, Colour door (locked 2026-09-05)

The two RRC doors (`SectionLibraryLaunch`, `SectionLaunch`, both drawn by `SectionLaunchFrame`) are a committed world of their own, mode **Persuade** at the top and **Operate** in the slab. Joshua's brief: a layered, high-end landing page in the spirit of heylemon.ai (cream ground, painted panels, serif display with italic emphasis, mono micro-labels, a dictation demo) with fora.so's depth-plane hero, and bold step 1 to 4 instructions.

- **World:** one dusk. The runner's indigo (`#1a1635`) lifted into a sky over a painted meadow, cream paper (`#f6f3ea`) beneath. Display is Fraunces at opsz 144; body Inter; labels IBM Plex Mono. Marigold marks the Colour step, emerald marks a carried detail, nothing else is coloured.
- **Hero:** `MeadowScene` paints five depth planes generatively in SVG (seeded ridges, seeded grass blades, feTurbulence grain) so no raster ships; each plane rides `useScroll` at its own rate and the foreground grass crosses in front of the demo card. The headline blurs and recedes on the same scroll value.
- **Signature moment:** `RecallDemo`, a looping performance of the method on a synthetic stimulus, labelled as such, whose text literally dissolves at the Recall step.
- **Steps:** four cards, each with a small drawn scene, doubling as the ARIA tablist the tests already contract (`sl-beat`, `sl-beat-tab-N`, `sl-beat-panel`). The full briefing is the second tab of the drawer.
- **Tokens:** scoped to `.sl` as `--rd-*`. The design detector reports them as outside DESIGN.md; that is the sanctioned-world exception above, not drift.

## The Report Card (locked 2026-09-08)

Its own world, scoped to `.rc` in `report-card.css`. Joshua's brief: highly
organised, easy to run through, high-end, with her recording and the standard's
side by side and the transcript following the sound. Explicitly **not cream, not
emerald, and not grey** ("the cream paper colour is overdone and too AI
looking", "I don't want emerald", "it should be much more colorful"). The second
sanctioned departure from the wing's surface after the RRC door.

- **Two grounds.** A deep plum console (`oklch(0.245 0.058 312)`) holds the
  verdict, the transport and the ledger; a violet-cast white page
  (`oklch(0.979 0.008 312)`) holds everything she reads at length.
- **Colour means a KIND of feedback, never a severity.** The mechanic is
  Grammarly's, which colours by category and reserves red for outright errors.
  Four fixed tones: **Detail** plum-rose, **Read** teal, **Colour** gold,
  **Method** indigo. A miss is the colour of the thing it is a miss of, which is
  what stops twenty-two stimuli of corrections reading as a heat map of failure.
- **Signal magenta is sound, not a category.** It marks the line currently
  playing and nothing else, held at hue 328 so it separates from the
  plum-rose dropped chips it shares a line with.
- **Hues chosen from research, not taste** (Firecrawl, 2026-09-08). Saturated
  right now: acid yellow, electric cobalt, orange and coral, warm sand and
  terracotta, black plus one neon accent. Under-used: violet and plum, soft
  cyan, dusty rose as a field, complex cool neutrals. Green and cream are the
  owner's veto; orange-red was this file's first answer and is on the over-used
  list. The neutrals are tinted toward violet the way Material 3's baseline is
  (`#fffbfe` paper, `#7d5260` plum tertiary), a system built to hold AA.
- **Band is fill, not hue.** The ledger's marks differ by how full they are, in
  gold; a recital is dashed and a lost one is a hollow rose ring. It survives
  grayscale, which is what lets category own the colour.
- **One stimulus at a time.** Twenty-two accordion rows became a ledger of
  twenty-two marks plus one open stimulus in a fixed order: the passage, what
  you held, what slipped, your Read, line by line, what you said, next time.
- **No Detail arithmetic on screen.** A Detail is our grading unit and she has
  never seen one enumerated, so "20 of 21 details" is gone: `howMuch()` says
  "Almost all of it came back" instead (Joshua, 2026-09-08).
- **Contrast is measured, not assumed.** `scripts/_rc_contrast.mjs` converts
  computed colours through a canvas (Chrome serialises them as `oklch()`) and
  every text node clears 4.5:1 on its own ground, in the default, playing and
  clean states.
- **Type ramp:** Fraunces display, Lexend body, IBM Plex Mono labels. The design
  detector reports the sizes as outside DESIGN.md; that is this sanctioned world,
  not drift, the same exception the RRC door's `--rd-*` tokens carry.
- **Harness:** `/src/dev/report-card-preview.html` renders it at twenty-two
  stimuli without `App.tsx`. `?state=clean|faults|partial`, `?playing=N` to
  freeze the playhead on a line. `scripts/_rc_shots.mjs` captures the matrix.

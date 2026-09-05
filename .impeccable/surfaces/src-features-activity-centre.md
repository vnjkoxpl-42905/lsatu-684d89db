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

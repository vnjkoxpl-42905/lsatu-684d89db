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
- Progress ornaments in other worlds still require per-world runner reachability and earned-outcome verification. Observatory seals are wired to real correct outcomes, including restored completions; revealing an answer does not award a seal.

## Read, Recall, Colour door (locked 2026-09-05)

The two RRC doors (`SectionLibraryLaunch`, `SectionLaunch`, both drawn by `SectionLaunchFrame`) are a committed world of their own, mode **Persuade** at the top and **Operate** in the slab. Joshua's brief: a layered, high-end landing page in the spirit of heylemon.ai (cream ground, painted panels, serif display with italic emphasis, mono micro-labels, a dictation demo) with fora.so's depth-plane hero, and bold step 1 to 4 instructions.

- **World:** one dusk. The runner's indigo (`#1a1635`) lifted into a sky over a painted meadow, cream paper (`#f6f3ea`) beneath. Display is Fraunces at opsz 144; body Inter; labels IBM Plex Mono. Marigold marks the Colour step, emerald marks a carried detail, nothing else is coloured.
- **Hero:** `MeadowScene` paints five depth planes generatively in SVG (seeded ridges, seeded grass blades, feTurbulence grain) so no raster ships; each plane rides `useScroll` at its own rate and the foreground grass crosses in front of the demo card. The headline blurs and recedes on the same scroll value.
- **Signature moment:** `RecallDemo`, a looping performance of the method on a synthetic stimulus, labelled as such, whose text literally dissolves at the Recall step.
- **Steps:** four cards, each with a small drawn scene, doubling as the ARIA tablist the tests already contract (`sl-beat`, `sl-beat-tab-N`, `sl-beat-panel`). The full briefing is the second tab of the drawer.
- **Tokens:** scoped to `.sl` as `--rd-*`. The design detector reports them as outside DESIGN.md; that is the sanctioned-world exception above, not drift.

## Reading Center LR Recall entry correction (2026-10-16)

Joshua now wants `/reading-center/rrc` to make choosing a drill and finding its instructions/examples obvious. This supersedes the 2026-09-05 **Persuade** priority for this Reading Center entry, not the approved visual identity or other Activity Centre worlds. The current published page has not yet been redesigned for this correction.

Apply the activity-entry constraints in [DESIGN.md](../../DESIGN.md): one dominant task action, explicit tutorial labels, no repeated summaries, four steps beside the recorded examples, and truthful attempt labels. Joshua requested removing the hero tagline and the standalone Retelling/Reciting/Listing comparison, shortening the example introduction, naming it as a tutorial/example, and labelling the three selectors Example 1 to Example 3. Preserve necessary method requirements within the instructions.

The initial audit proposal to move the synthetic RecallDemo was rejected during the clarification interview. Approved replacement, 2026-10-16: keep the opening purple scene and animation in place, without its tagline. Read the full instructions replaces the entire purple area's contents with all four existing step boxes and their text together. Longer unchanged briefing text sits under Read more, closed initially. Watch examples switches that same area to one paused player with Example 1 to Example 3 selectors. Video views return to instructions; Back to home restores the introduction locally. Choose a section remains available in every view. Use smooth, reduced-motion-aware transitions and preserve the white surfaces, indigo/lavender, typography and illustration identity. Do not replace only the inner white panel or navigate away from the page.

Remove the original lower-page instructions/videos, the Before you start aside and the standalone comparison cards. Watch instructions is reserved for a separate future full-instructions video and stays absent until its real asset exists. Keep all three existing example recordings. Section buttons become Start section / Start new attempt without changing attempt behavior. Approval authorizes implementation; publication requires separate verification.

Behavior boundary: Choose a section scrolls/focuses the list. A started unfinished attempt is not currently resumable from that list; Run it again creates a new attempt. Do not promise Resume without implementing and verifying it. Preserve completed report links and all attempts. Detailed analytics remain in Reading Progress, summaries on Dashboard, with the existing RRC-only access exception preserved.

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

## Spot the Relationship practice correction (2026-10-16)

### Use labels and instructions the student can act on

- Label the prompt Sentence and the response Your answer. Keep The Field, The Figure, Rung, raw difficulty categories and other internal metaphors out of task and feedback UI. Retain authoring/parser metadata internally and preserve the scoped scene identity.
- Omit shortcut helpers beneath the answer input by default. Retain Command/Control + Enter submission, keyboard navigation, accessible controls and visible focus.
- Ask the learner to name each relationship and quote the words that signal it. Require a type and supporting quotation for every relationship type present. Use this wording consistently across instructions, placeholders and fallback feedback.
- Explain the sentence's meaning and limits rather than adding editorial classifications. In item 1, reaching 28 degrees is necessary for opening but does not alone guarantee it. Comparison guidance covers equality as well as more/less; item 12's as strong as must not receive a superiority-only caption.

### Count completed work independently of position and accuracy

Use a visible, accessible bar backed by resolved-question state, separate from question position, accuracy and earned relationship seals. Correct resolution, answer reveal at the existing cap or by deliberate choice, and deliberate unjudged continuation can complete a question without all establishing correctness or mastery. At question 48 with the final answer unresolved, 47 of 48 are completed; only final resolution earns 100%. Give the bar a clear name, range/current value and completed-count text. Keep status understandable without color and use a static reduced-motion treatment.

Observatory seals reflect real correct outcomes, including restored outcomes from the saved attempt log. A revealed answer may show the full illustration but must not light an unearned seal. Keep earned state distinct from both completion and what is displayed for study.

### Keep feedback useful through correction and reveal

- Target a first unsuccessful hint to the actual response and missing or mistaken part. Preserve valid work without inventing praise or a diagnosis. Do not disclose unwritten answer indicators or list missing types. Keep the full authored answer and explanation hidden while that first unsuccessful attempt remains unresolved.
- Retain the learner's written response and useful hint during editing and retry. A retry must not clear the response or make the prior hint disappear.
- Correct answers show the full authored explanation, including indicator, meaning and relevant limit, without requiring Show answer. Explicit reveal and the existing attempt-cap resolution show the full answer plus explanation. The left illustration then agrees with the shown answer rather than continuing to diagnose the earlier response. Preserve the earned verdict and attempt policy.
- Put feedback, the shown answer where applicable, and the explanation before Next or Finish in reading and keyboard order. When a question has resolved and an authored explanation is available, suppress corrective advice to retry; keep its earned verdict visible.
- Normalize only the exact legacy fallback through relationshipFeedback at the frontend presentation boundary. Use: Check that each relationship type matches the words you quoted. Reread the whole sentence for any relationship you missed. This prevents rejected words-create-it wording from returning through a fallback. Keep other grader feedback and earned verdicts intact. Presentation repairs must not rewrite historical responses, assignment snapshots, grading keys or rubric data.
- Keep service failure visibly unjudged with a truthful retry/continuation path. Evaluate semantic verdicts and feedback accuracy/helpfulness separately; a lexical disclosure guard alone does not establish teaching quality.

### Verify the complete practice state sequence

Check exact correct, wrong type, missing indicator, swapped pairs, first hint, editing/retry-to-correct, second unsuccessful attempt, explicit reveal and Coach failure. Exercise equality item 12, multi-type item 29, contextual comparison item 47 and split indicator item 48. Verify completion at 0/48, 1/48, resume, 47/48 on entering the last question and 48/48 only after final resolution. Check earned seals independently of reveal, legacy fallback normalization, suppression of resolved retry advice and explanation-before-Next order. Inspect keyboard operation, named textarea/loading status, screen-reader progress/status, contrast, reduced motion and narrow/mid-width/wide/docked layouts. Both panels must agree on the answer being shown without changing its earned result.

The development-only /activity-lab provides shell/spot-the-relationship for composed layout and observatory for all 48 items and arrival/drawn/sample-answer states. Reset must clear the response, result, hint and progress even on question 1; activity identity and preview-run identity must remount the answer state. Harness checks do not establish integrated Coach, persistence or production behavior. See [DESIGN.md](../../DESIGN.md) for shared constraints; the vault's wiki/COPY-CORRECTIONS.md and existing bootcamp-builder teaching-preference copies retain dated correction history.

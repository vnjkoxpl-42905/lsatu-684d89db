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

### Later introduction correction: writing and hierarchy (2026-10-16)

Joshua rejected the formulaic signal-it slogan, Worked example, What to write, the tiny-title/giant-slogan/small-subtitle stack, and gold controls on beige. This supersedes the earlier signal-it recommendation below. Signal is not prohibited in scientific content or ordinary contextual use; beige is not prohibited everywhere. Do not patch the same sentence by swapping another abstract synonym into it.

Use the actual activity title, ordinary complete instructions and Example. Keep every relationship type and its supporting quotation required, without asking for an extra essay or teaching grader internals. Read the copy aloud against the teaching voice standard. Remove repetition between lead and steps. Keep technical type names consistent.

Written instructions and the example lead the page. A smaller inline video supports them in a side column on wide screens and follows the instructions and Start on narrow/docked screens. Preserve captions, controls, no autoplay, a position-neutral failure message, one Start/resume action, Exit and truthful save/preview status. Do not reintroduce transcripts or attempt-policy paragraphs.

The entry uses existing neutral Workroom semantic variables, established UI sans typography, readable 16px body copy, a restrained title scale, dark primary controls, hairlines and visible focus. No gold-on-beige treatment, brown secondary text, oversized serif slogan or decorative premium effects. The actual Activity Centre pins warm, always-light variables locally. Override those values for this entry with the defined neutral Workroom light values, and verify with activity-centre.css loaded. Dark ancestor tokens must not turn this always-light entry beige or change its light policy. A fixture that omits the host stylesheet is insufficient proof. The Observatory runner and existing film artwork retain their own scope.

See the [visual record](../../docs/design-evidence/spot-intro-2026-10-16/README.md) for rejected/revised screenshots, copy decisions and measured checks. These constraints come from Joshua; the replacement design is not claimed as his approval until he sees it. The DESIGN.md entry checklist links this brief because the context loader does not load surface briefs automatically.

### Use labels and instructions the student can act on

- Label the prompt Sentence and the response Your answer. Keep The Field, The Figure, Rung, raw difficulty categories and other internal metaphors out of task and feedback UI. Retain authoring/parser metadata internally and preserve the scoped scene identity.
- Omit shortcut helpers beneath the answer input by default. Retain Command/Control + Enter submission, keyboard navigation, accessible controls and visible focus.
- Require a type and supporting quotation for every relationship type present. The later Spot intro correction supersedes the recommendation to use signal-it wording. Use ordinary task instructions and retain the complete answer requirement.
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

### Keep the answer contract semantic and consistent (2026-10-16)

- Audit all 48 sentences independently of the key. Match each credited type to words that actually express it in context; draws/cure/lags/silted/follows/inflate do not independently express the cross-clause cause in their audited items.
- Condition explanations must retain direction: provided is sufficient in item 40; only if and only where state requirements; unless introduces an exception with the original main-clause negation preserved. Replace ambiguous temporal Since in item 35 with Because.
- Include valid alternative comparisons such as larger in item 31, and counteracting causal effects such as offsets in item 46. Do not require all alternatives or imply that an exception actually occurred. Use contains in item 34 to remove the ambiguous yields wording.
- Align type synonyms, indicator alternatives, split endpoints and exact wider quotations across instant matching, AI keys and the stage. Full spans such as harder stone than must not produce a false not-identified diagnosis. Preserve pair binding, endpoint order and the affirmative-only referral boundary.
- Keep quoted/singled-out answer disclosure blocked while ordinary more/less in hint prose remains usable. Explicit reveal, correct resolution and unresolved retry retain their separate disclosure rules.
- Scope canonical explanation overlays to this activity with matching prompt and order; use saved text for unmatched/reworded historical items. Do not overlay keys or earned state. Remove stale flux commentary from item 47. Publish revised content separately from explanation presentation repairs and preserve existing historical work.
- Add regression cases for removed weak causal indicators, newly valid alternatives, synonyms, split spans, partial stage recognition, hint disclosure and conditional direction. Static review approval is neither a live grader test nor deployment proof.

### Verify the complete practice state sequence

Check exact correct, wrong type, missing indicator, swapped pairs, first hint, editing/retry-to-correct, second unsuccessful attempt, explicit reveal and Coach failure. Exercise equality item 12, multi-type item 29, contextual comparison item 47 and split indicator item 48. Verify completion at 0/48, 1/48, resume, 47/48 on entering the last question and 48/48 only after final resolution. Check earned seals independently of reveal, legacy fallback normalization, suppression of resolved retry advice and explanation-before-Next order. Inspect keyboard operation, named textarea/loading status, screen-reader progress/status, contrast, reduced motion and narrow/mid-width/wide/docked layouts. Both panels must agree on the answer being shown without changing its earned result.

The development-only /activity-lab provides shell/spot-the-relationship for composed layout and observatory for all 48 items and arrival/drawn/sample-answer states. Reset must clear the response, result, hint and progress even on question 1; activity identity and preview-run identity must remount the answer state. Harness checks do not establish integrated Coach, persistence or production behavior. See [DESIGN.md](../../DESIGN.md) for shared constraints; the vault's wiki/COPY-CORRECTIONS.md and existing bootcamp-builder teaching-preference copies retain dated correction history.

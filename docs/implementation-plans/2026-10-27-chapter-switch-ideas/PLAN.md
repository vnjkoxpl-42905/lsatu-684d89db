# Chapter choice switch: design review only

## Goals
Find a restrained, tactile 21st.dev-inspired three-way control for Lessons, Drills and Flashcards on each conditional bootcamp Home chapter card. User disliked tiny arrow links, then plain white button boxes; explicitly requested two directions before app changes, then asked for 21st.dev switch inspiration and Gemini ideas through geminex-loop. This turn ends at a recommendation/proposal, not implementation.

## Non-goals
No app source edits, installation, dependency changes, account changes, commit, push or publish. Do not change course content, completion, editions, permissions or assignment scope. Do not treat design-plan approval as user approval to implement.

## Evidence and recon
React/Vite app, existing scoped CSS, Inter and Georgia, warm paper/charcoal family. Current Home has seven image-cover chapter cards with progress and a conditional 2- or 3-choice navigation (some chapters have no relevant flashcards). Source: src/bootcamps/conditionals/components/OpeningCourse.tsx CourseHome; opening-course.css .oc-topic-actions and final scoped overrides. Current new Practice and review panel is charcoal with tactile surfaces and no white destination boxes. Existing chapter destinations already have a Lessons/Drills/Flashcards switch.

Read repo AGENTS.md, applicable supplied root instructions, design/README.md and design/principles.md. No nested AGENTS under the relevant subtree found in preceding read-only audit. This review is ideas only; review source if needed but do not inspect unrelated files.

21st.dev metadata searches found Segmented Control Tabs by cnippet-dev (24931), Segmented Tabs by micka_design (26923), Segmented Control by halaska-studio (34763), Segmented Control by kuratlielia (35020), accessible segmented radio by ddoemonn (23552). Full source retrieved for Halaska 34763, MIT, no npm dependencies. Public reference https://21st.dev/@halaska-studio/components/segmented-control. It uses a track, measured sliding thumb, controlled value, radio semantics and arrow-key selection. The source also has backdrop blur, small gray inactive text, outline:none, broad transition:all, and lacks explicit reduced-motion handling. Do not copy these weaknesses. The previously retrieved micka component is also a valid visual reference but not a mandate to add BaseUI.

## Proposed direction to critique
Recommend a single recessed warm-stone track holding three compact choices with a tactile highlight responding to pointer/keyboard focus. Labels stay Lessons / Drills / Flashcards at 14px and minimum 44px hit height; no arrow icons. Depth comes from the shared track and lit edge/contact shadow rather than three isolated white boxes. Preserve Inter/Georgia, existing cover artwork, warm charcoal review panel and clear grouping of progress versus choosing work.

Important semantic decision: Home currently offers destination links. Earlier user explicitly wanted one-click access to lessons/drills/cards. Default proposal therefore uses real router links in a labelled nav, with no permanent active thumb, aria-selected or radio state on Home. A hover/focus highlight is transient, hidden when neither is present; it must not masquerade as selected work. Clicking opens the existing corresponding scoped workspace immediately. The real chapter workspace does have selected-route state and can share the visual language, with aria-current on the actual route. No navigation delay just to play an animation.

Alternative idea for user consideration only: genuine per-card tabs with a persistent thumb, updating an actual local panel containing a relevant chapter preview and an explicit Open action. This creates an extra navigation step and height/content complexity across seven cards, so it is not the default. Do not silently introduce it or pretend a selected tab exists while showing unrelated content.

Please independently critique this recommendation and suggest a stronger switch idea if appropriate. Specifically test whether the destination-switch shape still misleads, how to show no-active Home state without looking unfinished, and whether a genuine local tab behaviour is worth asking Joshua to approve. Concrete design ideas and tradeoffs matter more than agreement. Preserve the scope and data contracts.

## Homepage detail work after user selects a proposal
Align common card insets and baselines; simplify competing tiny helper labels; distinguish required steps from lesson review when optional work changes denominators; consistent control radii and focus/hover/pressed states. Progress calculations stay unchanged. Available-only controls remain truthful and fill width evenly for two choices. No made-up cards or progress.

## Validation / proof
This turn: source-backed 21st lookup, actual Gemini result/model/status, rendered desktop and phone proposal with no overflow, host readback of its limitations. No runtime implementation approval claimed. Later authorized build: navigation tests, typecheck, actual Home keyboard/pointer/phone/reduced-motion inspection, scoped routes and empty collections, no completion writes when choosing. Respect app instruction files and preserve pre-existing local work.

## File list
Proposal artifacts only under this docs folder and .taste-skill/chapter-switch-ideas-20261027. Any future implementation requires a separately approved final design; likely owns existing OpeningCourse.tsx and scoped CSS, with meaningful existing navigation regressions.

## Open risks
The word switch can imply a persistent local choice; direct navigation has no meaningful selected Home state. Full 21st source is visual/behavioural inspiration, not production-ready as-is. Some chapters have no flashcards. Width must fit 320-390px without tiny labels or horizontal scrolling. User has not approved either prior direction or a new interaction.

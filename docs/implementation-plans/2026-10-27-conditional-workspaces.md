# Conditional chapter workspaces

## Goal and authorization

Organise and polish the screens opened by Lessons, Drills and Flashcards. Joshua requested implementation, Taste and independent Claude grilling, then confirmed a switch for each chapter and asked to use the 21st.dev MCP for component inspiration. Work stays local and uncommitted. No push, publishing, production assignments or release-gate changes.

## Confirmed evidence and decisions

- Existing chapter/topic cards and saved progress are already implemented. The remaining problem is their destinations: three unrelated list compositions, a combined title on the Lessons index, next actions that ignore the selected kind/chapter, and fragmented card discovery.
- Preserve warm paper, soft charcoal, landscape only as a secondary identity detail, local LSATU Inter and Georgia. Taste v2 path: C:/Users/Joshu/dev/ai-os/.agents/skills/design-taste-frontend; pinned commit12af471f627f866411b4bd785b19646d3672784c. App-screen workflow, not marketing-page motion rules.
- Keep the approved editorial-greeting direction (seed1697682538). This is refinement of its browse/list sections, not a new shell. See .taste-skill/conditional-visual-v2/direction.
- 21st.dev search retrieved Segmented Tabs by micka_design, demo26923, https://21st.dev/@micka_design/components/tabs-base. Adapt its compact neutral segmented treatment; do not copy its BaseUI dependency tree or install new packages. This is navigation between URL-backed views, so use real links inside labelled nav with aria-current, not fake tab-panel semantics. Use visible focus,44px targets, pressed/hover feedback and reduced motion. No page entrance animations.
- Glossary: src/bootcamps/conditionals/CONTEXT.md. Lessons teach; drills are course exercises; flashcards are recall/review collections; imported activities and native guided sets remain in the Practice centre. The existing global home and Practice centre remain available.

## Observable outcomes

1. A chapter workspace has one compact chapter heading, an explicitly labelled chapter completion summary, and a persistent-looking Lessons / Drills / Flashcards segmented navigation. Every switch retains the same authorized chapter, assignment and edition. Browser Back and direct links remain valid.
2. A plain chapter link defaults to Lessons. Explicit courseContent=drills selects Drills. The chapter heading and required completion denominator do not change between views. Overall chapter completion is labelled as such and separate from the selected list's count.
3. Global Lessons opens a Lessons screen with notes only; global Drills opens Drills with drills only; global Flashcards opens a complete collection chooser. They share the same composition and switch, retaining an explicitly chosen chapter when switching. Do not carry a saved-status filter from lessons/drills into cards, because cards have different state semantics.
4. The most prominent continuation link is the first unfinished required step within the current authorized chapter and content type, before the optional status filter. If none remains, say all required lessons/drills in this scope are complete and allow review. Optional-only/zero-required work must never imply completion; choose an optional entry clearly labelled optional or omit continuation. A completion status filter must not redirect the main action outside the selected chapter/type.
5. Lessons and drills use one aligned working-list composition, grouped by chapter on global indexes, with lesson number/task, short authored description, optional marker, saved status and direct Start/Continue/Review action. Keep aria-describedby descriptions/status from the previous pass. Only started drills open run=1. Projected completed work remains read-only until the existing explicit resume action.
6. Flashcards are one library grouped as Concepts, Indicator words and Sentence translations. Surface every permitted existing collection, using relevantCourseCardLinks as relevance authority intersected with existing allowed decks. Do not create or claim new decks for Chapters2 or4-7. One library filter covers all collections; chapter scope applies to the entire library. A chapter without matching authored cards says no flashcards are available for this chapter and retains Lessons/Drills navigation.
7. A home chapter's Flashcards action opens the relevant collection chooser, not cards[0]. Keep existing lesson-specific explicit deck/card links; their purpose is a precise card. RelatedCourseWork's general Flashcards for this topic link opens a suitable chooser scoped by its chapter, with an authorized from lesson retained for returning.
8. Selecting a library collection opens its existing native or sentence player, preserving actor storage, rating history, config and current-card rules. A deliberate courseChapter browsing context may be re-added to library-to-player links and their return/config links, only after validation against authorized steps. Ordinary cross-destination helpers still clear list query keys. Retain existing valid from lesson; never use arbitrary redirect values. Do not add writes on mount or when switching/filtering; card Next/Back/rating keeps its native writes.
9. Active deck/card players get a consistent compact return/header treatment; player internals and question content are unchanged. Remove the duplicate SkillPracticeLinks cardsOnly section from the tools host once its collections are present in the unified library. Non-card practice remains untouched.
10. At1440,768,390 and docked1024 CSS pixels: no horizontal page overflow, legible row text, usable controls and selection, consistent edges. Narrow layouts stack metadata below titles and keep the switch on one row without truncating labels. Empty and no-authorized-work states remain truthful.

## Implementation boundaries

- Add a small shared CourseBrowseNavigation component and pure URL helper, with explicit chapter context. Keep actual route/access providers unchanged.
- OpeningCourse.tsx: replace the three browse headers/lists with shared composition, scope next actions, default chapter Lessons, wire switch and chooser links. Retain whole-course home next-step semantics and completion writer.
- FlashcardTools.tsx: coherent library and filters, consistent player headers/returns; SkillPracticeHub.tsx: only sentence-card return/config browsing context when needed. Do not remount players merely to open/close filters.
- Break a potential helper cycle by moving flashcardUrl into a small pure module and re-exporting it from FlashcardTools for existing imports; courseCardLinks uses the pure module. No behavioral change to precise legacy card URLs.
- Put new browse styles in a scoped stylesheet rather than another unbounded chain of global overrides. Use current tokens and44px controls. Reuse existing icons sparingly; no decorative icon boxes, huge banners or redundant buttons.
- Tests cover real edition-adjusted registries and focused assignment subsets. Inspect existing local diff before edits and preserve it. HEAD remains bebb4948771d18d323a865f27e26fccfba756b64.

## Proof and evidence

Baseline renders: .taste-skill/conditional-destinations/before-lessons and before-cards; compare matched final views. Save a drills baseline too. Record critique, actual screenshots opened and any inspector allowances in docs/design-evidence/conditional-workspaces-20261027/README.md.

Commands:
- npm run test -- --run src/bootcamps/conditionals/courseNavigation.test.ts src/bootcamps/conditionals/courseCardLinks.test.ts src/bootcamps/conditionals/components/OpeningCourse.navigation.test.tsx src/bootcamps/conditionals/components/OpeningCourse.test.tsx src/bootcamps/conditionals/components/FlashcardTools.test.tsx src/bootcamps/conditionals/components/SkillPracticeHub.test.tsx src/bootcamps/conditionals/routes.test.tsx src/bootcamps/conditionals/routes.andOr.test.tsx --no-file-parallelism
- npm run typecheck
- npm run build
- git diff --check
- node C:/Users/Joshu/dev/ai-os/.agents/skills/design-taste-frontend/scripts/lint.mjs --app [changed browse source files]
- node C:/Users/Joshu/dev/ai-os/.agents/skills/design-taste-frontend/scripts/inspect.mjs --app [local preview URL] --allow palette-cream --out [separate after folder per destination]

Assertions: each switch keeps chapter+assignment+edition and correct active state; click Home chapterFlashcards -> chooser with all relevant sets; list titles and next-action kind/chapter match; note/drill progress counts remain edition-adjusted and unfiltered; zero-required remains optional; no hidden unauthorized collections; library filter covers core and sentence cards; precise old card links/returns still work; no new anonymous key; store.save/resume zero calls on switch/filter-only interactions; no nested links/buttons.

Manual browser checks: chapter1 Lessons -> Drills -> Flashcards -> sentence player -> return, chapter3 chooser includesG3/G4 sentences, Chapter4 card-empty state, global indexes, focused assignment subset, keyboard navigation and reduced-motion feedback. Read actual rendered desktop/tablet/phone screenshots and docked overflow. Do not claim production signed-in acceptance: this development preview remains gated out of production. Production build verifies bundling; no user records are changed.

## Review protocol and risks

Codex hosts/plans/builds. Claude independently reviews the plan and fresh scoped implementation. CLI model defaults, no override requested; record observed model. Max5 completed plan rounds,2 fix attempts and2 inspection rounds. Runtime/build references are read from the installed claudex-loop skill. Pre-build snapshot includes current local files, because the diff against HEAD includes earlier authorized work. A scoped inspection is not whole-repository certification. New final fixes after the inspection budget receive host proofs and are explicitly unreviewed, never labelled independently approved.

## Review pins after round1

- Keep parseCourseListFilters defaults unchanged: absent/unknown content means all. Resolve effective browse content in destination code only: global Lessons always notes, global Practice always drills, chapter missing content defaults lessons. Explicit legacy courseContent=all remains a mixed chapter list with an honest All work heading/current label and the three regular destination switches; no lesson-only claim. Existing chapter/route assertions must cover these cases.
- Both chooser and native/sentence player links, configuration links, library filter changes and return-to-chooser links preserve validated from and courseChapter deliberately. Validate from against all authorized notes; chapter against all authorized steps. Keep return-to-lesson as url(validatedNote.id). Library scope never grants card access. Switching to lessons/drills deliberately drops from and card settings.
- Check every FlashcardTools caller. The actual bootcamp host always provides edition-adjusted authorizedSteps. Preserve the compatibility allowed-only API: when no authorizedSteps are supplied, permitted core decks still render from allowed, and no unsupported sentence sets or chapter options are invented. Do not silently drop core decks. Test this case explicitly.
- Registry-derived chapter relevance is the spec. Test actual authorized legacy and full-edition registries for Chapters1-7, comparing relevantCourseCardLinks identities. Use the existing helper mapping, including mixed indicators only when the scoped material has bothG1/G2. Do not hard-code cards based only on chapter numbers. Chapter3 and Chapter4 browser fixtures are selected from the real mapping.
- All helper references to OpeningCourseUrl remain import type. The pure flashcard URL module has no runtime component imports. Typecheck and bundled production output verify module wiring; no new lint tooling dependency is needed.

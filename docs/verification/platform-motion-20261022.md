# Platform motion verification, 2026-10-22

Implemented on `codex/platform-motion-20261022`. Local only. No push or deployment.

## What moves

- Main classroom sidebar active background: GSAP transform-only travel, 380ms power3.out.
- Classroom destination/view content: scoped GSAP entrances and native-scroll reveals; persistent headings/navigation remain still.
- Mobile left navigation and right section list: 300ms entrance, 180ms exit; modal focus and body scroll lock remain active through exit.
- Reading Center entry pages, teacher workspace rooms and student dossier tab bodies: local ownership prevents ancestor/descendant double animation.
- Whiteboard toolbar: entry only. Drawing canvas is explicitly excluded. Active reading, recall and drill work remains stable.
- Existing RC Sheet and question-finder portal animations retain their own lifecycle; GSAP does not transform their ancestors or replace their focus management.

## Signed-in browser checks

Used the real application at `http://127.0.0.1:8120`, signed in normally by Joshua. Normal backend, not the synthetic RC harness. Verified with Codex browser interactions and screenshots:

| Area | Checks |
|---|---|
| Classroom | Home, My Work, Review, Library, Progress, Practice, Inbox navigation; selected label contrast |
| Practice | LR/RC switching, RC builder entry, Customize drawer open/Cancel, question finder open/close |
| Progress | Overview, History, scroll layout; responsive matrix below |
| Reading Center | Dashboard and Speed Reading navigation; corrected selected label contrast; SVG icons replace broken icon-font words |
| Teacher | Workspace and student list entry, existing student dossier/Notes tab; surrounding navigation remains stable |
| Whiteboard | Toolbar entrance and untransformed drawing canvas, without choosing a student or drawing |
| Mobile panels | Left menu and right Notes list entrance/exit; background scroll lock; focus restored after close |
| Reduced motion | Real mobile menu opens with transform none; navigation closes it immediately and restores body overflow |

Progress page geometry at actual CSS viewport widths: 320, 390, 768, 980, 1440. No document horizontal overflow. Reading Center library additionally inspected at 390px. Internal analytics tables/carousels retain their intended horizontal scrolling.

Screenshots and a timestamp-preserving real-navigation recording are in `C:/Users/Joshu/Downloads/LSAT-U-Motion-Studies-2026-10-22/`. `platform-navigation.mp4` records Home, Library and Progress navigation from the signed-in application.

## Automated proof

- `npm run typecheck`: passed.
- `npm run build`, including prebuild content checks and postbuild canonical-content check: passed.
- 148 tests across 11 targeted files: passed. Covers motion identity and exclusions, rail measurements/cleanup/reduced motion, overlay presence/focus/scroll-lock/reopen/failure paths, shell navigation, destinations, Analytics, Practice and Reading Center navigation.
- Existing non-fatal build warnings remain: ambiguous Tailwind utilities, missing `/noise.png`, mixed static/dynamic imports, large chunks. No changes made to address unrelated warnings.
- The Lovable build regenerates the MCP bundle locally. Its unrelated output was restored exactly to HEAD and is excluded from this change.

## Limits

This verifies major navigation surfaces, not every button or full application workflow. No timed drills launched, no messages sent, no assignments or payments changed, and no drawing saved during browser checks. Existing records were read through normal UI navigation. Active exercise screens are deliberately excluded from choreography, rather than being exercised to completion for a presentation-only change.

The earlier motion implementation received exactly two Claude Opus inspection rounds. This later platform extension and its final corrections have automated and signed-in browser verification, but no additional independent Claude inspection. Do not label the extension Claude-approved.

Run `node scripts/verification/start-platform-motion-preview.mjs` for the real local app with normal authentication. It omits the development MCP bundler plugin. The live production site remains unchanged.

## Live LexPrep comparison refinement, 2026-10-22

The following is a new refinement against base `c0fe7c8b8343946339d34e202e395259ff6f76ca`, superseding the earlier entrance preset and inspection-status note above for these changed files.

Visited the current public `https://www.lexprep.ai/` before implementation. Its 35 public same-origin static assets confirm the scroll-section preset: opacity 0 to 1, 14px rise, 10px blur clearing, 300ms CSS ease-out (`0,0,.58,1`), 50ms initial delay, 150ms stagger, once with a minus-100px viewport margin. Its hero separately uses 500ms/y10/blur8 and longer delays. Product navigation consistently uses the section preset.

Reference URLs, snippets, byte offsets and source hashes: `C:/Users/Joshu/Downloads/LexPrep-Live-Motion-2026-10-22/reference.md`. App/reference screenshots, DOM measurements, responsive geometry, recording and review log: `C:/Users/Joshu/Downloads/LSAT-U-LexPrep-Motion-2026-10-22/`.

The shared GSAP hook now supports granular items, asynchronous readiness, safe nested scrolling containers and new marked sections. Loading targets are armed before paint with a one-second visible fallback; the same identity cannot be hidden again after settling. Stable item identities prevent filter/refetch remounts from replaying. Persistent destination headings have their own destination key and stay still across inner tabs. Library search/dialogs are outside animated ancestors. Narrow Home CSS overrides preserve the timed-section briefing entrance. Active drills, reading work, drawing canvases and local motion owners remain protected.

Fresh real signed-in browser coverage: Home including authenticated reload; My Work tabs; LR/RC and RC setup; Review; Library tabs; Progress Overview/History/Topics and date-window refresh; Reading Center Dashboard/Speed Reading; teacher workspace/Today; mobile left menu and right Notes list. Actual reveal styles were observed mid-flight, not inferred solely from screenshots. Lower loaded Progress sections were hidden below the trigger, then settled after native scrolling. Unchanged Progress headings remained opacity1/filter-none across inner tabs. Reduced motion rendered targets immediately visible without transforms. No runtime console errors observed.

Actual CSS widths 320, 390, 768, 980 and 1440: no document horizontal overflow or settled in-view marked content left hidden. These checks do not prove every application workflow or a pixel-identical temporal match with the reference. Rare teacher editor/payment states and active student sessions were not exercised to completion.

Final proof after review fixes: typecheck passed; production prebuild/build/postbuild passed; 277 tests across 12 relevant files passed. The Home test helper lost Router context on rerender against the baseline source too; using RTL's wrapper option corrected that harness without weakening its assertions. The unrelated generated MCP bundle was restored exactly to HEAD after the build.

Claude Opus comparison round one confirmed the preset and requested fixes for readiness blinking, heading replay, refresh remounts, stagger indexing, the Library animation boundary and Home CSS scope. Accepted fixes were implemented and browser-checked. The second and final independent inspection is recorded in the external review log; its exact verdict and limits must be read there before claiming approval. Review CLI tools cannot run the browser or play motion recordings.

Local branch only. No publication or merge is authorized by this refinement.


## Reading-list extension, 2026-10-27

Local My Work refinement, not published. Reuse `useClassroomMotion` for scroll reveals rather than adding a second observer or scroll wrapper. Mark a list container `data-motion-list`, its rows `data-motion-item`, and each row with a stable domain identity such as `data-motion-id="teaching-note:<id>"`. The enclosing real shell must own the hook. A synthetic preview must include `ClassroomMotionContent` to test the same lifecycle.

The opt-in list preset keeps text crisp: 8px rise, opacity entrance, 240ms power3.out. All entrants, including initially visible, asynchronously loaded, paginated and below-fold rows, start paused and join one current-frame DOM-order batch across semantic groups. Stagger spacing is at most50ms, distributed distinctly over at most150ms. It bypasses the ordinary four-block and 24-block page budgets so loaded archive rows can reveal consistently. Ordinary page blocks retain their existing preset and budgets. No CSS initially hides rows; reduced motion leaves all content visible.

Stable identities prevent a previously revealed row from replaying after filtering/refetch. Call `notifyClassroomListIntent(pageElement, 'filter')` synchronously before a filter update, including portal choices and Clear filters. Archive restoration runs in the layout phase and calls `restore` before focus/scroll measurement; initial discovery also recognizes a list row already focused by child layout restoration before the parent owner registers, preventing a first-paint sibling entrance. These intents settle current, pending and queued list animations and leave later discoveries immediate. Explicit pointer pagination calls `paginate` before updating the loaded count to permit new rows to reveal again. Keyboard/input/native-change settlement remains sticky for that route visit, including subsequent pointer pagination. Focus and pointer interactions settle their target immediately. The helper walks actual registered owners, stops at the first owner (including reduced-motion no-op owners), and cannot settle an unrelated boundary.

My Work content has `data-motion-policy="list-only"`: its wrapper, empty/loading/error/personal states and generic fallback stay immediate; explicit rows inside `data-motion-list` still reveal. The separately owned My Work heading is unchanged. Other destinations retain their generic content entrances. Slow-loading wrappers elsewhere settle before granular rows take ownership. ScrollTrigger uses the actual overflow scroller, once-only entry, unreachable-target visibility and scope cleanup. No global wheel interception or active exercise choreography is introduced.

Remediation source checks after inspection fix round one: 90 tests passed across shared motion (49), archive (21) and StudentDestination (20). Real component integration uses ClassroomMotionContent, StudentDestination, TeachingNotesArchive and MyWorkPage with the real shared hook/helper and mocked GSAP/data: portaled pointer filters settle existing rows, filtered discoveries stay immediate, pointer Load more resumes DOM-ordered entrance, and cached first-layout archive restoration creates no row entrance. Other tests cover uniform batching, sticky keyboard settlement, nearest registered/reduced-motion owner cleanup, immediate content states and unchanged generic non-list parent behavior. The parent task owns final integrated build and rendered desktop/phone evidence. This addition does not extend the historical signed-in coverage or independent Claude review above.

# RC Editorial finish and effective passage/question lookup
Date: 2026-10-21
Authorization: User approved implementation of the preceding Editorial recommendations and requested Claude review. Local only; no commit, push or deployment. Codex builds; Claude Opus independently reviews and inspects. Plan review max2; final inspections max2.

## Goal
One polished Editorial RC builder with obvious next steps, plus an effective read-only PrepTest/section/passage/question finder. Preserve LR behavior and all existing RC history, exposure, preview, launch, and exact-versus-reusable saving safeguards. No new draft persistence.

## Baseline and existing work
Checkout C:/Users/Joshu/dev/ai-os-projects/lsatu-rc-focus-release. Branch codex/rc-workflow-20261021. Existing uncommitted RC workflow work and comparison artifacts are intentional and must be preserved. Record HEAD and current source hashes before edits; inspection covers final requested changes plus relevant interacting preexisting code, not an assertion of full review of all unrelated artifacts.

## Source-confirmed findings
- docs/verification/rc-builder-simple-preview.tsx renders an inert Open a question Button; production AcademyMainhub uses real QuestionJump/QuestionFinder.
- QuestionFinder openHit converts passage hits into PT/section strings, losing passage identity; selectedTarget requires an exact RC question. No explicit passage selector. Search caps six hits without a more-results control.
- RcHubSurface main Timing preference is account-scoped local timing-default save, separate from per-drill timing.
- Current three layout studies share actual RcHubSurface. 03 Editorial is approved visual foundation.

## Implementation
1. Adopt Editorial as normal RC builder style, not three product modes. Keep comparison artifacts as references. Open layout, count beside timing, Show answers below.
2. Move labeled Passage selection / Tutor's choice control to top of setup column before count/timing. Remove its disconnected location below intro. Accessible control name should describe action and current method. Manual selection remains same builder, drafts commit only Apply; Cancel restores applied configuration.
3. Remove Timing preference from main setup; preserve save-timing-default action and errors in an unobtrusive drawer settings location. Current timing remains main select. No writes on mere drawer open or Apply unless original explicit save action is invoked.
4. Rename main Review drill to Review selection, retain separate Start drill stage; main review action neither exposes text nor creates a session.
5. Make RC finder effective within existing QuestionFinder, without rebuilding or changing LR routes. Reproduce old passage-hit loss with regression test before fix. Preserve passageId when passage result chosen; offer explicit RC passage selection by PT and section with optional exact question. Extend RcQuestionPreview to accept a missing q as passage-only metadata preview. Explicit empty, zero, malformed, negative or nonmember q remains invalid. Passage-only requests require a positive safe passageId and a loaded passage with drillable questions. Open passage to /rc/preview?passage=... with returnTo; Open question retains valid q=.... questionId is number|null throughout context, retained Pending identity, account/context rechecks and navigation; omit q from drill handoff for passage-only. Retained launch with different q/null cannot be reused. Reveal is explicit and records passage exposure before passage text; only show a specific question after reveal when a valid q was supplied. Start still creates the same whole-passage session with no subset; do not reveal protected text or record exposure merely through lookup.
6. Keep typed exact-address lookup and mixed LR/RC ambiguity protections. Improve RC passage title/metadata relevance so direct passage matches are reachable; add bounded more-results UI for RC when appropriate, no arbitrary hidden truncation. Avoid leaking text beyond currently indexed public discovery metadata. Current syntax must still work.
7. Restore real QuestionJump in local fixture with deterministic synthetic finder bank and address-index adapters, plus a truthful route readback for lookup navigation. No production backend access from fixture; synthetic data must not be presented as real bank/production persistence.
8. Question search remains a quiet separate utility outside builder card, with RC-specific visible label indicating passage/question lookup if useful. Preserve existing LR label/behavior.

## Verification
- Before fix: run a focused regression that demonstrates passage-hit identity loss on current code; record actual failure. Other findings are source-derived until reproduced.
- npm run test -- --run src/features/rc/components/RcHubSurface.test.tsx src/components/questionfinder/QuestionFinder.test.tsx src/components/questionfinder/QuestionFinder.addressIndexFailure.test.tsx src/components/questionfinder/QuestionJump.test.tsx src/components/questionfinder/questionFinderSearch.test.ts src/features/rc/pages/RcQuestionPreview.test.tsx plus new active-bank loading tests and scoped tests. Derive actual filenames before invocation.
- npm run typecheck; npm run build; restore only known generated MCP dev stub if build mutates it; git diff --check.
- Codex browser 1440,980,768,390,320 normal CSS zoom: Editorial setup, labeled selection control, count/timing row, Show answers below, drawer draft Apply/Cancel, saved timing action, Review/Edit, strict exposure indication, query opening. No horizontal clipping, focus trap and scroll usable.
- Finder: PT/section/passage then optional question, title search to passage, exact typed question address, missing/ambiguous address, clear/change PT and section, more results and failed load recovery. LR regression suites ensure unchanged LR behavior; do not assert production bank proof from fixtures.
- Claude fresh final inspection after changes, including code/tests, source/log evidence and local screenshots where Read supports them. Record findings and dispositions. If REVISE fix supported findings and use fresh second inspection; stop at limit.

## Limits
No production publish or live student session. Browser uses fixture backend; local source and tests supplement real-data index validation. Do not call a failed/malformed/blocked Claude run approval. Model requested opus; observed model reported separately.

Additional confirmed search evidence: executing the real pure search engine with an exact passage-title query and six earlier question-prompt matches suppresses the exact-title passage. RC-only finder also currently waits for unrelated LR bank load through Promise.allSettled. Fix RC-only loading to avoid fetching/waiting on LR, preserving default/mixed and LR-only behavior with appropriate load-failure tests. Add scoped typed PT/section/passage lookup if safely supported without changing LR address grammar; otherwise explicit passage selector plus metadata/title search is minimum acceptance, and unsupported typed passage syntax must be reported clearly rather than silently misresolved.

## Resolved review details
- Active bank loading is keyed by live finder view (rc,lr,all), not static host prop. RC starts RC only; switching LR/All lazily loads missing requested banks and shows honest loading. Failure/empty states consider requested banks only; preserve mixed/LR behavior.
- Retained passage selection records passageId,pt,section and validates them against the current visible address. Clear on typed query changes, Clear, Escape-clear, bank changes and unrelated address changes; exact question selection revalidates passage membership. Never allow an Open action for stale/different address. Test every invalidating action.
- Filter out/disable RC passages without questions; no invalid launch target.
- More RC results expand six at a time up to60. Reset/clamp keyboard-active result whenever view, query or limit changes; control is in normal Tab cycle. Expose truthful count/truncation and prompt query refinement at bound. Preserve LR limits.
- Drawer timing-default Save uses currently applied main timing and is explicitly labeled immediate; Cancel does not undo it. Opening/Apply/Cancel alone never save a timing default. Keep disabled when customInvalid or signed out. Success/error status stays visible in main timing after close; show status in drawer too. Explain this immediate preference action separately from filter Apply/Cancel. Test Save then Cancel and storage errors.
- Fixture injection uses existing isolated Vite resolveId modules, extended for ./useQuestionFinderBanks and ./useFinderAddressIndex in BOTH preview server and standalone exporter. No production module signature injection needed. Hook adapters return deterministic synthetic matching bank/address IDs and failure flags; lookup route readback states synthetic and displays exact /rc/preview query. Real-bank tests/index validation remain separate evidence.
- Parent owns RcQuestionPreview.tsx and tests optional-q adaptation; finder worker owns questionfinder files. All authors Codex. Fresh Claude inspector reviews combined final snapshot.
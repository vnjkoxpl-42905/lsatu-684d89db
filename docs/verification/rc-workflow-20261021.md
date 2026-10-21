# RC workflow implementation contract

Approved 2026-10-21. Implement locally; do not merge, push main, or deploy without separate approval.

One continuous Create → Configure → Review → Start experience. One primary landing action, Create your own RC drill, and a secondary Pick specific passages shortcut into the same builder's actual picker. Empty manual selections say Choose passages; nonempty selections say Edit selection. Automatic and manual methods preserve their existing applied drafts.

Configure exposes passage count or selected count, topic, difficulty, timing and answer timing. Specialized filters remain in a transactional drawer. Manual difficulty is a catalogue filter, not adaptive selection. Search distinguishes no catalogue match from a match excluded by active filters, and offers a filter adjustment action. Hidden selected passages remain selected and ordered.

Review shows the exact inspected passages, order, question count and timing/reveal conditions. Edit setup preserves selections and the inspected snapshot until relevant settings change. Returning to unchanged Review must not resample passages. Start is intentional and retains existing owner, pending-launch, protected-section, history, shortfall and exposure safeguards. Preview creates no session and no exposure unless the student explicitly reveals content.

Save exact passages and Save reusable settings remain distinct. Contextual saving stays accessible; full management belongs to the existing Saved sets destination. Preserve owner-scoped pending saves and retries.

Only positively classified RC assignments appear under Assigned RC work. Resolve subject from source metadata, canonical question/section mappings and content identities, never title substrings or generic activity modes. Missing/conflicting evidence stays unknown and accessible through My Work. The current PT21.S3 spoken-recall activity is LR based on canonical content and tests. Do not change generic/LR panels or RC Recall.

Visual contract: existing off-white host and flat dark working surface, compact proportions, readable labels, restrained borders, keyboard focus and reduced motion. Verify actual normal zoom, CSS viewport dimensions and viewport scale instead of compensating for reduced browser zoom. Test 320/390 mobile, 768 tablet, 1024 docked and 1440 desktop. Inspect landing, both methods, filters, exclusions, review/edit, drawer, contextual save, assignment classification, loading, empty, errors and protected launch/recovery. Run focused regression tests, typecheck and build, and report local-versus-live limits honestly.

## Verification completed 2026-10-21

- Targeted regression suite: 32 files, 434 tests passed. Includes builder/session/exposure safeguards, saved-set recovery, assignment classification and host routing.
- Typecheck, production build and canonical-content build scan passed. Git diff whitespace check passed. Restored the build-generated MCP development stub to its original tracked content.
- Codex browser exercised real React components with fixture-backed account/backend adapters. Verified automatic configuration, manual selection/reordering, excluded search matches with reasons, empty search, Apply/Cancel, Review/Edit setup, exact synthetic launch settings and index/history/preview/start failure states.
- Responsive checks at CSS widths 320, 390, 768, 1024 and 1440, with viewport scale 1 and device pixel ratio 1. No horizontal page overflow. Drawer, setup and review checked; tablet selection and mobile drawer exercised with keyboard controls.
- Removed redundant preset shortcuts while retaining their equivalent configuration outcomes through count, timing and answer-reveal controls.
- Unknown or mixed assignments remain accessible through the general feed/My Work and are excluded only from the RC-scoped panel.
- Limits: browser journeys used synthetic backend adapters and a classroom wrapper fixture, not a newly deployed signed-in production session. No production session, save, exposure or launch writes were performed. No push, merge or deployment performed.
- Desktop visual proof: C:/Users/Joshu/AppData/Local/Temp/rc-workflow-final-desktop-20261021.jpg

## Approved refinement implementation and final verification

Implementation remains local on codex/rc-workflow-20261021. Baseline aeecce9bd038eb6e5b637f1ab22f348b2fa860c1; no new commit, merge, push or deployment.

Reproduced before fixes: Apply from automatic entry committed picks then reopened the picker because the builder=manual route changed openPickerOnEntry while its entry ref remained unused. Manual Law browsing filter appeared in Applied filters despite retained Science+Law picks. Five of six initial regression cases failed before fixes, proving route reopen, empty Apply, timing/reveal reselection and obsolete fixed-set filter presentation.

Implemented: intentional drawer opens consume entry intent; Apply/Cancel/X/Escape preserve correct draft semantics and focus, including applying empty selections. Manual main displays ordered titles/PT references, timing/reveal and explicit strict exposure launch requirement. Browsing discovery settings do not imply final restrictions. Automatic conditions edits preserve IDs; asynchronous Start validates current conditions. Exact saves normalize browsing settings while preserving strict safeguards and legacy payload decoding. Exposure/history rechecks update blocked UI state and name affected picks. Deliberate reveals persist only within the same preview; each fresh inspection requires an explicit reveal. Reroll retains Review and disables conflicting edits during loading. RC-only assigned panel always offers access to all work. Contextual saving remains compact and demo success explicitly says in-memory.

Verification: 448 tests passed across final suites (111 Hub + 337 remaining tests). Typecheck and production build passed; canonical-content scan passed; whitespace check passed. Final full run first caught one old assertion for exclusion copy with no search; it was updated to exercise a nonempty search and the 111 Hub cases reran successfully. No production code was changed to satisfy that obsolete assertion.

Browser: real React components with synthetic account/backend adapters. Exercised landing, immediate manual entry, auto topic/difficulty, exclusive selectors/Escape, manual order/Apply/Cancel/empty clear, excluded-search reasons, exact save/readback/reopen, reusable settings save, Review/Edit, stable IDs after conditions edits, shortage acknowledgment, explicit reveal/exposure blocking, fresh-preview reveal reset, launch payload, preview/start failures. Layout inspected at 320/390/768/1440 CSS pixels, DPR approximately1 and viewport scale1; setup, picker and Review had no horizontal page overflow. Picker reorder targets measured44x44, footer remained at viewport bottom, including390x500 shortened viewport. Reduced-motion preference exercised. Temporary browser overrides cleared afterward.

Independent review: one prior Opus plan review plus two fresh Opus code inspections, observed claude-opus-5-5. Both code inspections returned REVISE. Findings were addressed; the follow-up corrections after inspection2 are test/browser verified, without a third independent inspection. Do not describe final state as independently approved. Full responses/dispositions: C:/Users/Joshu/Downloads/RC-Builder-Advisor-2026-10-21/Refinement-review-log.md.

Limits: no live signed-in persistence/launch writes or physical OS mobile-keyboard test. Real adapter/codec retry and ownership tests supplement fixture browser journeys but do not prove live backend acceptance. Standalone export rebuilt and JavaScript syntax checked; browser automation did not independently execute the file protocol artifact. No production data modified.

Deliverables: C:/Users/Joshu/Downloads/RC-Builder-Advisor-2026-10-21/RC-Builder-Interactive.html and C:/Users/Joshu/Downloads/LSAT-U-RC-Builder-Advisor-Refined.zip. Screenshots included for automatic/manual desktop, Review and mobile picker.

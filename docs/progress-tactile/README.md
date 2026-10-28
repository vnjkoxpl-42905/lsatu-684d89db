# Compare three tactile Progress designs

Local design prototypes only. Demonstration data is clearly labelled and ends on 2026-10-27. No student data writes, grading, assignments, deployment, commit or push.

Run `npm run dev -- --host 127.0.0.1 --port 8093` from this checkout. Open:

- [Study desk](http://127.0.0.1:8093/progress-prototype.html?variant=desk&window=30), recommended overview.
- [Type explorer](http://127.0.0.1:8093/progress-prototype.html?variant=explorer&window=30), strongest for investigating question types.
- [Practice timeline](http://127.0.0.1:8093/progress-prototype.html?variant=timeline&window=30), strongest for reading recent work.

Use the comparison arrows or Alt+Left/Right outside inputs. Changing design returns to its overview. The period stays in the URL. Header tabs open shared question-type and history views. Change Demo state to inspect empty, small-sample, partial, loading and error behavior. Select a question-type row or answer mosaic cell to inspect evidence. Saved-answer detail shows the saved result, not full copyrighted question content. Full question review and practice launching are explicitly not connected in these prototypes.

The real-account development path is `/progress/overview?variant=desk&window=30` (or explorer/timeline). Existing route authentication and first-answer account scoping remain. Outer existing Progress destination tabs exit to ordinary production screens and discard the prototype query; use the prototype's own tabs to stay in the comparison. Signed-in local account behavior has not been exercised. Do not copy browser tokens to make a preview work.

## Design choices

Taste Skill v2 app style Accent ladder, seed 121640586, with palette/type kept from LSAT U. Warm paper surfaces, soft charcoal, teal data, amber missed-answer marks, blue RC identification. Contact shadows, raised selected controls and nested radii intentionally follow Joshua's tactile brief over optional flat-surface presets. Motion is control feedback, not entrance choreography. Existing Framer Motion/lucide and native disclosures, no component packages added or third-party component source copied.

Study desk makes an overview and its evidence the first job. Type explorer makes the LR type index the main working surface. Practice timeline makes saved answers by date the main working surface. All use one pure adapter over existing first-answer calculators. Same demonstration rows produce 75 LR first answers (48 correct), 15 RC first answers (9 correct), 12 repeats and 102 history rows in 30 days.

## Evidence and qualifications

- Gemini 4 Argon High independently approved the plan in round 1. Full result and static coverage in PLAN-REVIEW-LOG.md. Fresh code inspection follows host checks.
- `npm run build` passed, including existing prebuild answer/index checks and postbuild canonical-content scan. Prototype marker scan of production JS/CSS found no preview notice, demo IDs, comparison labels or prototype CSS; no `progress-prototype.html` emitted.
- 26 focused tests passed across original first-answer calculator/details and new adapter/interaction tests. Interaction tests cover focus restoration, clearing stale detail, older-date access, and query preservation. Additional interaction-only rerun passed after context switching changes.
- Typecheck passed after locally installing the repository's missing testing-library/dom peer and removing one invalid test option. Final rerun is recorded in verification/typecheck.txt.
- `git diff --check` passed. Original checkout unrelated dirty files were preserved. Vite's existing MCP plugin regenerated its managed function during dev/build; only that exact generated collateral was restored byte-for-byte to HEAD. No backend change belongs to this work.
- Screenshots in verification/ were actually inspected for all three populated layouts at effective CSS widths 1441, 1024, 768 and 390. Existing inherited browser zoom required physical-size compensation; report effective DOM width, not requested physical pixels. An attempted 320 CSS viewport was clamped to 358 by the browser, so the files named *-narrow show 358, not a verified 320. Neither document nor main-container horizontal overflow at tested widths.
- Phone scrolling, type-to-evidence navigation, saved answer opening/close focus return, LR/RC, 7/30-day changes, history Missed + RC filters, menu opening/closing, keyboard focus and Alt+Right were exercised. Two-answer state withheld percentages. Empty/error/loading/partial states were exercised. Reduced-motion CSS transition duration was observed as 0s after browser media emulation; no timing-quality score or video audit claimed.
- Taste source lint: 0 FAIL. Shadow and kicker warnings are deliberate: tactile surface depth requested by Joshua; short sentence-case labels identify the evidence and metric scope. `inspect.mjs` was not used because active browser instructions require UI automation through cua_repl. Screenshots and DOM measurements came through that browser instead. No invented numerical design rating.
- No signed-in student/RLS or production integration acceptance claim. The harness supplies contextual sidebar labels; they are deliberately static, not fake destination buttons. No production promotion until Joshua selects a direction and authorizes integration.

See COMPONENT-RESEARCH.md for Firecrawl sources and interaction reference observations.


## 2026-10-28 actionable evidence refinement

The current preview uses cobalt/indigo with warm paper and amber missed states. Question-type evidence defaults to missed answers, retains its denominator, offers selectable answer tiles, and opens full available repeat chronology. Count charts reveal interval evidence; History separates first and repeat answers. See [refinement verification](REFINEMENT-VERIFICATION.md), [research](REFINEMENT-RESEARCH.md) and [review log](REFINEMENT-REVIEW-LOG.md). Earlier screenshots are preserved; current evidence is in verification/refinement/. Still local prototypes, not published Progress.

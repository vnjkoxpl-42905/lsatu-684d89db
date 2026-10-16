# Study tools prepared for release

Baseline: 4474d9f9bdc68036983873f119e044137ab359c1. Isolated branch: codex/study-tools-179. No backend migration or AI call is required by this slice. This document does not close #179 or claim publication.

Claude Code 2.1.280 built the initial slice and two bounded fix rounds using observed model claude-opus-5-5, requested effort low. Codex then corrected independently identified selected-answer and RC persistence/touch issues, and strengthened mounted actor-switch regressions. Fresh Claude inspection claudex-25sqwxlh approved the mixed production snapshot. Independent Codex agent inspected all initial feature files and the follow-up runtime deltas. Codex CLI inspection was unavailable because the account rejected its configured model; no silent model substitution was made.

## Verified behavior

- Actor and canonical question isolate device-local bookmarks, LR highlights, and cross-outs. The runner remounts on a real actor change. Production auth gates prevent mounting before authentication resolves.
- Cross-outs do not clear, strike, or lock the selected answer. Labeled controls support keyboard and touch visibility. RC persists reducer-committed cross-outs, including rapid toggles and selecting a crossed-out answer to restore it.
- RC clear targets current-question cross-outs and preserves other questions and bookmarks. LR clear targets current-question aids. Neither action writes an attempt.
- Corrupt storage is preserved before replacement; newer-version storage remains read-only. Failed saves retain multiple page-only edits and disclose that they are unsaved.
- 2026-10-01 Claude closing pass: added a hook regression for mounted logout (no save while signed out), A to B to A return (A's marks restored, nothing carried into B). Study-tool suite passed 29 files / 238 tests before the addition, and questionStudyTools passed 25 tests after it; typecheck and build passed. No source defect found.
- Root final related suite: 39 files, 311 tests passed. Typecheck and final production build passed; distribution scan found no canonical guide content.
- Browser LR bookmark, cross-out, and real text highlight survived reload. Root comparison of the owned tester's 21 LR attempts retained digest 65639c1726dbae017039d296e53e2efe during those checks.
- Browser RC bookmark and cross-out survived reload in an owned untimed PT125 Groupthink drill; explicit current-question clear restored C. Retry acknowledged the clock account save before continuing. No answer was submitted or graded in that RC walk.
- Browser LR and RC were checked at CSS widths 390, 820, 1060, 1280, and 1600 with no document horizontal overflow. RC phone popup and keyboard Enter/Escape were verified in the actual viewport. Initial CDP screenshots had inconsistent capture sizing; actual viewport screenshots are the visual authority.
- LR and RC canvases were inspected with temporary doubled computed text sizes; they retained independent scroll regions and no document overflow. This was a text enlargement simulation, not a claim about native browser zoom. Reload restored normal text.

## Limits and remaining acceptance

Existing LR and RC find controls are preserved. An initial reviewer claim that LR find was missing was incorrect: the source uses officialSearchTerm, and the browser highlighted Democracy in the actual LR stimulus. Explanation attribution, mode persistence, auto-reveal and first/blind grading semantics are outside this slice. Whole #179 remains open.

Marks do not sync across devices. localStorage updates are not atomic across tabs. Sequential unrelated-key updates are preserved, but simultaneous same-question changes use the last saved version. A touched LR canvas does not continuously re-seed another tab's highlight edits.

RC bookmark links deliberately create a new ordinary practice session. Old session-scoped cross-outs are not automatically pruned; storage limits and explicit clear actions are disclosed. No existing records are automatically deleted.

Final touch emulation after the last RcChoiceRow change passed: hover:none was true, all five cross-out controls had opacity one, and crossing out C produced the labeled restore control. Temporary emulation was cleared. The actual narrow side-pane RC walk remains pending: opening the owned session in the right Codex pane returned queued while this task was hidden. Screenshots and detailed inspection artifacts live in the operator workspace, not the application bundle.

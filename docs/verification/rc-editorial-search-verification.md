# RC Editorial builder and lookup verification
Date:2026-10-21
Status: implementation and checks complete; final independent inspection pending.
Local checkout: C:/Users/Joshu/dev/ai-os-projects/lsatu-rc-focus-release
Baseline: aeecce9bd038eb6e5b637f1ab22f348b2fa860c1; preexisting uncommitted RC work preserved.
No commit, push, merge or deployment.

## Behavior
- Editorial normal builder: labeled selection control leads setup, count/timing share row, answers below, clear Review selection then Start.
- No main Timing preference disclosure. Explicit immediate applied-timing default save is in rail; Cancel does not undo saved preference. No writes just opening/applying/canceling filters.
- Actual finder now appears in fixture and production RC trigger names passage/question lookup; LR default label preserved.
- Passage title/typed P address retains exact identity; optional question, safe existing exact-question lookup, invalid/ambiguous combinations disable Open.
- Passage-only metadata preview supports missing q without arbitrary question focus. Explicit invalid q rejected; reveal records exposure before showing passage; Start includes whole passage with no q handoff. Pending actor/context checks retained.
- RC-only search avoids waiting for LR bank, dynamically loads requested tabs. Exact passage-title matches prioritized, bounded Show more, honest error/retry, readable narrow-mobile titles.

## Reproduction
Initial source inspection and transient old-component UI test demonstrated lost passage target. Initial fixture had an address-position mismatch, so a corrected consistent paired before/after test is also recorded separately; do not use the inconsistent fixture as sole proof. Pure engine example: six prompt matches suppressed exact-title seventh passage before fix.
Evidence: C:/Users/Joshu/AppData/Local/Temp/lsatu-rc-search-before/ and rc-search-final-tests.log.
Actual public-index checks:320passages/2150questions; OnlineGameCurrencies/PT140S4P2 mapid15; PT140S4Q7/P2Q7 mapqid1594; P2Q1 invalid. Local timings are single-run observations, not production benchmarks.

## Browser checks
Actual React fixture with synthetic bank/address/exposure/session adapters; no real backend writes. Lookup wrapper uses actual RcQuestionPreview and shows exact navigated route.
Checked: title search ->passage metadata/no q; dropdownPT/section/passage; exact typedQ ->question metadata; explicit synthetic reveal->passageonly text; explicit synthetic Start->wholepassage payload; invalidP/Q, Clear disablesOpen; loadfailureRetry; Showmore6->12; timingSave thenCancel notice; timingEdit retains automaticreviewtitle.
Widths1440,980,768,390,320 normal CSSzoom/DPR1: main row alignment and no pageoverflow; finderpanel fits allwidths;320 resulttitles expanded into readable multiline rows. Final screenshots saved under Downloads/RC-Editorial-Final-2026-10-21.

## Checks and independent review
Plan: ClaudeOpus requested; observedclaude-opus-5-5. Round1REVISEF1-F8 accepted; round2APPROVED and runner hashcheckpassed. Finalinspection pending.
Full regression initialrun:746passed/1outdatedRCtriggerlabelassertionfailed (updatedandrerun). Final full regression:749/749 across63files passed. Final typecheck initially found test-only typing errors; repaired querySelector generic and removed unsupported ByRole exact flags. Typecheck then passed, and145 affected tests passed again. Final production build and765-file canonical-content scan passed; git diff --check passed.

## Boundaries
Fixture proves UI and synthetic navigation, not signed-in production persistence. No physicalmobile keyboardtest. Readonly public-index evidence supplements fixturedata. Previous comparison HTMLexports are historical snapshots; this task has one finalnormalEditorialdesign. No provider review is called approval unless structured valid finalverdict saysAPPROVED.

Final proof logs:
- C:/Users/Joshu/AppData/Local/Temp/rc-editorial-final-tests.log
- C:/Users/Joshu/AppData/Local/Temp/rc-editorial-repaired-typecheck.log
- C:/Users/Joshu/AppData/Local/Temp/rc-editorial-repaired-tests.log
- C:/Users/Joshu/AppData/Local/Temp/rc-editorial-final-build.log
- C:/Users/Joshu/AppData/Local/Temp/lsatu-rc-search-before/paired-before.log (historical component, same corrected fixture, assertion fails missing Open passage)
- C:/Users/Joshu/AppData/Local/Temp/lsatu-rc-search-before/paired-after.log (same test/fixture, updated component passes)
- C:/Users/Joshu/AppData/Local/Temp/lsatu-rc-search-before/real-bank-after.json

Screenshot evidence (actual Codex browser):
- C:/Users/Joshu/Downloads/RC-Editorial-Final-2026-10-21/before-editorial.jpg
- C:/Users/Joshu/Downloads/RC-Editorial-Final-2026-10-21/setup-1440.jpg
- C:/Users/Joshu/Downloads/RC-Editorial-Final-2026-10-21/setup-390.jpg
- C:/Users/Joshu/Downloads/RC-Editorial-Final-2026-10-21/setup-320.jpg
- C:/Users/Joshu/Downloads/RC-Editorial-Final-2026-10-21/finder-1440.jpg
- C:/Users/Joshu/Downloads/RC-Editorial-Final-2026-10-21/finder-320.jpg

Final mobile refinements: normal loaded-timing information appears only in the drawer, preserving explicit success/error notices on main. RC lookup retains visible text at320px; LR trigger behavior unchanged. Search results show complete passage titles at320px. Legacy PT140 Q7 preserves Q when a unique RC section is inferred; ambiguous sections are not guessed. Main timing edits retain inspected automatic passage identity.
## Final inspection fixes and latest proof
Claude Opus final inspection 1 requested changes. Fixed: clicked-result passage/question provenance now cross-checks the authoritative address index; mismatches visibly disable Open. Failed rerolls explicitly retain the prior reviewed set. Removed obsolete essential-filter code/CSS. Selection accessible name includes current method. Saving copy uses Tutor's choice and Review.

Nine new provenance regressions failed before the repair and passed afterward. Finder suite: 97/97 passed. Builder suite: 121/121 passed. Latest combined run: 760 passed, one 15-second timeout in the 60-result expansion test; immediate whole-file rerun passed 28/28 with no edits. Latest typecheck passed exit 0. Latest production build passed in 1m30s; canonical-content scan passed 765 files. Generated MCP build stub restored only to recorded baseline. Diff whitespace check passed.

Logs: C:/Users/Joshu/AppData/Local/Temp/rc-finder-provenance-before.log; rc-finder-provenance-after.log; rc-finder-provenance-typecheck.log; rc-editorial-inspection-fixes-tests.log; rc-editorial-post-inspection-tests.log; rc-editorial-timeout-recheck.log; rc-editorial-post-inspection-build.log.
Final inspection 2 pending. Source frozen for fresh inspection.

Final inspection 2: APPROVED. Claude Opus (observed claude-opus-5-5) independently confirmed F1-F4 resolved, with no material findings in inspected scope. It read setup/finder desktop and320 screenshots plus targeted source/diffs. It did not run browser/tests and did not inspect every changed file in full. Result: C:/Users/Joshu/AppData/Local/Temp/rc-editorial-inspection-20261021/claudex-w3e9ffi5/result.json.

Remaining low findings: native Timing value truncates at320px until opened; large-results test had one observed timeout followed by unchanged28/28 rerun. Finder screenshots were recaptured after review with reduced motion and confirmed opaque/readable, resolving screenshot-evidence issue. No production code changed after approval. Two final inspections used. Local fixture remains open in Codex browser. No commit, push, merge or deployment performed.

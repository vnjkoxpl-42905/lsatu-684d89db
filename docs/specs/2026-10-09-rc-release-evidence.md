# RC repair evidence and remaining release gates

## Current release checkpoint, 2026-10-09

This section supersedes pending release statements in the historical checkpoints below. Implementation for tickets 03–07 is integrated in `ab5d33dd9c9ded811645a79b3c8920f516867a0e`. Ticket 08 adds the integration tests, independent review, browser verification and this evidence ledger. Physical-device, screen-reader, live fault-injection and scoring-authority checks remain explicitly open; implementation completion does not certify those checks.

The first release was safely pushed and published through Lovable's free Publish changes control. The UI reported Your website was updated. Production changed from `index-BLyVP82A.js` to `index-CWiV2j9w.js`. Signed-in production finder verification showed PT140 S4's four passage groups and all 27 questions, including Q3 and Q17. Keyboard selection of Q17 stayed in the finder; opening it reached the exact read-only preview. Captured network events contained no non-GET RC session, attempt or annotation requests during selection and preview.

That production walk found an additional ticket 03 defect: Practice supplied `/classroom` as the finder return destination. Follow-up `a95d87de` captures the originating pathname/query separately from the scored-drill return contract; sidebar entry carries validated origin context and the open finder retains it across route changes. Independent review approved the follow-up with 64/64 tests. `4e45b86005647c4ad9a5e50949bb3f485c459a06` corrects a TypeScript-only test query error caught by the push gate. The correction passed 10/10 preview tests; the preceding expanded focused slice passed 407/407 (`C:/Users/Joshu/AppData/Local/Temp/rc-resumed-tests.json`). Final typecheck and safe-push passed. HEAD and origin/main matched `4e45b860` at this checkpoint.

The follow-up build passed, verified 2150 unique bank question IDs/owners/official addresses and scanned 751 dist files. Entry asset: `index-B7wxZiit.js`. The built app at 8081 verified Q3 preview exit back to `/practice/drills?section=rc`, and sidebar lookup from Practice Exams back to `/practice/exams`. Free publication completed with Your website was updated; screenshot: `C:/Users/Joshu/.codex/visualizations/2026/10/07/01a11839-ea0a-74f3-8979-f6bda1202b18/rc-final-publication.png`. Fresh production entry: `index-ZeBZho4A.js`. Cloud and local asset hashes differ because these are distinct builds; byte equivalence is not claimed.

Signed-in production acceptance used the dedicated student actor `d763bfe6-d710-4c4b-90ff-4b3a20929211`:

- Q17 selection remained at `/practice/drills?section=rc`; Open question reached `/rc/preview?passage=16&q=1604&returnTo=%2Fpractice%2Fdrills%3Fsection%3Drc`; Back returned to the exact originating path/query.
- Sidebar lookup from `/practice/exams` opened Q3 preview with returnTo `/practice/exams`; Back returned there. The unique RC section and all 27 PT140 S4 choices were present.
- Completed session `13dcde0e-0c2e-4174-ba11-ba174e47093b` restored its personal highlight and Q3 flag. Blind review showed answered labels, with correctness hidden until reveal. Passage-only mode and the preferences popup worked. Default paragraph computed styles were 18px/28.8px; Large changed to 22.5px/36px and persisted after reload. Defaults were restored afterward. Reader screenshot: `C:/Users/Joshu/.codex/visualizations/2026/10/07/01a11839-ea0a-74f3-8979-f6bda1202b18/rc-production-reader.png`.
- Results for that completed session retained 3/6 and the real Review all button opened its review route.
- Manual PT146 S4 P4 preview disclosed exactly five questions before explicit Start. A transient fetch failure kept the original launch pending; Retry original launch recovered session `3ac540b2-8fab-4c09-a792-c5b597fc4a26`. Per-question confirmation revealed only after acknowledgement; five A choices completed with results 1/5. Backend receipt confirmed exactly five first attempts, question IDs 1004–1008, and one new owned session for this launch.
- Custom `0:00` timing showed an error and disabled Preview; `1:00` was accepted. PT148 S2 P3 comparative session `6320a6d9-4198-477f-9602-b068923e5027` paused at 00:52 across reload. A transient clock-save failure paused questions with Retry save; retry recovered. Its practice budget passed zero without silent submission (+0:09 observed), and six A choices saved and completed through passage check.
- This last scenario exposed a separate setup reset: the selected At the end reveal had become After each passage. Independent reproduction identified an initial hydration race: choices made while the passage index loads were overwritten when it arrived. The change was first noticed after Custom timing, but Custom itself was not the cause. The race is being fixed before final acceptance. This session proves comparative/per-passage lifecycle, not at-end lifecycle.
- Automatic selection with Science + Comparative + difficulty 4 requested eight passages, previewed four exact passages/26 questions, and disabled Start until the explicit shortfall checkbox was accepted. Changing filters invalidated the earlier preview. The smaller automatic set was not started, so this check added no session.

Read-only backend receipt at `2026-10-09T15:10:46.083Z` reports 18 owned sessions, 159 attempts, 2 annotations, compared with 16/148/2 before these two additional dedicated drills. Both new sessions are completed. Existing records were preserved; the receipt script signs out only its own local client.

### Final setup-race correction

`8ad748b0` fixes the demonstrated initial-loading race. URL reveal/timing settings hydrate before the bank arrives; linked passage IDs still wait for validation, and query readiness gates both preview and assignment autostart. A deterministic delayed-index test reproduced the bad reset before the change. It now retains the chosen reveal, exact manual passage and custom 60-second budget. A new assignment link still resets omitted settings; an existing autostart test confirms its exact linked IDs.

Independent review approved the change. The expanded focused receipt (`C:/Users/Joshu/AppData/Local/Temp/rc-final-acceptance-tests.json`) reports 409/409 passing. A separate final Hub rerun passed 34/34. Relevant lint and full typecheck passed. The final build after all source edits passed, with 2150 exact index identities, 751-file content scan and entry `index-BXnoJ-p9.js`. The built app at 8081 showed At the end still pressed after manual selection and Custom 1:00. Safe-push typecheck passed and pushed `8ad748b0` to main without remote divergence. Publication and the final at-end production walk are the next checkpoint.

RC source and answer-key files remain unchanged. The unrelated unstaged MCP file retains SHA256 `14A737D3616F07D78983F1A057E5D20C696B01B5267C1FC9E60B322E3ED5C0C9`; it was never staged. No backend functions, migrations or answer-key corrections were deployed.

### Historical checkpoints follow

## Final integrated build and saved-reader checkpoint

Independent final source review approved the integrated03–08 repair. It identified and corrected a test-observation gap: preview tests now spy on the actual localStorage methods and the actual sessionStorage prototype rather than an unrelated Storage prototype. The preview file passed9/9 on Node26.8.1, including the isolated storage-failure test; the integration owner then reran the complete focused slice with `--no-cache` and observed393/393 passing. No production source behavior was weakened to pass this gate.

The final reader was rechecked with explicit per-tab developer viewport emulation:390x844,700x900,1024x768,1366x768,1920x900. All popup rectangles fit the viewport and document widths stayed below viewport width. At200% actual text enlargement, passage text measured36px, the official-address header wrapped, and document scrollWidth1265 stayed below1280. This is text-resize evidence, not browser-zoom or physical-device evidence. Temporary developer overrides were cleared/reloaded. The resized screenshot is `C:/Users/Joshu/.codex/visualizations/2026/10/07/01a11839-ea0a-74f3-8979-f6bda1202b18/rc-final-text-200.png`.

The final focused receipt at `C:/Users/Joshu/AppData/Local/Temp/rc-final-tests.json` reports393/393 passing assertions across41 files, including the added blind-review status regression. The final build completed with exit0 on2026-10-09, verifies2150 exact bank/index identities and scans751 built files with no canonical guide content. Its entry asset is `index-CRPSJXRu.js`. Typecheck and relevant lint passed; safe-push will run typecheck again before publication. The repository-wide baseline failures below remain failures.

The final production build served at `http://127.0.0.1:8081` reproduces the dedicated student's completed session `13dcde0e-0c2e-4174-ba11-ba174e47093b`. At the previous short-window checkpoint, the large sticky results summary covered the Review all button. Making that summary scroll normally restored the real button action: clicking Review all reached `/rc/drill?sessionId=13dcde0e-0c2e-4174-ba11-ba174e47093b&review=1`. The ordinary blind-review pager now says answered for recorded choices while hiding correctness until explicit reveal.

A normal highlighter gesture on passage14 showed Passage marks: Saved. The backend receipt confirmed16 owned sessions,148 attempts and2 annotations, with this session completed and exactly six first attempts. Reopening the final built review and reloading restored the same passage mark. No existing records were deleted. A local reader screenshot is `C:/Users/Joshu/.codex/visualizations/2026/10/07/01a11839-ea0a-74f3-8979-f6bda1202b18/rc-final-local-reader.png`. These are local-build/live-backend receipts; publication and fresh production checks remain separate below.

This ledger separates automated checks, signed-in local browser acceptance, and production acceptance. The owning design remains [RC drill quality](2026-10-07-rc-drill-quality.md). Ticket08 does not adjudicate answer keys.

## Automated checkpoints have limited scope

The reviewed base was `2b5d8acaff411e65d358ec2da46730ec7adc13e8`; the integrated repair is an uncommitted working tree at this checkpoint. These runs are development evidence, not final-commit certification. Do not add overlapping test totals together.

| Area | Independently observed evidence | Scope and limitation |
|---|---|---|
| RC landing and preferences | 38/38 passed across `AcademyMainhub.test.tsx`, `AcademyMainhub.section.test.tsx`, `OfficialDrillToolbar.test.tsx`, and `useRcA11y.test.ts` | Compact creation without automatic start; collapsed homework; setup isolation; LR defaults; text-size selection/focus return; malformed preference recovery and persistence. Actual contrast/viewport checks remain browser gates. |
| Source identity, overview and flag integration | 26/26 passed across `RcChrome.test.tsx`, `rcSession.identity.test.ts`, and `RcPlayer.saveSafety.test.tsx` | Official Q17 versus Drill1; mixed/reordered passages; grouped navigation; hidden correctness before confirmation; pending flags, acknowledged save and failed-save retry; protected review and in-progress review restrictions; answer/clock failure recovery. UI leaf mocks limit visual/scroll evidence. |
| Lifecycle additions | 30/30 passed across `rcSession.lifecycle.test.ts` (4) and `RcPlayer.saveSafety.test.tsx` (26); relevant lint clean | All three reveal boundaries across two passages; pause/resume; practice-budget overrun without silent completion; per-passage completeness/check; save-exit/remount of acknowledged answers and position. These mocked automated tests do not certify real backend or browser persistence. |
| Relevant lint | Zero errors in the two focused source/test slices above | Toolbar has two existing `react-refresh/only-export-components` warnings. Final integrated lint remains pending. |
| Index completeness | Integration owner reports `test:rc-index`7/7 and prebuild verification of2150 exact IDs, owners and official addresses | `git diff` for `public/data` is empty. No source or answer-key edits are certified by this UI repair. |
| Integrated repair suite | Fresh `--no-cache` RC, QuestionFinder, official drill and AcademyMainhub tests passed392/392 in41 files | Receipt: `C:/Users/Joshu/AppData/Local/Temp/rc-final-tests.json`, supplied by the integration owner. This is the repair slice, not the entire repository suite. |
| Typecheck and build | Integration owner reports both passed before the latest minor results-copy adjustment | Post-adjustment checks are running; final publication evidence must identify the checked commit. Whole-suite baseline failures remain recorded below. |

Focused commands:

```text
npx vitest run src/pages/AcademyMainhub.test.tsx src/pages/AcademyMainhub.section.test.tsx src/components/drill/official/OfficialDrillToolbar.test.tsx src/features/rc/hooks/useRcA11y.test.ts --silent
npx vitest run src/features/rc/components/RcChrome.test.tsx src/features/rc/lib/rcSession.identity.test.ts src/features/rc/pages/RcPlayer.saveSafety.test.tsx --silent
npx vitest run src/features/rc/lib/rcSession.lifecycle.test.ts src/features/rc/pages/RcPlayer.saveSafety.test.tsx --silent
```

## The repository-wide failure set reproduces on the reviewed base

The integration owner reported a whole-suite exit1:16 failed files,460 passed files;31 failed,6181 passed,1 skipped assertions. This is a failed suite, not release certification. The Vitest cache is cumulative and later focused runs can replace individual entries.

An independent run extracted commit `2b5d8acaff411e65d358ec2da46730ec7adc13e8` into an isolated temporary directory, shared only the installed dependency directory, and ran the15 existing failed files with `--no-cache`. All15 reproduced failures:30 assertion failures and a collection failure resolving the Deno-style `npm:@supabase/supabase-js@2` import in `supabase/functions/_shared/sendAppEmail.ts`. The JSON receipt is `C:/Users/Joshu/AppData/Local/Temp/lsatu-rc-baseline-9f915db4b38643a9b5ac5739ded55ad5/baseline-results.json`. Windows extraction could not create tracked `.claude/skills` symlinks; application sources and tests extracted and ran.

The reproduced files were `AcademyMainhub.test.tsx`, `DrillLaunchGate.test.tsx`, `singleSessionCore.test.ts`, `standaloneDrillHistory.test.ts`, `BookingOfferHub.test.tsx`, `practiceDrillPools.test.ts`, `ActivityIntro.dock.test.tsx`, the three `ActivityItemView` paper/a11y/coach files, the four Switchyard flip/routing files, and `RcSessionHistory.protected.test.tsx`. Protected history reproduces3 failures. The AcademyMainhub failure is its old PrepTest combobox lookup; the updated current test passed in the focused checkpoint above. This establishes baseline failures, not permission to ignore their release impact.

The new `useRcMarkSurface.test.tsx` does not exist at the reviewed base. Its fresh current run with `--silent --no-cache` passed3/3; the earlier cached failure was not reproduced. The toolbar responsive fix also passed its2 preference tests and targeted lint with0 errors and the two existing export warnings. The later integrated repair slice passed392/392, as recorded above.

## Browser acceptance must identify the actual scenario

The integration owner's initial RC slice passed315/318; its only three failures were the protected-history baseline mock missing the current authenticated `.eq('user_id', actor)` query chain. That relevant test stub now supplies the actor and actually filters returned rows. Existing UI expectations remain intact. An added direct `listSessions` adapter test confirms another account is excluded and native sitting/full-PrepTest budgets and identities map correctly without inventing reveal timing. Fresh protected-history verification passed5/5 with `--silent --no-cache`; the subsequent integrated repair rerun passed392/392.

The following are fresh local receipts supplied by the integration owner on2026-10-09, using a dedicated student account (`joshStudent`). The development app ran at `http://127.0.0.1:8080`; the built app ran at `http://127.0.0.1:8081`. They establish the listed local scenarios, not production acceptance. Existing2026-10-07/08 screenshots remain historical comparisons. No hashes or screenshot paths absent from the supplied receipt are invented here.

| Scenario | Required evidence | Current state |
|---|---|---|
| Finder and read-only preview | PT140 S4 finder contains all27 questions; Q3 opens inert preview | Local CLI snapshots before/after preview retain15 sessions,142 attempts,1 annotation and identical table hashes. Q17 and complete keyboard walk remain separate acceptance items. |
| Explicit launch | Explicit Start from Q3 preview creates session `13dcde0e-0c2e-4174-ba11-ba174e47093b`, passage14, all6 question IDs1588–1593 | Exactly one session created; no attempt created by launch. Live duplicate-click and lost-reply recovery remain unverified; automated coverage is separate. |
| Builder | Built8081: zero/manual removal disables preview; manual preview discloses6 questions; changing timing invalidates preview; automatic Trade Secrets/PT126 preview discloses6 questions and8:45 | Automatic preview was not started. Filter intersections, shortfall and invalid custom timing require remaining live coverage. |
| Reader and preferences | Default18px and1.6 line height; Largest, Roomy and white-on-black persist across reload | Local receipt verifies this combination. Exhaustive size/spacing/color, comparative/long passage and scroll-retention browser matrix remains open. |
| Saves | Q3 flag persisted in the dedicated session;6 answers saved and checked | Delayed/failed acknowledgements, pending recovery reload and actor-switch live fault scenarios remain open; automated tests are recorded separately. |
| Lifecycle | Six answered questions -> Check passage -> completed results3/6 | Local completion verified. Three reveal modes, pause/resume, overrun and protected-review real-session sweep remain open. |
| Responsive and keyboard |390x844,700x900,1024x768,1366x768,1920x900: popup contained and no body horizontal overflow; Escape returns focus to Text size |200% text resize produces actual36px text without horizontal overflow at1280px. This is text resize, not browser zoom. Actual sidecar, browser zoom and full keyboard task walk remain open. |
| Original clipping | Reproduce the reported screenshot condition before attributing or closing it | Unresolved |
| Screen reader / physical device | Announced passage groups/current question/selected preferences/save status; physical phone and cross-device persistence | Open; desktop emulation cannot certify these |

For every live test, record route, viewport/zoom, actor role, test session/record identity, action, observed result, and screenshot/DOM evidence path. Preserve test records; cleanup requires authorization. Never place credentials in this ledger.

## Publication and scoring remain separate gates

- Final intended diff, unrelated MCP working-tree preservation, full check results and reviewed commit: pending.
- Safe-push gate, deployment identity and deployment success: pending.
- Fresh signed-in production walk against the deployed commit: pending.
- PT159 S2 Q2 answer-key authority and affected-scope adjudication: open. No key changes or scoring certification are implied by this UI repair.

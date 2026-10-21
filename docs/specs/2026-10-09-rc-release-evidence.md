# RC repair evidence and remaining release gates

## Save-response acceptance and recovered clipping evidence, 2026-10-14

This continuation supersedes the earlier unresolved fault-control rows for the scenarios below. Scoring authority remains separate. No source passages, answer keys, historical grading, backend functions or existing account records were changed or deleted.

### Real save-response permutations

The dedicated actor remains `d763bfe6-d710-4c4b-90ff-4b3a20929211`. Production session `307f5534-73d2-4f4f-93c0-ce390dd21a1a` supplied these controlled response checks at 1280×720 and 1522×845:

| Controlled condition | Observed result |
|---|---|
| Hold annotation hydration, then release its current GET response | Loading passage marks stays visible until release; normal marks hydrate afterward. Fresh request cursors successfully resolve the earlier interception limitation. |
| Change passage while its hydration is held | New passage displays no old marks; the original request is cancelled, so continuing that cancelled interception correctly fails. The current passage response was released separately. |
| Process annotation POST, discard acknowledgement, double-click Retry | Not saved remains visible until acknowledgement. One pending retry POST is observed; reload restores the saved mark. |
| Hold an older pink-mark acknowledgement, apply newer orange intent, release replies in order | Newer intent remains Saving after the older acknowledgement; the next serialized POST acknowledges the final mark. Reload retains the final color and text. |
| Process flag PATCH, discard acknowledgement, reload, double-click Retry | Scoped recovery restores; one pending retry PATCH acknowledges the final value. |
| Hold both annotation POST and flag PATCH acknowledgements, leave the reader, sign out tester A, sign in secondary teacher B, then release both A replies | B receives no A reader/recovery state; opening A's session is refused as belonging to another account. B's other sessions were not signed out. |
| Leave immediately after adding a mark, before the debounce sends it, then reopen the same actor/passage | Recovered, not saved appears with all marks, without automatic replay. Explicit Retry saves the pending mark. Screenshot: `output/playwright/rc-acceptance-2026-10-14/teardown-recovered.png`. |

Nine added deterministic hook tests cover duplicate retries, unresolved acknowledgements across remount, stale success/rejection versus newer intent, A/B/A serialization and teardown, actor hydration and protected flags. They are controlled transport tests, not device evidence. Existing flag tests also cover unrecorded flags during initial-answer acknowledgement.

### Reproduced answer-loss defect and bounded repair

A six-question per-passage test selected all A choices and started Check passage. The first answer committed while its response was held. After browser teardown, only acknowledged answers and the last single backed-up choice restored; intermediate choices were lost. The old actor+session backup held one answer and each pick overwrote it. A deterministic regression reproduced the loss before repair.

The repair retains every pending question draft, migrates legacy scalar backups, and clears only the acknowledged question and matching intent. Persisted saveRequested distinguishes ordinary picks from explicitly requested saves: reload restores all choices, while Retry writes only the requested subset. Ordinary unconfirmed choices remain hidden through clock Retry and a second reload. Generation guards prevent late save/retry/navigation/exit continuations from entering a newer session.

Independent review identified and corrected the stale-session continuation and second-reload reveal risks before release. Final focused tests passed435/435; the dedicated backup/player slice passed41/41 and typecheck passed. Relevant lint has zero errors and one intentional ref-generation cleanup warning. Final build verifies2150 identities and scans757 files without canonical content. Local built entry: `index-BY4eDQVA.js`.

Signed-in built-app checks used `http://127.0.0.1:8093`:

- Session `fd29ee7b-ec88-453d-8797-123baaa17a15`, passage16, per_passage, untimed: all six choices restored; explicit Check passage and Finish reached completed results with exactly six first attempts. Receipts: `fixed-built-recovery.txt`, `recovered-partial-passage-results.png`, `backend-partial-recovered.json` under `output/playwright/rc-acceptance-2026-10-14`.
- Session `4bf94f94-9faa-4a61-924d-8ad5956bce9a`, passage16, per_question, untimed: two unconfirmed A choices survived two reloads and clock Retry with zero backend attempts and no credited-answer reveal. Only explicit Confirm created attempts. Q14's initial POST held flagged:true while newer intent changed to false; releasing its acknowledgement produced the final flagged:false PATCH. All six explicit confirmations and duplicate Submit reached completed results. Receipts: `backend-unconfirmed-two-reloads.json`, `initial-flag-newer-intent.json`, `local-unconfirmed-reload-results.png`.
- Protected session `06324cd6-76fe-46de-9689-f4644e7cb124`: navigation to official Q27, passage-only, reload and exit left every session/attempt/annotation table hash and the selected protected attempt rows unchanged. The six-width popup matrix fits390/480/700/1024/1366/1920 with no horizontal overflow. Receipts: `backend-fixed-protected-{before,after}.json`, `answer-recovery-built-matrix.json`.

### Original clipping image recovered and compared

The original attachment is `C:/Users/Joshu/AppData/Local/Temp/codex-clipboard-2c863896-ce48-4c72-bf5a-15893504f2db.png`,1522×845, teacher Practice/Drills, PT140 S4 RC, question-number dropdown open. Its adjacent finder pill and right side of the black drill hero are clipped; the dropdown fits. This concerns the retired setup row, not reader text.

An isolated retained archive of `f59ddc48835b285674e6ddde55c1812db0bb1bef` ran at8092 without reverting main. Opening the old menus only, at1522×845 and1384×768 with device scale1.1, did not reproduce the historical crop. The attachment contains no reliable deployment identity or original browser zoom/crop metadata. No cause or historical fix is attributed without reproduction.

Current signed-in production teacher setup and PT140 S4 Q17 finder selection fit1522/1384/390/700/1024/1366/1920 CSS widths. Each popup was reopened after resize and measured after real animations finished; dialog and listbox fit, document width equals viewport width. Screenshots `clipping-current.png`, `clipping-historical.png`, `clipping-historical-scaled.png`, and `clipping-current-matrix.json` preserve the comparison. The historical condition remains unresolved; the current equivalent does not reproduce it.

Physical-device/cross-device persistence, actual screen-reader speech and actual200% browser zoom remain separately open. Current desktop emulation cannot certify those. The broader scoring-authority audit and repository-wide baseline failures remain separate.

### Published repair and final production verification

Safe-push passed typecheck and pushed `748a491d19a4c132fac6c76e71ef589f54b0521e`. Lovable read-only metadata confirmed that exact synced commit before free Publish changes. The dialog reported Your website was updated, and fresh production loaded `index-BxnJINCm.js`. Receipt: `output/playwright/rc-acceptance-2026-10-14/answer-recovery-publication.png`. No Lovable AI or credit-spending action was used.

Production session `6ef06c88-316b-4fb5-b57c-8480f7b6aa04` used passage16, per_passage and untimed mode. Two ordinary choices survived two reloads and clock Retry with zero attempts or credited-answer reveal (`backend-production-unconfirmed.json`, `production-two-drafts-reloaded.png`). After all six A choices and explicit Check passage, the first answer POST succeeded on the server; its acknowledgement was discarded. Reload and duplicate Retry restored and saved all six choices. Explicit Check passage and Finish reached completed results with zero unanswered. The original first-attempt ID `10de5726-05e7-4823-8ea9-a1f9535261a6` was retained; there are exactly six first attempts for IDs1601–1606, without duplicates. Screenshots: `production-all-drafts-recovered.png`, `production-answer-recovery-results.png`.

Read-only receipt `backend-answer-recovery-final.json` at `2026-10-14T13:51:43.400Z` confirms25 sessions,208 attempts,4 annotations. All five protected source-session hashes match the earlier checkpoint. The temporary in-app teacher login was cleared locally to restore the dedicated tester, without global teacher sign-out or removal of recovery/record data.

Final full suite:40 failed,6778 passed,1 skipped across6819 tests; no RC file failed. Every failure identity existed in the earlier full-suite receipt.38 match the independently reproduced upstream baseline; two are the previously variable conditional failures. Receipt: `C:/Users/Joshu/AppData/Local/Temp/rc-answer-recovery-full-suite.json`. Final focused435/435 receipt: `C:/Users/Joshu/AppData/Local/Temp/rc-fault-repair-final-tests.json`. No whole-suite success is claimed.

Final production at-end smoke used `fe1092cf-b706-4e0d-a707-bbfd80e423f0`, passage16, end_of_set and a60-second per-passage practice budget. Pause/reload retained00:32 and pending choices; clock Retry and Resume recovered. All six A choices stayed hidden through practice-budget overrun+1:22, with no silent submission. Five navigated choices had already saved before Submit, as intended for at-end persistence; correctness remained hidden. Explicit duplicate Submit reached completed results with exactly six first attempts and zero unanswered. Screenshots: `production-at-end-overrun.png`, `production-at-end-final-results.png`; receipts: `backend-at-end-{before-submit,final}.json` under the same artifact directory.

The final receipt at `2026-10-14T13:58:59.116Z` supersedes the earlier counts:26 sessions,214 attempts,4 annotations. All five protected source-session hashes remain unchanged. All seven sessions created during this acceptance run are completed and preserved; no records were deleted. The desktop checklist in ticket08 is now evidenced, with actual-device/speech/browser-zoom and exact historical clipping conditions explicitly open rather than falsely certified.

## Acceptance continuation, 2026-10-14

This checkpoint supersedes older browser-pending rows only for the scenarios named here. Ticket 08 remains open for the explicitly listed device, accessibility and fault-control limits. Scoring authority is separate; no answer keys, source passages, historical grading or backend functions were changed by this acceptance work.

The starting checkout was `dc107de989ff930471f7445585e197be3fb3eaea`, 134 commits behind fetched `origin/main` (`f75dc85dc90f17df125deaaac14f9d3f9cfce4b9`). Independent comparison found the RC, finder and official-reader paths byte-identical upstream. Lovable read-only metadata confirmed `f75dc85d` synced, and fresh production served `index-CuKguElX.js`. Shared navigation changes were distinguished from RC code. Four unrelated hook/MCP modifications were preserved.

Production testing used dedicated student `d763bfe6-d710-4c4b-90ff-4b3a20929211`. Initial read-only receipt at `2026-10-14T04:42:52.071Z` retained 19 sessions, 165 attempts and 2 annotations. In-app browser startup initially timed out; a dedicated Playwright CLI browser supplied the early live checks. The in-app browser recovered and supplied native docked and local-repair checks. No existing records were deleted.

| Acceptance check | Fresh observed result | Evidence / limits |
|---|---|---|
| Finder keyboard and selection | PT140 S4 lists 27 options in four official passage groups. ArrowDown walks Q1 through Q27, skipping headers; typeahead selects Q17; Escape returns focus to Question. Selection stays at Practice. | Native dropdown and selected Q17 fit; early responsive checks at 390×844, 700×900, 1024×768, 1366×768 and 1920×900 had no horizontal overflow. |
| Finder read failure | Blocking `/data/finder-address-index.json` exposes Retry. Entering `PT140 S4 Q17`, unblocking and retrying retains Q17 and enables Open question. | Controlled in-app CDP block; block and cache override cleared. |
| Read-only preview | Opening Q17, reloading and returning preserves session/attempt/annotation counts and all three hashes. No RC storage keys appeared in the early prefix-limited sample. | Prefix-limited storage observation is not exhaustive storage certification. Return route includes the original Practice query. |
| Builder | Zero picks/removing last passage disables Preview; Karl Popper previews one passage/eight questions. Custom 0:00 errors; 1:00 accepts. Timing changes invalidate Start. Science + Comparative + difficulty 4 yields four passages/26 questions for eight requested; Start stays disabled until shortfall acknowledgement. | Search `Karl Popper` intersects the filters. Multiple topic selections use union behavior. Automatic set was previewed, not started. |
| Preferences and responsive reader | Five sizes, three spacings and six schemes apply. All 90 combinations at 1366×768 avoid horizontal overflow. Largest/Roomiest/white-on-black survives reload. Popup bounds and Escape focus pass at six widths, including 480px. | Font sizes 13.5/18/22.5/27/31.5px; default line height 28.8px. Reduced-motion emulation checked. Actual browser zoom and screen-reader speech are not proved by these checks. |
| Rejected answer save | Rejected `rc_attempts` write pauses clock/questions, preserves choice and recovers through Retry save. | Session `54cff6c2-3630-4290-9e68-ec3e2c1efcd5`, passage 78, official PT144 S1 Q20–27. |
| Annotation recovery | Rejected annotation write exposes Not saved and Retry saving marks. Reload restores the mark and actor+passage recovery; retry acknowledges Saved and clears its recovery entry. | One additional personal annotation on passage 78; existing marks preserved. |
| Flag recovery and newer intent | Rejected flag write exposes retry and actor+session+question recovery. Reload retains it; acknowledgement clears it. Holding an older successful reply while changing the flag again preserves the newer choice; two writes acknowledge. | Same dedicated session, question ID 524. Final backend flag true. |
| Lost completion acknowledgement | Completion response was discarded after server processing. A save/clock recovery screen retained all answers; Retry save recognized completed state and opened results. Double-click confirmation did not duplicate first attempts. | Backend confirms completed session and exactly eight first attempts, IDs 524–531. `output/playwright/rc-acceptance-2026-10-14/completed-results.png`. |
| Lost creation acknowledgement | Explicit preview Start was double-clicked; the session POST response was discarded after server processing. The app recovered automatically into one six-question session, starting at official Q17 / Drill4. | Session `f5e38f2a-e329-4119-b819-9add3d21c54c`, passage16. Later all six answers were checked and Finish reached results with zero unanswered. `output/playwright/rc-acceptance-2026-10-14/recovered-launch-results.png`. |
| Protected review and in-progress refusal | Protected session `06324cd6-76fe-46de-9689-f4644e7cb124` navigates official identities, switches passage-only mode, reloads and exits without session/attempt writes. In-progress `08fc2b6f-2fe9-4b4c-8137-2b7b14c6c412` refuses review without clock mutation. | Before/after receipts in `output/playwright/rc-acceptance-2026-10-14/backend-{before,after}-protected.json` retain identical hashes for all three tables. |

### Demonstrated scroll defect and correction

Native production at 1280×720 reproduced a long-passage toggle defect: split scrollTop720 became377.6 in passage-only layout, then stayed377.6 after returning. The repair stores separate positions per passage and layout. Signed-in local Vite8091 restored720 after the same clamp. A focused regression checks layout restoration, ordinary-render stability and new-passage reset. Independent review found no high-confidence defect. The changed reader passed the complete six-width popup/overflow matrix before pushing.

Repair commit `85762bb7` was integrated with current upstream in `8ab6fe29d3174896254f3a951a55599e091ab58e`. Dependencies were synchronized from the unchanged lockfile after the first merged build identified missing `ionicons`. Final merged focused tests passed417/417; typecheck, changed-file lint and build passed. Build verified2150 RC identities and scanned757 files. Safe-push passed its final merged typecheck and pushed main. All four unrelated files retained exact pre-merge hashes; the three hook files already matched upstream, and the MCP modification remains unstaged. The preservation stash was applied and retained as a recovery copy.

Lovable read-only metadata confirmed exact synced commit `8ab6fe29` before free Publish changes. The UI reported Your website was updated; fresh production changed to `index-tSutFC8i.js`. Signed-in production repeated the repaired720→377.6→720 sequence. Screenshot: `output/playwright/rc-acceptance-2026-10-14/production-scroll-restored.png`. No Lovable AI message, credit-spending action, backend-function deployment or key correction was performed.

### Additional final production acceptance

- Automatic Science + Comparative + difficulty4 preview disclosed PT142 Neuroscience & Criminal-Justice (5 questions) and PT145 Communication Systems (6). Double-click Start created one session `307f5534-73d2-4f4f-93c0-ce390dd21a1a`, passages86/363, with those exact11 identities. Official PT142 S3 Q17–21 occupied Drill1–5, while PT145 S3 Q14–19 occupied Drill6–11. Each A choice kept credited-answer content absent before Confirm and showed it only after acknowledgement. Double-click submission reached completed results with zero unanswered. Screenshot and reveal receipt: `output/playwright/rc-acceptance-2026-10-14/production-automatic-results.png` and `production-reveal-boundaries.json`.
- A secondary teacher actor in the separate localhost browser received This drill belongs to another account when opening the tester's session. No tester marks or recovery statuses appeared. This is local-app/live-backend ownership evidence, not a physical-device or pending-write account-switch test. The production tester was reauthenticated afterward; the secondary account's other sessions were not signed out.
- Blocking the annotation endpoint exposed Passage marks could not be loaded, editing unavailable, and Retry loading marks. Unblocking/retry restored the saved mark. A held200 response showed Loading passage marks with zero marks, but the in-app raw-CDP continuation returned Invalid InterceptionId on two attempts. Interceptors were cleared and normal loading verified after reload. Successful stale/delayed reply release and rapid-passage teardown remain unproved by that partial probe.
- Native reader Tab traversal reached layout, passage search, all mark tools, preferences and bookmarks with visible computed outlines. Sampled toolbar targets were at least25.6px in both dimensions. Measured passage color contrast ranged6.28:1 to21:1. These are DOM/keyboard checks, not speech or complete accessibility certification. Responsive repair receipt: `output/playwright/rc-acceptance-2026-10-14/local-responsive-matrix.json`.
- Final read-only backend receipt at `2026-10-14T06:03:44.011Z` confirms22 sessions,190 attempts,3 annotations. Three new completed sessions have exactly8,6 and11 first attempts respectively. All five protected source-session hashes remain identical to the pre-review receipt. `output/playwright/rc-acceptance-2026-10-14/backend-final.json`. Existing records were preserved.

### Current automated receipts and explicit remaining limits

Before the scroll correction, fresh RC index tests passed7/7, index verification matched2150 identities, focused tests passed409/409, typecheck passed and build passed the751-file exclusion scan. Full suite on starting checkout:27 failed,6203 passed,1 skipped assertions (`C:/Users/Joshu/AppData/Local/Temp/rc-acceptance-2026-10-14-full-suite.json`); this remains a failed suite. Targeted lint had0 errors and12 warnings. The scroll fix's focused slice passed33/33 and typecheck passed; final merged gates passed as recorded above.

The final merged full suite remains red:43 failed,6757 passed,1 skipped assertions across6801 tests. Receipt: `C:/Users/Joshu/AppData/Local/Temp/rc-acceptance-2026-10-14-merged-full-suite.json`. Independent upstream `f75dc85d` verification reproduced37 identical failures; a separate isolated obligation test reproduced one more on both baseline/current. The other five full-suite failures passed on current focused rerun. Thus38 of43 were independently reproduced upstream, with five variable failures, not one baseline run proving all43. Baseline and rerun receipts use prefix `rc-acceptance-2026-10-14-` in Temp. No sustained regression attributable to the RC repair was identified; no whole-suite success is claimed.

Still unverified: physical phone/cross-device persistence; actual screen-reader speech and browser200% zoom; pending-write actor-switch and broader mixed-owner combinations; successful controlled delayed/lost annotation reply release, rapid-passage/teardown and duplicate/lost acknowledgement permutations. The zoom shortcut in the in-app browser did not produce measurable zoom, and raw-CDP interception continuation failed as described above. The original attached screenshot's exact clipping condition is unidentified and cannot be declared reproduced or fixed. Current native docked1280×720 and responsive checks do not show that clipping. Separate scoring authority and repository failures remain open. Ticket08 is not fully closed.

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

Independent review approved the change. The expanded focused receipt (`C:/Users/Joshu/AppData/Local/Temp/rc-final-acceptance-tests.json`) reports 409/409 passing. A separate final Hub rerun passed 34/34. Final targeted lint had zero errors and three existing ClassroomLayout warnings; full typecheck passed. The final build after all source edits passed, with 2150 exact index identities, 751-file content scan and entry `index-BXnoJ-p9.js`. The built app at 8081 showed At the end still pressed after manual selection and Custom 1:00. Safe-push typecheck passed and pushed `8ad748b0ba0c0ce660c43c467679c4f21c270664` to main without remote divergence.

Lovable's read-only project metadata confirmed that exact code commit had synced before the free Publish changes action. The publication UI then reported Your website was updated. Fresh production loaded `index-Dn3d15C_.js`. The final screenshot overwrites the earlier receipt at `C:/Users/Joshu/.codex/visualizations/2026/10/07/01a11839-ea0a-74f3-8979-f6bda1202b18/rc-final-publication.png`.

On this published build, At the end was selected while Loading passages was still visible and remained selected after the index arrived. Manual Miles Davis/PT104 S2 P1 preview disclosed six questions and Custom 1:00 before Start. Session `9e709f8a-0fbe-489e-b941-8a55e65d2688` retained all six A choices and official Q6/Drill6 after Save and exit then reopening. Correctness stayed hidden through navigation and resume, and only explicit Submit reached results 1/6 with zero unanswered. Screenshot: `C:/Users/Joshu/.codex/visualizations/2026/10/07/01a11839-ea0a-74f3-8979-f6bda1202b18/rc-production-at-end-results.png`.

Final read-only receipt at `2026-10-09T15:28:18.598Z`, saved to `C:/Users/Joshu/AppData/Local/Temp/rc-production-final-receipt.json`, confirms 19 owned sessions, 165 attempts and 2 annotations. The final session is completed, contains passage 1320, saves `end_of_set` with `secondsPerPassage: 60`, and has exactly six first attempts. Production acceptance now covers after-question, after-passage and at-end boundaries, save/exit/resume, pause/reload, acknowledged retries and practice-budget overrun in the dedicated account. No existing account records were deleted.

### Final acceptance limits

The planned code repair is implemented, independently reviewed, safely pushed and published. This is not unrestricted acceptance: the repository-wide suite remains red with independently reproduced baseline failures; actual screen-reader speech, physical phone/cross-device persistence, exhaustive keyboard/browser-zoom/docked layouts, and controlled live annotation/flag actor-switch or lost-reply fault injection remain unverified. Those paths have focused automated coverage where recorded, but automated tests are not live-device proof. PT159 S2 Q2 and broader key authority remain separate and unadjudicated. These open checks supersede historical table states below; no answer-key certification or full-suite success is claimed.

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

### 2026-10-14 answer-key follow-up

The separate answer-key investigation now has a full-bank audit and 56 independently corroborated corrections, including PT159 S2 Q2 to D. See [the repair evidence](../audits/2026-10-14-rc-answer-key-repair.md) for exact scope, historical-score handling, checks and publication receipts. This follow-up does not close the unrelated browser/device acceptance gaps above.

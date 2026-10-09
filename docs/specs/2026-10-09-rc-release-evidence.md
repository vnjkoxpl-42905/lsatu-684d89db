# RC repair evidence and remaining release gates

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

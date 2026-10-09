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
| Index completeness | Historical ticket01 review exists; final working-tree run not independently observed by this ledger's writer | Rerun `npm run test:rc-index` and `npm run rc:index:check`; preserve all source/key data. |
| Whole repository suite, typecheck and build | Pending final integrated results | Record actual failures and their baseline comparison; do not relabel unrelated failures as passes. |

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

The new `useRcMarkSurface.test.tsx` does not exist at the reviewed base. Its fresh current run with `--silent --no-cache` passed3/3; the earlier cached failure was not reproduced. The toolbar responsive fix also passed its2 preference tests and targeted lint with0 errors and the two existing export warnings. These are focused results; final integrated focused results remain the integration owner's gate.

## Browser acceptance must identify the actual scenario

The integration owner's initial final RC slice passed315/318; its only three failures were the protected-history baseline mock missing the current authenticated `.eq('user_id', actor)` query chain. That relevant test stub now supplies the actor and actually filters returned rows. Existing UI expectations remain intact. An added direct `listSessions` adapter test confirms another account is excluded and native sitting/full-PrepTest budgets and identities map correctly without inventing reveal timing. Fresh protected-history verification passed5/5 with `--silent --no-cache`. A final integrated rerun is still required; this focused repair does not itself establish the whole slice is green.

No fresh browser result has been independently supplied for this integrated slice yet. Existing 2026-10-07/08 screenshots are historical comparisons, not acceptance for the current changes.

| Scenario | Required evidence | Current state |
|---|---|---|
| Finder and read-only preview | `/practice/drills?section=rc` -> PT140 S4 Q3/Q17 -> `/rc/preview`; exact source question, grouped selector, no session/attempt or device write before Start; keyboard/Escape/focus return | Pending |
| Explicit launch | Dedicated test record from preview; actor, session UUID, exact passage/question IDs, disclosed whole-passage count, return destination; duplicate click and lost-reply recovery | Pending real-backend acceptance |
| Builder | Manual/automatic, zero picks, removal, filter intersections, preview invalidation, exact preview/start identities, shortfall and invalid custom timing | Automated tests must be recorded by the integration owner; live sweep pending |
| Reader and preferences | Standard/comparative and long passage; split/passage-only;18px/1.6 default; all sizes/spacing/colors; reload and preserved same-passage scroll | Pending current browser walk |
| Saves | Dedicated test actor/session; delayed/failed answer, annotation and flag acknowledgements; reload of pending recovery; actor switch before delayed save | Automated fault-injection evidence is separate from real-backend acceptance, which remains pending |
| Lifecycle | Three reveal modes; pause/resume, timer overrun, save-exit/reload, completion and protected review | Automated coverage is listed above; dedicated real-session acceptance pending |
| Responsive and keyboard | 390x844,700x900,1024x768,1366x768,1920x900; actual sidecar;200% zoom/text resize; popup bounds, no lost controls/horizontal text scroll, full keyboard task walk | Pending |
| Original clipping | Reproduce the reported screenshot condition before attributing or closing it | Unresolved |
| Screen reader / physical device | Announced passage groups/current question/selected preferences/save status; physical phone and cross-device persistence | Open; desktop emulation cannot certify these |

For every live test, record route, viewport/zoom, actor role, test session/record identity, action, observed result, and screenshot/DOM evidence path. Preserve test records; cleanup requires authorization. Never place credentials in this ledger.

## Publication and scoring remain separate gates

- Final intended diff, unrelated MCP working-tree preservation, full check results and reviewed commit: pending.
- Safe-push gate, deployment identity and deployment success: pending.
- Fresh signed-in production walk against the deployed commit: pending.
- PT159 S2 Q2 answer-key authority and affected-scope adjudication: open. No key changes or scoring certification are implied by this UI repair.

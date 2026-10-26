# RC T10 regression review

Reviewed 2026-10-18. This report distinguishes deterministic source/test evidence from real account, device and learner acceptance. It does not certify the full plan complete.

## Expanded regression execution

The final local integrated command passed 813 tests across 80 files, including the new owner-scoped full-test parent guard, delayed-review cancellation, ordinary-marker privacy, unanswered history and abandoned-session regressions. Typecheck and production build passed. Four Node overlay tests passed against the final 1,898-correction manifest. The build verified 2,150 bank/search/Finder identities, applied no answer-key correction and passed the postbuild content-isolation check. Exact committed-head CI is tracked on PR #222 separately; an earlier head (`43c0f603`) passed 808 tests, typecheck, overlay tests and build.

Live QA exposed two ordinary-session defects after the initial regression: unanswered started drills were omitted from In progress, and discarded drills still opened through an old URL. Both were repaired and independently reviewed. The adapter preserves active ordinary sessions with zero first answers while excluding protected, assigned and abandoned rows. Both player entry paths reject abandoned sessions before hydration, and answer/flag writers reject their persisted abandoned status. Focused checks passed 11 history, 55 API and nine player tests; these overlap the integrated total and are not added again. The exact live record and confirmation/cancel/reload sequence are in the browser report. This is client behavior proof, not a new claim of atomic backend enforcement against a concurrent discard.

The source/fixture follow-up for protected preflight passed 40 tests (18 section-freshness and 22 standalone-runner tests), already included in broader coverage rather than added again. Merely opening the protected URL is read-only; Prepare creates a ready sitting with no RC child; commit Start creates the child and changes the sitting to running. Fresh checks history, RC children and exposure records, not ready sittings. The runner returns the ready preflight before rendering the reader, and the client rejects a child attached to a ready response. Thus the checked-in protected path preserves Fresh until Start, including an eventual all-skipped section once started. The disabled capability's legacy fallback is a different path and is not called protected preflight here.

This conclusion traces `rcSections.ts`, the standalone writer SQL artifact, the standalone runner and client contract. It is not a readback of the deployed function definition. No new sitting or clock was created for this follow-up. The deployed backend parity check remains distinct from source/fixture proof.

## Initial focused regression execution

196 tests passed across nine files:

```text
npx vitest run src/lib/timedSectionClient.test.ts src/lib/timedSectionStore.test.ts src/lib/timedSectionController.test.ts src/components/timed/TimedStandaloneSectionRunner.test.tsx src/components/testing/TimedOfficialChildRunner.test.tsx src/components/drill/SectionSelector.test.tsx src/features/rc/lib/rcLearning.test.ts src/features/rc/pages/RcResults.protected.test.tsx src/features/rc/pages/RcPlayer.saveSafety.test.tsx
```

Separately, all 19 `RcChoiceRow.test.tsx` tests passed. No production/account writes were used in these runs. Existing React Router future flags, a combobox act warning and stale Browserslist warnings appeared; these are not failed assertions.

Added eight transport tests: RC standard (35 minutes), time-and-a-half (52 minutes 30 seconds), double-time (70 minutes), and untimed each retain exactly the account-acknowledged frozen budget. Contradictory pace/budget authority is rejected before replacing retained authority. The first attempt at the new fixture incorrectly supplied an authority response to the capability request. The fixture was corrected; both the transport rerun and aggregate run passed. This was a test fixture error, not a product defect.

Added five accessible-description assertions covering ordinary, selected, eliminated, disabled and revealed choice rows. `RcChoiceRow` already associates its rendered, markable answer text through `aria-describedby`; a short accessible name such as Choice B does not mean the description is absent. All five assertions pass without a component change. This is semantic DOM evidence, not actual screen-reader speech.

## Acceptance cases and actual evidence

| Case | Deterministic evidence | Remaining real-world proof |
|---|---|---|
| Feature off | SectionSelector tests distinguish protected direct routing and legacy fallback clock wording. Transport disabled capability refuses mutations while allowing reads; pending commands survive. | Production flag changes were not performed; account fallback journey remains untested live. |
| Accommodations | Four exact frozen pace/budget pairs validated; mismatches fail closed. URL parser rejects arbitrary custom protected durations. | Actual accommodated account prepare/start/expiry not exercised by this review. |
| Expiry | Store bounds elapsed time at lease expiry, rejects expired writes and permits explicit claim. Runner saves current RC answers before closing at acknowledged budget boundary. | Full-length live accommodated/standard cutoff and real offline/device claim conflict. |
| Reconnect and lost reply | Stable pending command retained across reload/retry; uncertain replies do not get replacement commands. Failed pause/exit checkpoints block exit. Ordinary drafts, position and review commands survive recovery. | Broader real network interruptions, server/device disagreement and two physical devices. |
| Actor switch | Transport rejects before send and after response; isolated owner/work queues; runner immediately hides former owner's content and ignores old replies. | Actual logout/login to another authorized account and two actual devices. No second account was impersonated. |
| Protected/assignment policy | Protected result retry/exclusion disabled; active section redirects ordinary player to protected runner; review links cannot resume protected work. Separate learning writer rejects assignment/timed identifiers. | Sealed full-test release lifecycle and all assignment policy variants still need their own account journey. |
| First-answer integrity | Historical correctness retained across current answer-key correction; review answer history stays separate; unanswered closeout cannot become true correctness. | Existing signed-in acceptance is recorded in rc-plan-completion.md, not repeated here. |
| Accessibility | Named controls and descriptions, keyboard-ready DOM, component tests. Parent review separately records browser keyboard/responsive observations. | Screen-reader speech, physical touch trials, actual browser 200% zoom and assistive-technology combinations. |
| LR preservation | Shared controller/client and child runner tests run LR and RC fixtures; LR regulation cutoff/overtime remains distinct from RC close. | Broader LR product acceptance remains outside the RC-first redesign scope. |

## Gates an automated reviewer cannot honestly substitute

The canonical plan requires physical phone/tablet/laptop interaction, actual screen-reader speech, representative first-time learners, equivalent competitor tasks, and delayed retention with fresh versus repeated material distinguished. Browser emulation and synthetic account/transport fixtures cannot become these observations. Recruit the specified 5-8 formative learners, record task counts/failures and timing, revise, then execute the larger acceptance sample. No superiority, retention or 90% task-success claim is supported by the deterministic test count.

No confirmed production bug was found in this bounded T10 source review. No component, account data, backend, migration, release flag or production clock was changed by this reviewer. Remaining external acceptance gates stay open until their actual evidence exists.

## Authored correction durability

The final frozen bank passed `audit-rc-authored-integrity.mjs`: 59 bank files, 320 passages and 2,150 questions, zero protected-field or structural errors against `94e76565b7b7c7c3924d2caa4a0dd8cdf94271d2`. Exact paths and whole-bank hashes are in `rc-authored-integrity.md`.

The regeneration path now applies `scripts/rc-authored-corrections.json` after the existing official answer-key correction overlay and before writing any output. Its 89 leaf corrections bind PrepTest, passage, question and choice identities, permit only the declared authored fields, and require either the exact original or already-corrected authored value. All corrections validate before any bank mutation. Unknown upstream edits fail closed. The report groups summary-object changes, so its 86 path count is not the leaf-overlay count.

Four Node tests passed with `node --test scripts/verification/rc-authored-corrections.test.mjs`: exact in-memory reconstruction, idempotence, unexpected-base failure without partial mutation, and protected mutation/identity rejection. CI reconstructs the original authored values from the reviewed overlay and needs no historical Git object. The independent audit performs the full official-source comparison. The destructive bank regeneration command was not run.

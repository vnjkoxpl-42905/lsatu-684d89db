# Drill setup #171: verification record

Date: 2026-10-02
Ticket: [#171](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/171) (parent #165, decision source #155)
Base: `main` at `0f48e6580078e4fe5b0b90065a44e27f1d4d312b`
Branch: `claude/clever-tesla-ydq19p`
Status: **local source complete for this slice; production acceptance pending** (see the end of this file)

This is a bounded slice of #171: builder accuracy and launch clarity for LR and RC, truthful counts and timing, and regression proof that Inspect stays score-free. It is not the whole ticket and not a runner change.

## 1. Current truth before editing

Traced paths, read only unless listed under section 2:

- LR setup: `src/pages/AcademyMainhub.tsx` `LauncherStage` loads the bank through `useQuestionBank` (loading spinner, error plus "Reload the question bank") and mounts `QuestionPicker` only after the manifest loads. Start navigates to `/drill` with `{ mode: 'type-drill', config, returnTo }` and no `launchKind`.
- LR runner (`src/pages/Drill.tsx`, not edited): a `selectedQids` config enters practice-set mode. It uses a stopwatch, records picks in memory, offers **Show Answer** per question, and shows `PracticeSetResults` at the end. `reviewPolicyForRun` returns `none` because the builder sends no `launchKind`.
- LR Inspect: `LrQuestionInspectList` reads `questionBank.getQuestion` only. `recordExposures` runs only inside `handleLaunch`.
- RC setup: `RcHubSurface` (standalone `/rc` and the drill hub) loads the static index (`/data/rc/rc-index.json`), question history, and optionally the session list. Inspect calls `loadPassages` (static JSON) only. Start calls `createSession` (server-generated ID), or hands a canonical manual section to the protected timed flow.

### Acceptance-gap table

| Requirement | Implementation found on base | Missing behavior | Planned edit | Verification |
|---|---|---|---|---|
| LR exact picks survive filters, dedupe, block oversize and shortage | `composeLRDrillSet` + `getLRDrillSetAvailability`; picks are a `Set`; hints for oversize and shortage; Create disabled | Pool entries were not deduplicated by canonical ID; no UI test for oversize | Dedupe pool by `qid` in the helper; add tests | Unit and component tests; browser shortage walk |
| LR preview equals launch | `previewedQids` frozen and launched; effect cleared it on change | Invalidation was effect-based (one render late) and silent | Preview stamped with a composition key, so it is active only while unchanged; visible "Your set changed" notice; search excluded from the key | Component tests; browser stale notice at 5 widths |
| LR duplicate launch | none | Double click could call `onStartDrill` twice | Synchronous `launchingRef` | Batched double-click test (fails when the guard is removed) |
| LR actor separation for attempt counts | Loaded on `user` change, no cancellation | Late reply from a previous account could paint counts | Cancel stale reply, reset counts, key on `user.id` | Source review (no harness for account switch) |
| LR mode and feedback before Start | None shown | Student could not tell Training from Test or when answers appear | Label traced from the runner: "Training set, not a timed test" + detail; in rail, mobile tray, and Inspect dialog | Component test; browser at 5 widths |
| RC unit disclosure | Stepper labelled "Passages" | Unit and hand-pick override not stated | Hint under stepper; stepper disabled and shows the hand-picked count while hand-picks exist | Component test; browser |
| RC requested / pool / actual counts | "Choosing from X of Y passages"; hand-pick footer from the index | No single launch summary; question count not from loaded content | `rcBuilderSummary.ts` + "Launch summary" region: Requested, Available, This drill (passages and questions from loaded content), Timing, Answers | Helper tests; component test asserting loaded count, not index count; browser at 5 widths |
| RC timing from actual count | Hint used the stepper `count` | Wrong total for hand-picked or short sets | Timing from planned/inspected passage count | Helper and component tests; browser hint "30:00 for 3 passages" |
| RC custom time validation | Uncontrolled field, any number accepted on blur, invalid text silently ignored | Invalid input not explained, could not block launch | Controlled field, `m:ss` or minutes, 1:00 to 60:00 (same bounds as the `secondsPerPassage` link parameter), error text, `aria-invalid`, Inspect and Start blocked, normalized to `m:ss` on blur | Helper tests (21 cases); component test; browser at 5 widths |
| RC smaller adaptive set | Started silently with fewer passages | No acknowledgment | Start disabled until the student ticks "Only N passages of the M you asked for... Start with N passages" | Component test; browser |
| RC pending/failed Inspect | Request counter + key check; missing/misordered blocked | Passage loading without questions could pass | Zero-question passage blocks inspection | Component test |
| RC load failure | "The passage list could not be loaded." plus "Choosing from 0 of 0 passages" | False zero pool; no Retry; history failure silent | No pool count until loaded; Retry; refresh failure keeps hand-picks but disables Inspect/Start; history failure warns that Fresh/Incorrect cannot be trusted | Component tests; browser with the index request failed once |
| RC duplicate Start / unknown outcome | `starting` state only | A batched double click could create two sessions; a failed create might have saved a row | `startingRef`; after a failed create, read back an in-progress session for the same passages, reveal, timing, and practice-test run started since the click (2 min skew); if the read fails, the next Start checks before creating | Component tests (both fail with the guard removed); browser unauthenticated Start |
| RC link contracts (`start=1`, `returnTo`, assignment, `ptRun`/`ptLeg`, canonical manual section) | Present with tests | Must not regress | Untouched; navigation moved into `openSession` unchanged | Existing 11 tests still pass |
| Inspect writes nothing | LR and RC Inspect read static content | Proof | Tests assert no `createSession`, `deleteSession`, `listSessions`, navigation, `onStartDrill`, or `recordExposures` during Inspect | Component tests; SavedSets Inspect suite |
| Smart Drill one-click and current-question identity | In `Drill.tsx` / drill home | Out of this allowlist | No change | Existing suites pass |

## 2. Files changed

- `src/components/drill/QuestionPicker.tsx` and `QuestionPicker.test.tsx`
- `src/lib/lrDrillSetComposition.ts` and its test
- `src/features/rc/components/RcHubSurface.tsx` and its test
- `src/features/rc/lib/rcBuilderSummary.ts` and its test (new pure helper)
- `src/features/rc/rc.css`: one builder-only block (disabled stepper, focus ring, error and alert edges, launch summary grid); player styles untouched
- this file and `docs/implementation-plans/artifacts/2026-10-02-drill-171/`

Not touched: `Drill.tsx`, `RcPlayer.tsx`, `LrQuestionInspectList.tsx`, `lrDrillFilters.ts`, routing, auth, Supabase types, migrations, bank data, schedule/session-chain code, coverage ledgers, and Codex records. A temporary dev route used for the RC browser walk was removed before commit.

## 3. Checks run

| Check | Result |
|---|---|
| `npx vitest run src/pages/SavedSets.inspect.test.tsx src/components/drill src/features/rc src/lib/lrDrill src/dev/DrillSetupPreview.test.tsx src/pages/AcademyMainhub.test.tsx src/lib/drillReviewPolicy.test.ts` | 44 files, 356 tests passed |
| Focused: `QuestionPicker.test.tsx` 19, `lrDrillSetComposition.test.ts` 5, `lrDrillFilters.test.ts` (unchanged), `RcHubSurface.test.tsx` 26, `rcBuilderSummary.test.ts` 21 | all passed |
| Mutation checks: removing the RC Start guard, the RC shortfall gate, the LR launch guard, the LR composition key, or the pool dedupe each fails at least one new test | confirmed |
| `npm run typecheck` | passed |
| `npx eslint` on the eight changed TS/TSX files | passed, no warnings |
| `npm run build` | passed. It rewrites `public/data/_bank.generated.json` and `public/data/finder-address-index.json` (timestamp churn); both were restored and are not in this change |
| Full `npx vitest run` | 60 failures in 19 files, **identical on unmodified base** (stashed and re-run). Examples: `AcademyMainhub.section.test.tsx` cannot find a "Reading Comprehension" button; `standaloneDrillHistory.test.ts` reads `startsWith` of undefined. Unrelated to this change |

## 4. Browser evidence

Real Chromium against the Vite dev server, real static banks, no account. Scripts and JSON logs are in `artifacts/2026-10-02-drill-171/` (`lr-walk.mjs`, `rc-walk.mjs`, `zoom.mjs`, `*-walk-log.json`).

- **LR:** `/dev/drill-setup-preview`, which mounts the real `QuestionPicker` over the real LR bank.
- **RC:** a temporary, uncommitted DEV route rendering `RcHubSurface embedded` inside `.classroom-root.classroom-root-drill > .drill-observatory-root > .drill-observatory-launcher`, matching the drill hub. Without an account, history reads and `createSession` fail, so those paths show their real unauthenticated behavior.

Widths 390, 700 (docked-pane approximation), 820, 1280, 1440. Doubled text was checked two ways: root font-size 200% (rem text only; observatory tokens are px) and a true 200% zoom (viewport width/2 at device scale 2) at 820 and 1440.

| Walk | Result at every width |
|---|---|
| LR non-LR reference `PT101.S1.Q1` | Refused with "Nothing was added" (PT101 S1 is RC) |
| LR exact pick `PT101.S2.Q1` + pasted range `PT102 S2` | "1 added to set"; "25 available from filters for 9 remaining places. 1 chosen question stays in the set outside the filters." |
| LR preview + Inspect | Exact pick appears once, first; 10 rows; no answer key text; mode label visible before Start |
| LR composition change | "Your set changed..." visible; no Start button until a new preview |
| LR shortage `PT102 S2 Q1,2`, size 10 | "The filters need 7 more questions..."; Create disabled |
| LR Inspect dialog under zoom | Initially failed at 390 with root font-size 200%: header and footer squeezed the list to 0 px. Fixed (list floor, dialog scrolls); list now 305 px at 390 and 160 px at 200% zoom |
| RC index request failed once | "Passage list unavailable", Available "Not known until the passage list loads", Inspect disabled; Retry restored "Choosing from 256 of 320 passages" |
| RC custom `8:75` | Field keeps `8:75`, error "Seconds must be between 00 and 59. Inspect and Start wait for a valid time.", Inspect disabled; `10` normalizes to `10:00`; hint "10:00 per passage · 30:00 for 3 passages" |
| RC Inspect 3 passages | Summary question total equals the sum of inspected rows at every width (for example 21 = 8 + 6 + 7); no answer key text |
| RC setting change after Inspect | "Your settings changed, so the inspected set was cleared." Primary returns to Inspect set |
| RC shortfall (PT 101 only, difficulty 3, 4 requested) | 2 passages, 15 questions; Start disabled until acknowledged |
| RC Start without an account | No navigation; "You need to be signed in to drill. We could not confirm whether the drill was created. Press Start again and we will check before making a new one." |
| Horizontal overflow | None (scrollWidth equals clientWidth at all widths, both text checks) |
| Keyboard focus | Primary RC button shows a 2 px solid outline |

Known layout note: on 390 px the LR mobile tray grows by two lines with the mode label. The wrapped "Set up an LR drill" heading at 390 px is pre-existing.

## 5. Not verified here (pending for Codex)

- Signed-in RC Start, resume, and Results through the real backend, and the unknown-outcome read-back against real RLS. Only mocked tests and the unauthenticated failure path were exercised.
- Signed-in LR launch into `/drill`, run persistence, Continue, and mode/source after resume. This change does not alter the runner contract; the LR config passed to `onStartDrill` is unchanged apart from the guard.
- LR bank load failure and Retry live in `AcademyMainhub` (outside this allowlist; existing "Reload the question bank" path), not re-verified.
- Account switch during the LR attempt-count read: covered by source change only.
- The docked sidecar layout was approximated with a 700 px viewport, not the real docked pane.
- No real student account, answers, or paid AI were used.

## 6. Proposed follow-ups outside this allowlist (for Codex)

1. **LR mode persistence.** The builder sends no `launchKind`, so `reviewPolicyForRun` returns `none` and the run is not tagged as a `questions`/`filter` launch. Persisting mode and feedback cadence with the attempt (ticket acceptance item 3) needs a `Drill.tsx` and run-ledger change, plus possibly a column. This slice states the actual behavior instead.
2. **Timed LR Test mode** does not exist in the builder. Adding it is a runner slice, not a label.
3. **RC idempotent create.** Recovery here is a read-back heuristic because the session ID is server-generated. A client-supplied ID or idempotency key in `rcProgress.createSession` (and an insert policy check) would make it exact.
4. **RC builder actor change.** `RcHubSurface` does not read the auth user; history is loaded per mount. If an in-place account switch without remount is possible, key the load on the user ID.
5. **Pre-existing test failures** listed in section 3 (19 files, 60 tests on base).

## 7. Requirement-by-requirement evidence

| Spec item | Local evidence | Production acceptance |
|---|---|---|
| 3.1 PT/S/Q pick adds without launching | Existing test + browser | Pending |
| 3.2 Search is discovery only | New test (preview kept on search change) | Pending |
| 3.3 Picks survive filters, shown plainly | Existing test + browser text | Pending |
| 3.4 Dedupe | New helper and component tests; browser "once" check | Pending |
| 3.5 Too many picks blocked | New component test | Pending |
| 3.6 Fill only from the filtered pool | Existing helper test | Pending |
| 3.7 Shortage blocked | Existing test + browser | Pending |
| 3.8 Pasted references, invalid reported | Existing test + browser non-LR refusal | Pending |
| Preview 1-3 (same IDs, visible invalidation, frozen before async) | New tests; LR has no async persistence before launch | Pending |
| Preview 4 (validate against bank; failed read) | `handleLaunch` checks every ID and uniqueness; RC Retry tests | LR bank failure path unchanged, pending |
| Preview 5 (Continue opens saved run) | Unchanged; RC recovery opens the saved session | Pending (needs auth) |
| RC 1-9 | Helper, component, and browser evidence above | Pending (signed-in) |
| RC 10 link contracts | Existing tests pass unchanged | Pending |
| Launch modes 1-2 | LR and RC labels; no new controls | Persistence is follow-up 1 |
| Inspect 3-4 (no writes) | Tests assert no writer calls; SavedSets Inspect suite passes | Pending account check |
| Inspect 5-6 (runner controls, Smart Drill) | Not touched | n/a |
| Errors, identity, a11y (section 5) | Retry, guards, recovery, focus ring, words before color | Actor switch partly pending |

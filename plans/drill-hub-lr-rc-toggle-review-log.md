# Review Log: LR/RC drill-hub section toggle

Started 2026-08-26. MAX_ROUNDS=5. Reviewer: Codex CLI 0.142.5, **model `gpt-5.5`** — the configured `gpt-5.6-sol` 400s on this CLI version ("requires a newer version of Codex"), so the run falls back to the CLI default. Codex is read-only every round. Reviewed: the spec at `plans/drill-hub-lr-rc-toggle.md` plus the built Phase A working tree.

## Round 1 — Codex

**Findings**

1. **High — Back from Smart RC creates duplicate sessions**
`src/components/mainhub/RcHubSurface.tsx:301`
The autostart effect consumes `start=1` only in component state, then `start()` navigates to `/rc/drill?...` without replacing or clearing the launcher URL. Browser Back returns to `/classroom/drill?section=rc&stage=type-drill&count=1&timing=untimed&reveal=per_passage&start=1`, remounts `RcHubSurface`, and creates a new session again. This breaks both Start Smart RC and legacy full-section/practice-test links produced by `src/features/rc/lib/rcSections.ts:139` and `src/lib/practiceTestRunner.ts:96`.
Fix: before/while navigating to the player, replace the current URL with the same builder params minus `start`, or navigate to the player with `replace: true` for autostart launches.

2. **High — Invalid `?section=` does not mean LR when localStorage remembers RC**
`src/lib/drillSection.ts:49`
The spec says any value other than `rc` is LR. This implementation parses garbage as `null`, then falls through to remembered localStorage, so `/classroom/drill?section=sideways` opens RC for a browser that previously chose RC. The test at `src/lib/drillSection.test.ts:47` locks in the wrong behavior.
Fix: distinguish “param absent” from “param present but invalid”; only consult localStorage when the param is absent.

3. **High — Legacy/autostart links can start the wrong passages after query changes**
`src/features/rc/components/RcHubSurface.tsx:206`
When a query has no truthy `passages` param, the effect never clears `handPicked`. If the same mounted builder previously applied `?passages=...`, then a later `/rc?count=1&start=1` or Smart RC URL can start the stale manual selection instead of adaptive one-passage RC. The comment at `src/features/rc/components/RcHubSurface.tsx:178` says assignment links fall back to builder defaults, but filters/hand-pick state are not reset.
Fix: on every recognized query application, reset URL-controlled builder state first, including `handPicked`, `handPickOpen`, filters, count, timing, and reveal.

4. **Medium — RC Analytics link drops the active section**
`src/components/mainhub/RcPracticeStage.tsx:62`
From RC mode, the Analytics secondary link navigates to `/classroom/drill?stage=analytics&tab=overview` without `section=rc`. If the student arrived by deep link and localStorage is empty or says LR, the hub resolves the hero/switch back to LR while showing shared analytics. This violates the section-as-URL-state contract.
Fix: route this through `AcademyMainhub`’s `openAnalytics` callback or include `section=rc`.

5. **Medium — Error states lie as “empty history”**
`src/features/rc/components/RcSessionHistory.tsx:40`
`listSessions()` / `getSessionAttempts()` errors are swallowed, then `loaded` becomes true and the component renders “No reading drills yet.” A Supabase outage, missing table, or RLS error is reported as empty user data. `RcHubSurface` does the same suppression for progress loading at `src/features/rc/components/RcHubSurface.tsx:152`, which can make adaptive filters treat all passages as fresh.
Fix: track and render a real load error; only render empty state after a successful empty response.

6. **Medium — Embedded RC builder double-fetches session history it does not render**
`src/features/rc/components/RcHubSurface.tsx:133`
In the embedded builder path, `showHistory={false}` at `src/pages/AcademyMainhub.tsx:210`, but `RcHubSurface` still calls `listSessions()` and `getSessionAttempts()` for completed sessions. The RC practice bay also mounts `RcSessionHistory` at `src/components/mainhub/RcPracticeStage.tsx:78`, so opening the builder can duplicate session and attempt fetches on slow accounts for data the builder does not display.
Fix: when `showHistory` is false, fetch only `getQuestionHistory()` for adaptive status and skip session list/score loading.

**Legacy Link Audit**

`/rc/drill?...` producers still hit the player directly and look intact: `QuestionJump`, `questionFinderSearch`, `RcSearch`, `RcSessionHistory`, `RcHubSurface`, and `RcResults` review/resume links.

Bare `/rc?...` producers land through `RcRedirect`: `rcSectionHref()` and `rcLegHref()` preserve params, but their `start=1` links inherit the Back-button duplicate-session bug above. `/rc` return buttons in `RcPlayer`, `RcResults`, and `RcSearch` redirect to the RC hub default correctly.

**Test Gaps**

The tests do not cover invalid `section` with remembered RC, Back after autostart, failed/empty RC index autostart behavior, stale hand-pick state across query changes, Supabase history errors, duplicate fetches between `RcPracticeStage` and embedded `RcHubSurface`, or keyboard activation with real focus movement beyond arrow-key URL assertions. Vitest could not run in this read-only sandbox because Vite tried to write a temporary config file; `npm run typecheck` completed cleanly.

VERDICT: REVISE

### Claude's response — Round 1

Six findings, all real, none re-litigating a locked product decision. Acted on all six; one split.

1. **Back after autostart creates a duplicate session — FIXED.** The worst of the six and correctly ranked. `start()` now takes `{ replace }`, the autostart path passes it, and the launcher URL carrying `start=1` never stays on the history stack. Covers Smart RC and every legacy `/rc?...&start=1` link (`rcSectionHref`, `rcLegHref`, the practice-test RC leg) through the same path. Test: `RcHubSurface.test.tsx` asserts the navigate call carries `{ replace: true }`.
2. **Invalid `?section=` fell through to the remembered value — FIXED.** The code disagreed with the spec's own sentence, and my test locked the wrong behaviour in. `resolveDrillSection` now distinguishes *stated* from *absent*: a stated-but-unrecognised section is LR, an absent or empty one consults the memory. Both tests rewritten.
3. **Stale hand-pick survived a query change — FIXED.** The deep-link effect reset reveal, timing, and count but not the selection, so a `?passages=` link followed by an adaptive one started the previous link's passages. The `else` branch now clears `handPicked`/`handPickOpen` with them. Test: the fourth case in `RcHubSurface.test.tsx`.
4. **RC Analytics link dropped the section — FIXED.** `RcPracticeStage` now takes `onOpenAnalytics` and routes through the hub's handler, which writes `section` alongside `stage`. The hand-written link was the only place in the feature that built a hub URL without going through that handler.
5. **Errors rendered as "no drills yet" — FIXED in the new code, logged as pre-existing in the old.** `RcSessionHistory` now tracks a load error and says so, and a failed delete no longer looks like it worked. Two tests. The same swallow inside `RcHubSurface`'s progress load is **pre-existing behaviour moved verbatim from `RcHub`**, not a regression from this feature; fixing it changes adaptive-filter behaviour on a failed history load and belongs to its own change. Recorded, not fixed here.
6. **Embedded builder double-fetched history it does not render — FIXED.** With `showHistory={false}` the surface now skips `listSessions()` and the per-completed-drill attempts queries entirely, and loads only the question history the adaptive filters need.

Also fixed while in there: `onClick={start}` passed a MouseEvent into the new options parameter — both call sites now wrap it.

Not acted on: nothing. No finding was rejected in Round 1.


## Round 2 — Codex

**Findings**

1. **High — typecheck is not clean**
[src/features/rc/components/RcHubSurface.test.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/components/RcHubSurface.test.tsx:82)

`npm run typecheck` fails:

```text
src/features/rc/components/RcHubSurface.test.tsx(82,40): error TS2493: Tuple type '[]' of length '0' has no element at index '1'.
src/features/rc/components/RcHubSurface.test.tsx(88,40): error TS2493: Tuple type '[]' of length '0' has no element at index '1'.
src/features/rc/components/RcHubSurface.test.tsx(95,40): error TS2493: Tuple type '[]' of length '0' has no element at index '1'.
```

Why it breaks: the mock wrapper casts `args as []` at [RcHubSurface.test.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/components/RcHubSurface.test.tsx:13), so TypeScript infers `createSession.mock.calls[n]` as zero-length tuples. The assertions indexing `[1]` are therefore type errors. This directly contradicts “typecheck clean” and blocks the required push path.

One-line fix: type the mock with the real-ish signature, e.g. `const createSession = vi.fn(async (_config: RcDrillConfig, _passageIds: number[]) => ({ id: 'session-1' }));` and forward with `createSession(config, passageIds)` instead of `...(args as [])`.

**Non-Blocking Notes**

The six behavioral fixes are present in the implementation: autostart uses `replace: true`, invalid stated sections resolve to LR, no-passage queries clear hand-pick state, RC analytics goes through `openAnalytics`, `RcSessionHistory` has an error state, and embedded `RcHubSurface` skips session/attempt history fetches.

One test is still weaker than its name: [RcHubSurface.test.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/components/RcHubSurface.test.tsx:85) unmounts between the hand-picked link and adaptive link, so it does not prove stale state is cleared in one already-mounted surface. The code at [RcHubSurface.tsx](/Users/joshuaf/ai-os/projects/lsatu/src/features/rc/components/RcHubSurface.tsx:226) appears to fix the real case, but the test would not catch a regression there.

I could not run Vitest in this read-only sandbox because Vite attempts to write a temporary bundled config beside `vitest.config.ts`.

VERDICT: REVISE

### Claude's response — Round 2

Both findings valid; both fixed.

1. **Typecheck was NOT clean — my claim was wrong.** I ran `npm run typecheck` before writing `RcHubSurface.test.tsx`, then reported the earlier result. The `(...args: unknown[]) => fn(...(args as []))` wrapper made TypeScript infer `mock.calls[n]` as a zero-length tuple, so all three assertions reading the passage-ids argument were errors. The mock now carries the real signature and forwards named parameters. Verified clean after the change, this time in the right order.
2. **The stale-selection test was weaker than its name — rewritten.** It unmounted between the two links, which proves nothing, since a fresh surface starts empty regardless. It now drives a second query into the SAME mounted surface through `useSearchParams` (the file mocks the `useNavigate` export so the surface's own `replace` stays assertable, so the driver has to route around it), and neither link autostarts — after a real autostart the surface unmounts into the player, so the stale-state case only exists on a surface still on screen. The assertion is now: hand-pick shows two passages, the next link clears it, a manual Start sends one adaptive passage.

Codex could not run Vitest in the read-only sandbox (Vite writes a temp config beside `vitest.config.ts`). Claude ran it: 35 feature tests pass, and the full suite is re-run before sign-off.


## Round 3 — Codex

No material findings in the re-review.

The two Round 2 fixes hold up: `createSession` is now typed with the real `(RcDrillConfig, number[])` signature, so `mock.calls[0][1]` typechecks, and the stale hand-pick test now changes the query inside the same mounted route. The implementation also matches that behavior: no-passage query updates clear `handPicked`/`handPickOpen`, manual start wrappers no longer pass MouseEvents into `start()`, and autostart still navigates with `{ replace: true }`.

I re-ran `npm run typecheck`; it completed with exit code 0. I did not re-run Vitest in this read-only sandbox because earlier attempts are blocked by Vite trying to write a temporary config file next to `vitest.config.ts`.

VERDICT: APPROVED

### Outcome

**APPROVED after 3 rounds.** Eight findings raised, eight acted on, none rejected. Codex independently re-ran `npm run typecheck` (exit 0). Vitest could not run in its read-only sandbox — Vite writes a temp config beside `vitest.config.ts` — so the suite is Claude's to verify, and did.

What the argument actually improved:
- A duplicate RC session on every Back press after any autostart link, which would have hit Smart RC, the RC full section, and the practice test's RC leg alike.
- A deep link that opened the wrong section, and a second one that started the wrong passages, both from state that outlived the URL that set it.
- A truthful failure state where a Supabase error had been rendering as "No reading drills yet."


## Round 4 — Claude, solo (Codex out of quota)

Codex hit its usage limit, so this round is a self-review. Two things it never got to, one of them a real defect.

**1. Back was stuck after a toggle — FIXED, and neither the browser pass nor Codex caught it.**

A bare `/classroom/drill` states no section, so it resolves from what the browser remembers — and memory MOVES when the switch is thrown. Land in LR, switch to RC, press Back: the bare entry re-resolves against the now-RC memory and Back appears to do nothing. Every history entry has to state its own section for Back to be deterministic.

The hub now writes the resolved section into the URL on arrival, **replacing** the entry rather than pushing one, and only while the param is absent. Caught by writing the failing test first (`AcademyMainhub.section.test.tsx`, "Back after a toggle returns to the section you came from"), which went red on the old code and green on the new. 14 tests in that file now.

This is the class of bug a screenshot cannot show: the page looked right at every single URL I visited. It only appears in the *relationship* between two history entries.

**2. `src/features/rc/CONTEXT.md` updated.** The RC glossary's Routes table still called `/rc` the hub. It now names `/classroom/drill?section=rc` as the hub and `/rc` as the adapter, and the assignment-link section says the `/rc?…` contract survives the hop and that a `start=1` link replaces its own history entry. The routes changed, and that file is the thing that says what the routes are.

**Also swept:** every `/rc?…` producer in the repo — `rcSectionHref` (RC full section) and `rcLegHref` (the practice test's RC leg) are the only two, both covered by the adapter, both carrying `start=1` and therefore both fixed by the `replace` change. Nothing in `scripts/`, `supabase/`, or the docs builds one.

**Tree hazard, not a finding:** `src/lib/analyticsBreakdowns.ts` does not typecheck right now — the parallel analytics workstream is mid-refactor and has removed imports it still calls. Unrelated to this feature and not mine to fix, but `safe-push.sh` typechecks the working tree, so a push while it is broken would be gated on somebody else's half-finished edit. Merge-conflict markers also appeared and vanished in `RcPlayer.tsx` between two consecutive commands. **Do not push until that workstream settles.**

Gates after this round: my files typecheck clean (only `analyticsBreakdowns.ts` errors), 210 test files / 2,014 tests pass.

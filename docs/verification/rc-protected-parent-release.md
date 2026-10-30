# Full-exam RC children remain sealed

Reviewed 2026-10-18 on `codex/rc-t09-t10-acceptance`.

A completed RC leg inside a running full practice test previously passed the generic results/review reveal check solely because its configuration had a protected parent ID. Normal navigation returned to the full test, but a direct child URL could bypass that navigation. The full-test contract says release follows completion of the whole sitting.

Generic RC results and both review entry paths now read `practice_test_runs` directly for the signed-in owner and exact parent ID. Only status `complete` releases the child. Missing, mismatched, abandoned, unfinished or failed reads block content/attempt loading. No local recovery snapshot can substitute for this check. Generic history summaries omit full-test child scores without verified parent release; the full-test report remains the normal result destination. Completed standalone sections retain their explicit View section report behavior.

Independent source review identified a delayed-response cancellation edge case. Both player entry paths now stop immediately after the parent check if the route/account effect was cancelled. A mounted regression leaves a pending routed-state review, resolves the parent request afterward and verifies that the departed page is neither redirected nor loaded with answers.

Focused guard/history/results/player checks passed. Fresh typecheck caught and prompted repair of an array-filter callback that accidentally supplied its index as the new release argument; the filter now uses an explicit lambda and the helper accepts only literal `true` as release proof. Typecheck passed after that correction. Final integrated checks must cover the later cancellation regression too.

Commit `43c0f603` includes the cancellation regression and updated protected read-only fixture. Exact-head GitHub CI passed, including typecheck, all 808 tests across 80 files in the full RC/shared-runner test command and production build: run `39114826655`, duration 6m24s. A local parallel run passed 807 of 808 tests with one 30-second section-content timeout; that file passed all seven tests in isolation, with its exhaustive case taking 918 ms. CI subsequently passed without that timeout. Existing React Router future warnings and a pre-existing player effect-cleanup lint warning are not presented as new failures or as a warning-free run.

This is frontend route protection, not evidence of independently tested backend row secrecy. No schema, edge function or backend policy was deployed. No new full-exam sitting was created for this source/mounted-test verification. The completed authorized standalone test restored its report after a full browser reload.

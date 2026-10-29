# Student tier defaults verification

Date: 2026-10-01
Status: Release checks in progress.

## Confirmed behavior

| Control | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Drill | On | Off | Off |
| Practice tests | On | Off | Off |
| Classroom | On | On | Off |
| Messages | On | On | On |
| Schedule and booking | On | On | On |

Drill or Practice tests includes Wrong answers, Flagged questions and Progress/history. Those tools have no independent switches. Activities and Bootcamps are assignment-only with Classroom access; Tier 2 opens specific assigned drills and sections without general practice access. TA and Export controls are removed. Downloads remain part of accessible work.

## Evidence

- 54 focused tests across accessTiers, accessTierClient, AssignmentGate, DeskPeopleSurface, StudentDestination and ReviewQueuePage passed.
- Actual AccessTierControl browser fixture: all three presets; Drill-only and Practice-test-only derived review; both practice controls off disables derived review.
- Layout checks at 390, 600, 768 and 1440 pixels: five controls, no horizontal page overflow.
- Independent review caught and resolved blocked assigned review, concurrent toggle overwrites, Tier 3 assignment bypass and launch authorization cache scope.
- Database dry run temporarily installed the proposed function, tested presets, OR dependency, relabeling, retired flags and archive behavior against a temporary table, then raised TIER_POLICY_PROBE_PASSED_ROLLBACK to roll the whole statement back. No real student updates.
- Initial multi-statement BEGIN/ROLLBACK tool call was cancelled. Readback confirmed original function remained installed. Single DO dry run reached the expected success/rollback marker.

## Limits

No real student account was mutated for QA. Assigned-route ownership and launch scope were verified in routed component tests, not a production student runner session. Existing independent access is preserved; selecting a tier reapplies its defaults. Backend function source is prepared but is not separately deployed; verified frontend fallback and database normalization support the current endpoint.

## Release evidence

- Reviewed database policy applied directly through Lovable SQL in one DO statement with temporary-table assertions. Live readback confirms normalized review policy and Classroom default=false.
- No real student profile UPDATE was issued by migration or QA.
- Backend reset source also prepared for the new floor, but the older deployed reset endpoint can still explicitly grant Classroom to a no-tier account. That separate endpoint was not deployed; the new tier buttons work via database normalization and verified fallback.
- Final typecheck and targeted ESLint passed (six non-blocking warnings).
- Production build and Git/manual publication pending at this checkpoint.

- Final production build/postbuild passed after the source freeze. 7,137 modules transformed; canonical guide content check passed across 769 dist files.
- Actual app controls verified in browser; assignment behavior verified in eight routed ownership/scope tests. No production learner runner mutation performed.

## Final navigation correction

- Final inspection found and fixed assigned Activity cards still filtered by the retired category flag.
- Assigned-catalog links now use Classroom access; work/notes shell overlays are unavailable when Classroom is off or loading.
- 15 additional Home/Library regression tests passed. Total focused verification: 69 tests.
- Independent targeted re-review found no remaining high-confidence issues.
- Final three-file targeted lint passed with four non-blocking existing warnings.

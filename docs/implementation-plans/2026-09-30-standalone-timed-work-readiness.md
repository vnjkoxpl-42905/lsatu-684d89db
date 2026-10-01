# Standalone timed LR/RC: additive implementation boundary

Date: 2026-09-30
Status: The standalone control/writer and manual-canonical interface are deployed and published in `a7d416a`. The preserving all236 catalog upgrade is installed and selected; expanded frontend roster publication remains pending. #166/#167 remain open.

## Current standalone catalog checkpoint

The separate section configuration selects manifest `714b27008d5c301c660d830d59562cc69814d06baae9d1e767240bece48b0c95`, enabled with 30,000ms lease. It includes 236 sections: 156 LR and 80 RC. The former 177 definitions remain exact, every prior installed definition was copied, and existing frozen sittings/receipts/bindings were retained. Full PrepTest configuration remains `c27b478f2d50f8353a98d4a1a905d2f94f87929ba2ea2179230d4f7a3d51c25c`, enabled/lease unchanged. See [upgrade readiness](artifacts/2026-09-30-standalone-catalog-upgrade-readiness.md) and [activation evidence](../agent/verification/2026-09-30-standalone-catalog-activation-live.json).

Actual owned LR/RC browser walks on the original 177 roster proved deliberate Prepare/Start, failed-save pause, exact retained-command retry, paused reload and atomic completion. Their fresh production completed reports and protected RC read-only review passed after publication. New LR 118 S3 browser acceptance confirms 24 valid frozen questions, dense position 22 mapping to original Q23, saved one-answer completion and paused reload. New RC 101 S4 and expanded roster publication are being checked separately.

Assigned/custom pools remain on their separate existing paths. Protected completed RC reviews cannot modify source answers, flags or analytics inclusion. Physical second-device, committed-but-lost network response, revoked in-flight UI writes and wider source acceptance remain open. No Lovable credits spent.

## Original disabled installation checkpoint

Root deployed the exact combined preserving transaction through managed Lovable Cloud SQL on 2026-09-30. Submitted SHA256: `2a4860476a8debbfc948e00585e9c9431725db6b93dc1f218f37520a462930d9`. Its fourteen original-table count and value digests were retained. The existing enabled PT configuration, 30,000ms lease and selected manifest stayed unchanged. Section capability reports `enabled: false`, `stage: writer-installed`; there are no section sittings. This deployment does not switch an existing LR/RC runner or claim standalone adoption.

The exact combined transaction passed 43 checks in each of two isolated installer modes: a real non-superuser migration login and a caller entering the same effective migration role through SET ROLE. Fourteen nonempty source/control tables included legacy null values, repeated logical attempts, historical completed/null timestamp rows and a running protected PT with receipts and binding. Original columns and row multiplicity, eighteen existing public function definitions/owners and twenty-eight original policies remained unchanged. Only the allowed private identity-helper EXECUTE grant appeared as a new old-function ACL entry in these fixtures. A copied RESET ROLE was caught by the alternate installer test, removed from the deterministic helper generator, and the final wrapper then preserved the initial effective role and membership states in both modes.

The preservation table scope is `practice_test_runs`, `attempts`, `bootcamp_kv`, `section_history`, `rc_drill_sessions`, `rc_attempts`, `wrong_answer_journal`, `profiles`, `user_roles`, `practice_test_assignments`, `timed_pt_configuration_v1`, `timed_content_manifests_v1`, `timed_pt_receipts_v1` and `timed_pt_lr_bindings_v1`. The wrapper's identifier validator now accepts safe versioned table names and still rejects qualified, quoted and injected names.

An actual ordinary-JWT read-only probe passed sixteen checks at `2026-10-01T00:49:55.620Z` (2026-09-30 in Toronto). Distinct student/admin accounts acknowledged disabled capability and the declared manual-canonical source, saw empty owned sittings/receipts/bindings, and received PT401 for an unavailable UUID. Anonymous capability invocation was denied. Student/admin configuration SELECT and anonymous sitting SELECT returned zero rows rather than SQL privilege errors; this is recorded as no rows exposed, not an ACL-denial claim. No existing foreign sitting fixture exists, so those empty reads do not prove cross-owner mutation protection. The probe calls no mutating RPC, enables no configuration, writes no backend record and performs no global sign-out.

Run [standalone-timed-disabled-live.mjs](../../scripts/verification/standalone-timed-disabled-live.mjs) with the central environment path to repeat those limited live checks. Actual source creation, timers, takeover, save/reload/retry, restricted-content behavior and closeout remain future enabled-contract acceptance. The UI transport can be prepared while capability stays disabled.

## Full writer checkpoint supersedes the foundation-only limitation

[The writer artifact](artifacts/2026-09-30-standalone-timed-writer.sql) now implements separate create/read/commit/capability RPCs, actual admin/manual-drill grant locks, immutable catalog selection, acknowledged lease accounting, exact revision/epoch matching, explicit claim, durable exact-command replay and atomic LR/RC closeout. It creates real parentless LR KV or RC session children. LR completion writes owned attempts, section history and mandatory wrong-answer journal rows in the same transaction. RC completion retains stable first-attempt UUIDs and adds explicit unanswered rows in that transaction. No PrepTest parent is fabricated.

Both OLD and NEW source attribution are guarded, including clearing normalized FKs, moving record/namespace/session identity and forging reserved KV/config markers. Existing PT guards remain intact; the contracts receive only reciprocal read-only binding metadata access needed by their invoker guards. Isolated tests prove the PT writer still starts and each executor is denied the other contract's protected child writes. LR bindings now have a deferred composite FK to the exact owned KV child, and RC bindings reference the exact owned session.

Verified on 2026-09-30:

- 31 PGlite control-foundation assertions.
- 108 PGlite writer assertions, including future revision/epoch rejection for every mutation, RC decreasing-time denial, rollback on mandatory journal failure, unique retakes, reserved identity rejection, retained legacy KV/RC values and unchanged pre-existing policy expressions.
- 29 real PostgreSQL checks with separate ordinary login connections: identical create/close races, competing revisions, claim conflict, save-versus-revoke in both lock orderings, consistent read behind checkpoint, foreign denial and exact receipt replay against later authoritative state.
- 11 managed-role installation checks using a non-superuser CREATEROLE installer and independently owned auth schema. Temporary ownership-transfer SET membership is restored only after function ACLs are finalized. Executors retain no auth schema usage, public schema CREATE or ordinary-login membership.

Those suites are local synthetic fixtures, not production timed UI evidence. The real PostgreSQL runs explicitly verified the named isolated cluster and retained their databases; no source records or test databases were deleted. The preserving managed installation and limited disabled-contract JWT checks are recorded above. Perform enabled ordinary-account and UI acceptance before activation/publication claims.

**Historical first-writer coverage was exactly 177 sections: 118 LR and 59 RC. Current standalone coverage is 236 after the preserving upgrade above.** The fourth canonical bank section omitted from each official PT manifest is not substituted or silently accepted. A source absent from the selected catalog fails with PT422. Expanding to all standalone bank sections needs a reviewed additive section manifest. Homework, classroom, bootcamp, custom timed pools and legacy adoption remain separate unsupported paths for this contract.

Public transport: envelope `workKind: standalone-section`, UUID `workId`/`commandId`, `deviceId`, `expectedRevision`, `writerEpoch`, operation and payload. Create payload is `{kind, pt, section, pace}` with revision/epoch zero. `read_timed_section_v1` accepts `p_work_id`; create/commit accept `p_command`. Every response contains contract/kind, `serverTime`, authoritative `sitting`, native `child`, optional owner-bound `receipt` and `replayed`. Child is null before start; LR returns its PracticeSession record; RC returns session plus attempts. Checkpoint/close payloads retain the reviewed PT child shapes without weakening its PT parser. Error codes remain PT401/PT409/PT410/PT412/PT422/PT503.

## Executable foundation checkpoint

[The additive SQL artifact](artifacts/2026-09-30-standalone-timed-control-foundation.sql) creates a separate no-login/no-BYPASSRLS executor, disabled configuration, canonical frozen sitting identity, unique active source, append-only owner-bound receipts and source bindings. It references the already deployed catalog instead of copying the manifest or altering PT parents. Guards reject changed immutable identity, nonconsecutive revisions, decreasing elapsed time, device changes without epoch advancement, terminal rewrites, malformed clock/completion state and cross-kind bindings. Public capability always reports disabled and `foundation-only`; no public mutating RPC exists.

[The isolated verifier](../../scripts/verification/standalone-timed-foundation.mjs) passed **31 assertions** on 2026-09-30 using in-memory PGlite with synthetic LR/RC catalog rows. Checks cover disabled capability, role privileges, preserved legacy profile values, owner/foreign reads, denied raw ordinary writes, exact canonical queue identity, active-source uniqueness and distinct retakes, immutable identity/terminal state, monotonic revisions/time/epochs, bindings and duplicate/foreign receipts. Its superuser session uses `SET ROLE` to simulate row policies; catalog membership is tested separately. This is not an ordinary JWT or PostgreSQL connection-race test.

That initial control-only checkpoint was not ready for standalone adoption or activation. Its missing writer, authorization, linked closeout and source-guard boundaries are now implemented in the separate writer artifact described above. Deployment, wider source coverage and actual UI acceptance remain outstanding. The foundation alone still exposes no mutating RPC.

Verification command:

```powershell
node scripts/verification/standalone-timed-foundation.mjs --pglite-module C:/Users/Joshu/AppData/Local/Temp/lsatu-db-validation/node_modules/@electric-sql/pglite/dist/index.js
```

## Ship canonical manual sections first

The smallest coherent expansion is a new account-owned sitting for one canonical LR or RC section selected from the already reviewed content manifest. It must preserve distinct retakes, enforce an acknowledged clock and reject stale or revoked writers on the server. Homework, classroom, bootcamp and custom timed pools require their own exact source contracts before entering this rollout. They remain explicitly identified legacy paths until that work passes; this partial expansion cannot close #167.

Do not manufacture a one-leg PrepTest. The current deployed RPC accepts `workKind: practice-test`, creates a real `practice_test_runs` parent and freezes the full official leg definition. Altering its payload to represent a standalone section would misclassify Attempts, completion and score evidence.

Current standalone LR already pauses on failed resume saves, but `drillResumeSession.ts` performs a raw `bootcamp_kv` UPSERT. Its write queue coordinates one JavaScript process, and `assertActiveTestLeg` only checks keys beginning `drill::practice-test::`. Manual section resume uses `drill::section::ptX-sY`, whose deterministic record identity is reused by retakes. RC already owns a UUID, but `RcPlayer.tsx` calls separate legacy session-clock, attempt and completion writes through `features/rc/api/rcProgress.ts`. Neither path acquires the deployed transactional PT authority.

## Proposed additive server contract

The named control and RPC boundaries below are now installed with configuration disabled. Wider source authorization and frontend adoption remain outstanding.

| Boundary | Required contract |
|---|---|
| `timed_section_configuration_v1` | Separate disabled-by-default rollout configuration, reviewed manifest hash and lease. Do not change enabled PT configuration. |
| `timed_section_sittings_v1` | UUID sitting ID; immutable owner, LR/RC kind, source kind/key, PT/section, ordered frozen queue, content hash, pace/budget and creation timestamp; mutable revision, epoch, device, phase and acknowledged elapsed/position under executor-only commands. |
| Active identity | Unique active `(owner, source_kind, source_key)` for supported canonical manual sections. Completed/abandoned sittings release the active slot and retain immutable history. Concurrent create returns the existing sitting or a defined conflict, never silently overwrites it. |
| Receipts | Dedicated append-only section receipts keyed by owner/sitting/command UUID, storing canonical envelope and committed revision. Exact replay returns its receipt plus current authority; changed-payload replay fails. Do not broaden the PT receipt constraint in place. |
| Source bindings | Immutable LR KV record identity and RC session UUID bound to the section sitting. LR uses a new per-sitting namespace, not the deterministic legacy key. Guard both OLD and NEW identities against rebinding or clearing protection. |
| Public RPCs | `timed_section_capability_v1`, `create_timed_section_v1`, `read_timed_section_v1`, `commit_timed_section_v1`. Commands: create, claim, start, checkpoint, heartbeat, pause, resume, close, abandon. No break/full-test advancement or scaled PT score. |
| Access | Authenticate the actor as the sitting owner; lock current applicable grants and validate exact frozen source before every command. Manual feature access must not be granted by an unrelated assignment. Completed result visibility and restricted question visibility are separate decisions. |
| Closeout | One transaction saves final answers, mandatory LR attempt/history/journal rows or RC session/attempt rows, analysis and terminal section state. A failure advances nothing; a retry creates no duplicate answers, history or completion timestamp. |

Use a dedicated no-login/no-BYPASSRLS executor or a separately reviewed narrow extension of the existing executor. Ordinary authenticated writes must not reach protected controls or receipts. Adding another restrictive-looking permissive RLS policy does not override existing broad owner policies. Preserve existing PT guards and add section-aware enforcement without allowing identity-null or source-namespace escape. Scope any internal delegation to the reviewed function identity rather than a public user-settable flag.

Freeze canonical content at creation using the selected manifest's exact section definition, including removed LR positions handled by the real normalizer and ordered RC passage/question IDs. Continue disclosing the existing client-derived correctness/analysis trust boundary; transactional save protection is not a new secure grading service.

## Reuse these boundaries without calling PT RPCs for standalone work

The deployed PT contract consists of `timed_practice_test_capability_v1`, `create_timed_practice_test_v1`, `read_timed_practice_test_v1` and `commit_timed_work_v1`. Supporting SQL includes `timed_pt_actor_v1`, `timed_pt_require_access_v1`, key validation, checkpoint/close-leg helpers, child guards, manifests, receipts and bindings. These functions consume `practice_test_runs`; their public behavior must remain unchanged. Reuse their algorithms and isolated race harness, not their PT parent as a section container. Check current live definitions before writing incremental SQL; do not replay the fresh-install writer artifact.

`timedWorkClient.ts` currently validates a PT-only command and response shape. Extract shared durable-envelope, storage, receipt, error and Web Locks mechanics behind a generic internal transport while leaving its exported PT parser strict. Add a section-specific parser/adapter; do not weaken PT response validation to accept arbitrary objects. Reuse pure normalized-content parity and question panes from `timedLrAdapter.ts`, `timedRcAdapter.ts`, `timedChildController.ts` and `TimedOfficialChildRunner`, but remove assumptions about parent legs, break state and full-test navigation. Server lease accounting, bounded clock display, pending-command retention and account-switch generation guards apply unchanged.

## Files and build order

1. Add an incremental SQL proposal under `docs/implementation-plans/artifacts/`, dedicated section transaction verification under `scripts/verification/`, and fixtures covering both kinds. Read current schemas/policies first, including attempts ownership guard and RC session/attempt triggers.
2. Add section-specific transport/store and source selector under `src/lib/`. Extend manifest access without generating another divergent question catalog. Keep generated Supabase types untouched until actual deployed-schema regeneration.
3. Add a dedicated section runner route/page using official panes. Wire canonical manual launch from `src/pages/SectionDirections.tsx`, LR Practice launch and the RC canonical section launch only after capability confirmation. Inventory exact existing launch routes before editing them. Leave custom/assigned/bootcamp dispatch explicit and unchanged in this first batch.
4. Integrate owned section Attempts/Continue/Results/Review and first-answer history through `practiceSectionAttempts.ts`, `sectionHistory.ts`, the RC history adapters and shared student-scoped evidence. Distinguish these sittings from full PT rows; every action targets the same UUID. Teacher reads use the selected student; teacher practice creates the teacher's own sitting.
5. Retain existing saved LR/RC rows and ownerless browser copies. Present legacy reporting/resume policy clearly; no automatic adoption, historical rewriting or assignment completion backfill. New retakes require deliberate creation and preserve earlier terminal records.

## Safe deployment and acceptance gates

Before deployment, freeze counts and full sorted-row digests for all affected existing source tables, policy/function definitions and PT configuration. Install additive disabled schema/functions with bounded locks and a transaction that aborts if unrelated rows/policies change. Seed or reference the already reviewed catalog without replacing it. Confirm preservation after installation and before enabling only canonical manual sources. There is no destructive rollback; disable future section creation and forward-fix a defect while keeping existing results and pending receipts readable. Existing protected writers must have a documented recovery path while creation is disabled.

Isolated PostgreSQL verification must include same-revision writes, concurrent create, save/takeover, save/revoke with real grant locks, lease expiry, terminal immutability, receipt replay after later revisions, changed-payload replay, transactional closeout failure, and every raw writer's OLD/NEW identity bypass. Verify ordinary HTTP JWT owner and foreign read/INSERT/UPDATE requests separately from simulated SQL-role tests. Retain all genuine QA records; never delete a probe fixture to make preservation appear clean.

Browser gates for both LR and RC: failed hydration hides restricted questions; actual blocked answer/position/heartbeat save pauses clock/navigation; reload retains the exact pending envelope; retry acknowledges exactly once; a separately authenticated second context explicitly takes over and rejects the former writer; access revocation blocks subsequent writes while preserving results. A client-discarded response is not TCP lost-response proof. Exercise mandatory browser closeout and retake/History/Review links. Confirm phone, sidecar, laptop, wide and keyboard task walks before release.

Report four states independently: implementation prepared, backend installed/enabled, frontend published, live acceptance verified. No state in this proposal substitutes for another. Existing full-PT physical-device, real lost-response, revoked in-flight and mandatory browser-closeout checks also remain open. Genuine Activity AI grading remains a separate possible-credit action requiring immediate confirmation. Deployment route authorization does not authorize that credit spend.

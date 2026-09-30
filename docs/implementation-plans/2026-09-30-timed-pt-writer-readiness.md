# The PrepTest writer is implemented as an inactive backend draft

Date: 2026-09-30

**Code prepared: yes, as review artifacts and staged adapters. Backend deployed: no. Existing frontend switched: no. Live timed acceptance: no.** Ticket #167 remains open. This follows [the timed implementation design](2026-09-30-timed-write-implementation.md) and [contract](2026-09-30-timed-write-contract.md).

## The transaction includes official child work

Apply order for an approved future deployment is the [control foundation](artifacts/2026-09-30-timed-pt-control-foundation.sql), [writer and child enforcement](artifacts/2026-09-30-timed-pt-writer.sql), then the [generated manifest seed](artifacts/timed-content-manifest-v1.generated.sql). These live outside automatic migrations and remain unapplied. The writer creates a singleton configuration with `enabled=false`, no selected manifest, and no lease constant. Installing the files alone would not enable creation or commands.

New creation freezes the server-selected manifest blueprint, source fingerprint, chosen section timing, and lease configuration. The manifest generator uses current application blueprint rules and checked-in LR/RC content. Its current catalog contains 59 PrepTests, 177 legs, and 222 source files. Ordinary callers cannot write the catalog or configuration, choose an arbitrary manifest, supply another owner, or patch frozen definitions.

The typed commit RPC locks the owned parent, checks prior command receipts, then validates version, revision, epoch, device, lease, phase, and current entitlement. Actual admin-role, profile-feature, or exact unlocked/nonarchived assignment rows are locked against concurrent update/delete. Server time settles only through the acknowledged lease expiry. Claim preserves saved answers and settles the clock before pausing and changing writer epoch. Checkpoint and heartbeat renew only an unexpired current writer. Break uses the same clock and heartbeat contract; early finish remains permitted.

LR checkpoints merge validated answers into the bound official `bootcamp_kv` record. Omitted answers cannot erase prior choices. The frozen queue, account attribution, current position, elapsed time, and optional immutable regulation-answer mark survive recovery. LR closeout writes answered attempts, every required wrong/unanswered WAJ item, section history, child completion, parent result, and advancement in one transaction. An error rolls back all those writes. WAJ uses a directly qualified `public.wrong_answer_journal` upsert with existing append/revisit semantics; it does not depend on the mutable legacy helper or an absent `get_user_class_id` function. Class identity resolves from the locked exact actor profile.

RC checkpoints atomically save question position, clock, and immutable first-attempt identities. Frozen question-to-passage membership, owner/session attribution, selected choices, types, and attempt replay content are validated. A different first-attempt identity cannot replace a saved answer. Closeout inserts null unanswered first-attempt rows and commits the completed session and parent advancement together. RC elapsed time remains session clock time, not the sum of question times.

Parent totals derive from acknowledged child results. The final score reproduces the existing `estimateScaledScore` piecewise anchors and sets `score_source='estimate'`. Correctness and LR answer keys/analysis retain their existing client-derived trust boundary; this is not a server-verified grading change. LR overtime remains possible. Report email remains outside mandatory closeout. Rich runner telemetry and optional analysis must be supplied by the final adapters where applicable; these drafts do not switch the existing report/review flows.

## Receipts and reads support honest recovery

RPCs:

- `timed_practice_test_capability_v1()` returns `{contractVersion:1,workKind:'practice-test',enabled,operations}`.
- `create_timed_practice_test_v1(p_command jsonb)` accepts operation `create`.
- `commit_timed_work_v1(p_command jsonb)` accepts `claim`, `start-leg`, `checkpoint`, `heartbeat`, `pause`, `resume`, `close-leg`, `start-break`, `finish-break`, and `abandon`.
- `read_timed_practice_test_v1(p_work_id text)` returns an owner-only protected parent, current checkpoint, and server time under a parent share lock. It permits history reads when activation or entitlement is off.

Command envelope: `{workKind,workId,commandId,deviceId,expectedRevision,writerEpoch,operation,payload}`. Creation uses revision/epoch zero and payload `{pt,pace,sectionSeconds}`. Control operations take `{}`. The transport's typed LR and RC checkpoint/closeout payloads match the SQL's strict allowlists.

Success returns `{receipt,parent,checkpoint,serverTime,replayed}`. Receipt binds actor, work, UUID, operation, full canonical command, committed revision, and result. An identical retry acknowledges the original operation before current access/revision/lease rejection, while returning the latest parent and checkpoint. Changed payload rejects with `PT412`, distinct from a new-command `PT409` conflict. A replay never reapplies progress or restores an old parent. Revision/epoch/device/lease conflicts include current owner parent data in JSON error DETAIL.

Checkpoint after closeout belongs to the current next leg or is null, not the closed leg. Recovery must retain pending UUID/envelope and must not manufacture missing children. Unknown legacy adoption rejects explicitly. No active historical row is automatically adopted or rewritten.

## Enforcement and deployment identity are explicit

Protected parent and attributed LR KV, LR attempts, section history, RC sessions, and RC attempts reject ordinary direct mutations. Guards inspect both OLD and NEW protection, bindings, reserved `pool_slug` and `completion_id` source keys, and RC config/column attribution. Clearing source fields or moving protected records does not bypass enforcement. Unversioned legacy records retain their existing paths. Terminal protected parents cannot reopen; protected source/child deletion rejects.

RPCs use a dedicated no-login, non-superuser, non-bypass-RLS executor and fixed qualified search paths. Ordinary authenticated/anonymous roles have no membership. No caller-settable flag authorizes writes. Helpers are not public progress writers. PostgreSQL 16+ ownership transfer bootstraps only the current migration role's temporary SET membership and restores existing direct membership options afterwards. Grant-row share locks have required UPDATE privileges plus a lock-only RLS UPDATE policy whose WITH CHECK is false.

The [fresh auth ACL evidence](../agent/verification/2026-09-30-timed-live-auth-grants.json) confirms managed postgres has auth schema USAGE without grant option. The foundation therefore does not try to grant auth schema access to the executor. A migration-owned, narrowly granted `public.timed_pt_actor_v1()` SECURITY DEFINER helper delegates to fully qualified `auth.uid()` under a fixed search path. It takes no actor argument and performs no writes. Only the executor can call it; public writer/read functions derive identity through that helper. Existing authenticated owner read policies retain their direct `auth.uid()` expression.

Fresh read-only evidence is recorded in [the live catalog](../agent/verification/2026-09-30-timed-live-catalog.json), [deployment role](../agent/verification/2026-09-30-timed-live-deployment-role.json), and [ownership catalog](../agent/verification/2026-09-30-timed-live-ownership.json). It confirms PostgreSQL 17.6, involved postgres-owned tables, relevant types/owner FKs, existing touch/profile triggers, and absent timed columns. The deployed class helper is absent; the draft does not require it. The managed query role is nonsuperuser with CREATEROLE and BYPASSRLS. Local equivalent-role validation is separate from an actual managed deployment.

## Validation is local and production remains untouched

- [Isolated writer harness](../../scripts/verification/timed-pt-writer-sql.mjs), using [shared synthetic fixtures](../../scripts/verification/timed-pt-writer-fixtures.mjs), executes the SQL in external PGlite. It covers the executor's missing auth schema access and narrow identity delegation, malformed/null/duplicate payloads, receipt/current-state replay, raw bypasses, wrong owner, LR/RC closeout, WAJ failure rollback, lease-capped claim, terminal behavior, score anchors/variable totals, temporary-table shadowing, omission-safe LR metadata, acknowledged regulation marks, mutable RC flags/eliminations, and all 59 generated blueprints.
- [Independent PostgreSQL race harness](../../scripts/verification/timed-pt-concurrency.mjs) exercises separate connection contention: same-revision commands, creation/replay, takeover versus stale saves, profile/admin/assignment revocation locks, projection rollback, RC closeout, break heartbeats, expired leases, and current receipt recovery.
- [Managed-role probe](../../scripts/verification/timed-pt-managed-role.mjs) applies both artifacts as a local nonsuperuser CREATEROLE/BYPASSRLS deployment role, verifies function ownership and restored SET permissions, denies ordinary executor switching, and exercises authenticated creation/start.

All fixtures are synthetic and local. No application dependency was added. These checks do not establish live rollout, deployed JWT behavior, production data adoption, complete adapter switching, existing UI review/report compatibility, or production load characteristics.

Before deployment, refresh the live catalog, complete adapter/recovery and browser acceptance, review the generated content fingerprint, approve server configuration, and explicitly decide any supported legacy adoption and review-write contract. Confirm the managed Lovable Cloud deployment route and any immediate credit-spend approval. Enable only after all official parent/child writers for the selected rollout use the typed transaction. Standalone LR/RC and legacy adoption remain later phases.

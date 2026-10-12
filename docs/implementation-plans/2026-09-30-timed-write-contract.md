# Timed work must commit through one account transaction

Date: 2026-09-30

Status: **Proposed implementation contract. Not implemented or deployed.** This is the backend follow-up for competitor-audit ticket #167. It does not close #167 or claim full second-device, outage, or revoked-access acceptance. The frontend recovery fixes can ship independently.

## Why the existing saves leave a race

The parent PrepTest save already compares revision, active device, and in-progress status in one conditional UPDATE. Its LR and RC children check the parent separately before writing their own rows. A second browser can take over after that check and before the child write. Browser-local write queues do not serialize two devices. Ownership RLS prevents writing another student's work; it does not prevent an old browser from writing the same student's work.

Evidence in this first table is from repository source. **SQL files describe intended schema, not verified live DDL.** The next section separately records a live metadata inspection on 2026-09-30. Neither metadata inspection nor a successful ordinary save proves a two-device race test passed. Record an independent authenticated CAS test before rollout.

| Source | Existing behavior and limitation |
| --- | --- |
| `src/lib/practiceTestStore.ts:271`, `:302`, `:244` | `saveAccountPracticeTestRun` conditionally writes parent revision/device/status; `continueAccountPracticeTestHere` claims the device with parent CAS. `isActivePracticeTestDevice` is a separate read used by child writers. |
| `src/lib/drillResumeSession.ts:56`, `:76` | `assertActiveTestLeg` checks the parent device; `syncSectionToAccount` separately upserts the LR frozen snapshot into `bootcamp_kv`. Official section writes have local serialization and recovery copies. |
| `src/features/rc/api/rcProgress.ts:93`, `:154`, `:228`, `:184` | `assertActivePracticeTestSession`, `writeSessionClock`, `recordAttempt`, and `completeSession` use separate parent reads and child writes. RC clock serialization is per browser. |
| `src/pages/PracticeTestRun.tsx:380`, `:388` | The parent stores break start time; failed-save recovery freezes remaining time locally. The break heartbeat currently runs at 15 seconds. |
| `src/components/AssignmentGate.tsx:32`, `:299` | Route admission accepts a feature flag or item authorization, with cached assignment reads. It is not a server write contract and cannot provide immediate revocation enforcement. |
| `supabase/migrations/20260829120000_practice_test_runs.sql:135`, `:237`, `:245`, `:249`, `:281` | Parent owner UPDATE, RC owner FK, one LR result/RC session per leg, and RC first-attempt uniqueness. Owner UPDATE does not enforce terminal transitions, device ownership, or current access. |
| `supabase/migrations/20260927010000_practice_test_account_sync.sql:3` | Adds `section_seconds` and `active_device_id`. Does not add a clock lease or transactional child writes. |
| `supabase/migrations/20260923010300_practice_test_assignments.sql:41`, `:63` | Defines `can_sit_practice_test` and applies it to parent INSERT. Existing owner UPDATE remains broader. |
| `supabase/migrations/20260603142340_2aa5f9d2-63ec-4736-af91-7a426457f9de.sql:31` | KV owner UPDATE permits account-owned JSON snapshots without active-leg or lease checks. |
| `supabase/migrations/20260806000000_rc_drilling.sql:35` | RC owner policies scope work to the owner. They do not implement clock/device/access state transitions. |

Reuse these tables and constraints. The existing `abandon_stale_practice_tests` RPC is cleanup, not an atomic checkpoint API. No relevant timed checkpoint RPC was found in these files.

## Live metadata confirms the child-write gap

On **2026-09-30**, read-only Lovable `query_database` SELECTs inspected PostgreSQL catalogs for project `53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76`. Database status was enabled with Supabase stack. The queries read schema metadata only: no student rows, seeds, credentials, DDL, or mutations. They covered `pg_policies`, `information_schema.columns`, `pg_constraint`, `pg_indexes`, non-internal `pg_trigger`, relevant `pg_proc`, RLS flags, and ordinary-role table grants.

Confirmed installed:

- `practice_test_runs` has `revision integer NOT NULL DEFAULT 0`, nullable `active_device_id text`, nullable positive `section_seconds integer`, break fields, and existing parent status constraints. No lease/epoch/clock-state/contract-version columns were present.
- `bootcamp_kv` has exactly owner, namespace, record ID, JSON data, and updated timestamp columns. There is no separate writer revision/lease field.
- RC sessions have parent run/leg attribution and nullable completion time. RC attempts have UUID primary key, session/owner/question identity and first-attempt flag. Neither table has a writer revision/epoch/lease column.
- Composite ownership FKs `rc_sessions_pt_run_fk`, `rc_attempts_session_owner_fk`, and `section_history_pt_run_fk` are installed. RC and section-history attributed-leg pair checks are installed.
- Unique partial indexes `rc_sessions_pt_leg_once`, `section_history_pt_leg_once`, and `rc_attempts_first_once` are installed. These prevent duplicate leg rows/first-attempt rows, not stale writer acceptance.
- RLS is enabled on all four timed-progress tables. It is not FORCE RLS. Authenticated has INSERT/UPDATE/DELETE/SELECT table privileges; policies determine which ordinary API operations succeed. Anonymous also has table grants, but owner checks still depend on `auth.uid()`; grants alone do not prove anonymous access.
- The only non-internal triggers on the four progress tables and `section_history` are `bootcamp_kv_touch` and `practice_test_runs_touch`, both updated-timestamp triggers. No active-writer/access/terminal-state trigger was installed on these tables.
- `can_sit_practice_test(_user uuid, _pt integer)` is installed as STABLE SECURITY DEFINER, checking admin, `profiles.has_practice_access`, or an owned nonarchived/unlocked exact PT assignment. `can_access_drill` was absent. The relevant function-name and function-body reference scan returned `can_sit_practice_test` and `abandon_stale_practice_tests`, plus timestamp triggers in the name scan; no checkpoint API appeared in that scoped inventory.

The following policy text is the narrow raw evidence returned by `pg_policies`. SQL formatting is preserved; `NULL` means that catalog field was null. Read policies are summarized afterward because they are not the mutation blocker.

| Table / policy / command / roles | `qual` | `with_check` |
| --- | --- | --- |
| `practice_test_runs` / `pt_runs_owner_insert` / INSERT / `{public}` | NULL | `((user_id = auth.uid()) AND can_sit_practice_test(auth.uid(), pt))` |
| `practice_test_runs` / `pt_runs_owner_update` / UPDATE / `{public}` | `(user_id = auth.uid())` | `(user_id = auth.uid())` |
| `bootcamp_kv` / `Users insert own bootcamp data` / INSERT / `{authenticated}` | NULL | `(auth.uid() = user_id)` |
| `bootcamp_kv` / `Users update own bootcamp data` / UPDATE / `{authenticated}` | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `bootcamp_kv` / `Admins delete bootcamp data` / DELETE / `{authenticated}` | `has_role(auth.uid(), 'admin'::app_role)` | NULL |
| `rc_drill_sessions` / `own sessions` / ALL / `{public}` | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| `rc_attempts` / `own attempts` / ALL / `{public}` | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

Own SELECT policies are installed for parent/KV. Admin SELECT policies named `admins_read_practice_test_runs`, `admins_read_bootcamp_kv`, `admins_read_rc_drill_sessions`, and `admins_read_rc_attempts` use `has_role(auth.uid(), 'admin'::app_role)`. RC owner ALL policies include SELECT. No parent DELETE policy was returned.

**Confirmed blocker:** live owner UPDATE/RC ALL policies contain no current-access, active-device, active-leg, revision, or terminal-state predicates. No relevant enforcement trigger supplies them. Existing ownership FKs and uniqueness constraints are stronger than a client-only ownership convention but do not close the parent-check/child-write race. Parent CAS remains implemented by the caller's conditional UPDATE, not required by a database policy. This establishes the live schema gap; it does not claim successful denial/race/revocation mutation tests.

## One versioned command owns parent and child writes

Implement `commit_timed_work_v1` as a database transaction. For a PrepTest, lock its existing `practice_test_runs` parent row. For standalone timed LR/RC, lock a small normalized `timed_work_controls` row keyed to the immutable owned LR snapshot or RC session identity. This companion row prevents generic KV JSON from becoming the source of device ownership or source authorization.

The command accepts a work identity, expected revision, writer epoch/token, command UUID, operation, and a typed operation payload. It does not accept an arbitrary student owner. Derive the actor from `auth.uid()`.

Allowed operations: claim, start, checkpoint, pause, resume, complete, abandon; PrepTests additionally start/finish break and complete/advance leg. Validate each operation separately rather than accepting an unrestricted parent/JSON patch.

Within the transaction:

1. Lock the control/parent row for `auth.uid()` and validate contract version.
2. Check current access against live source rows, expected revision, active writer epoch, allowed state transition, and exact current leg.
3. Check child ownership and immutable source attribution. A PrepTest child must belong to this parent, owner, leg, section kind, and frozen section definition.
4. Update the official LR frozen snapshot or the RC attempt, elapsed clock, and current position together with the control state. Reject missing/unavailable question identities rather than drawing a new queue.
5. On completion, acknowledge the official result and advance the parent atomically. No next leg or final score becomes available before this transaction commits.
6. Increment revision, store the command receipt, and return the authoritative control/parent plus child checkpoint and server time.

Maintain durable command receipts keyed by owner, work identity, and command UUID, with a payload hash and committed result. Same UUID/same payload returns the acknowledged result after a lost response. Same UUID/different payload is rejected. Check a matching receipt before rejecting a replay for stale revision: a legitimately committed command remains acknowledged after later operations. A new stale command never overwrites newer work.

LR analytics and WAJ remain projections of acknowledged work. If they cannot be written inside closeout, enqueue idempotent follow-up work transactionally and keep retries independent of whether the official leg can advance. RC attempts retain existing UUIDs and first-attempt uniqueness. Decide explicitly which projections must finish before results appear; do not silently weaken the current closeout contract.

## Every save rechecks access without changing the actor

PrepTest commands reuse `can_sit_practice_test(auth.uid(), parent.pt)`, including current unlock/archive state and the Practice tests feature flag. Validate the active exact leg independently of the feature flag. A broad feature grant does not authorize an arbitrary child under a different parent or leg.

Standalone LR/RC control creation freezes its source discriminator and source identity. Each protected write requires the current drill feature grant or a current, owned assignment that authorizes exactly that section/session source. Validate unlock/archive/deletion state and source membership server-side. Opening unrelated assigned work must not grant access to arbitrary sections. Do not infer authorization from a caller-supplied queue, generic KV namespace, or cached route result.

The standalone source mapping must be inventoried and implemented for every supported launch before enforcement is enabled. Unsupported source kinds fail explicitly. Teacher/admin read access continues through existing SELECT policies. No teacher mutation impersonates the student's writer; any future teacher recovery operation needs its own audited authorization contract.

Access revocation denies new checkpoint, resume, claim, and completion commands. Preserve prior answers and recovery copies. Historical owned result reads remain available according to the existing result-access policy. Retrying an already committed command can acknowledge its existing receipt but cannot create further work after revocation.

## The server needs a clock and an expiring writer lease

Store phase, accumulated elapsed milliseconds, server running anchor, lease expiry, writer epoch, and contract version. For PrepTests the clock state identifies the exact leg or break; section duration remains the frozen `section_seconds` chosen at creation. Standalone controls hold their own frozen timing. Use server time for accepted state transitions; never replace saved time with a smaller client value.

**Proposed, not locked:** heartbeat every 15 seconds, writer lease 45 seconds. This follows the current break heartbeat cadence and tolerates two missed heartbeats before expiry. It bounds stale-writer acceptance and server-visible disconnect behavior without treating a single transient request failure as a permanent takeover. Verify the tolerance against real latency and teaching requirements before adopting it.

A successful pause checkpoints elapsed time and removes the running anchor. Resume creates a new anchor only after acknowledgment. When the lease expires, the authoritative clock stops at its expiry boundary and the work requires explicit recovery/claim. A claim increments the writer epoch so all old in-flight writes are rejected under the same parent lock.

**An offline pause that never reaches the server cannot be globally instantaneous.** Another device can only observe the last acknowledged checkpoint and lease expiry. Document that interval in acceptance evidence. A local paused clock remains a recovery copy, not proof that the server paused at the same instant. Reconcile unacknowledged elapsed time deliberately and monotonically; do not auto-replay local answers over a newer writer's work.

An explicit takeover may invalidate an unexpired lease if the existing UX permits it. The command must still CAS the latest revision and increment the epoch atomically. Expiry must never reset timing or grant a fresh question queue.

## RPC adoption must also close direct-write bypasses

For protected contract-version rows, deny authenticated direct parent UPDATE and direct writes to attributed LR KV records, RC session/attempt rows, and official section results. Cover INSERT as well as UPDATE so a caller cannot recreate a child under a new identity. Apply the rule to the OLD row as well as NEW attribution so clearing a protected foreign key cannot bypass enforcement.

An RPC alone is insufficient while broad owner policies still allow the same writes. Permissive policies are ORed; inspect and replace conflicting policies rather than adding a stricter policy beside them. Keep ordinary non-timed/non-protected bootcamp progress behavior intact.

Use tightly scoped security-definer functions only where required to perform these protected writes. Restrict execution to authenticated callers, fix the search path, qualify objects, and explicitly verify `auth.uid()`, ownership, source access, writer epoch, and operation payload. No service-role credential goes to the browser. A transaction-local enforcement mechanism, if used, must not be forgeable by authenticated callers.

## Roll out without erasing old sittings

1. Refresh the live metadata inventory recorded above immediately before deployment. Verify the existing parent CAS with two ordinary authenticated clients. Record differences from repository SQL before applying changes.
2. Add nullable/versioned clock state, standalone control rows, command receipts, and RPCs. Leave historical completed records readable and do not rewrite their timing or answers.
3. Add frontend adapters that consume authoritative RPC responses. New timed work uses contract v1. Existing active work enters through an explicit adoption/claim transaction that preserves owner, frozen queue, acknowledged answers, current position, accommodation timing, and completion state.
4. Enable protected direct-write restrictions for v1 work. Old browser clients encountering adopted work must fail safely and require refresh; they cannot keep using the legacy writer.
5. Complete race, outage, revocation, and compatibility acceptance before widening adoption. No terminal-state reopening, deletion, synthetic timestamps, or silent conversion of an unknown-owner device copy.

Legacy active work still using the old protocol does not carry the new cross-device guarantee. Keep #167 open until its supported active paths have adopted the contract or are explicitly excluded with truthful UI behavior. Deploy forward; never roll main back to bypass enforcement.

## Acceptance proves the transaction rather than the happy path

| Scenario | Required result |
| --- | --- |
| Two clients submit the same expected revision | Exactly one new command commits; the other gets conflict with authoritative state. |
| Takeover races an LR/RC save | Parent lock and epoch decide order; no old-writer child commit after successful takeover. |
| Direct protected INSERT/UPDATE or attribution clearing | Denied for ordinary authenticated owner and other account. |
| Old epoch, wrong owner/source/leg, terminal parent | No child or parent mutation; saved work remains intact. |
| Access is revoked after route admission | New checkpoint/claim/resume/completion denied despite cached route authorization. |
| Response lost after commit | Same command UUID/payload returns one acknowledged answer/position/result without duplicate advancement. |
| Replayed UUID with changed payload | Rejected; acknowledged receipt and result unchanged. |
| A later valid command precedes retry of an old receipt | Old committed operation is acknowledged without restoring its older state. |
| RC first-attempt insert races | One first attempt per session/question, UUID retries preserve the original answer. |
| Pause/break save fails, reload, then second-device claim | Account clock/lease state is consistent; local backup cannot silently reset remaining time. |
| Unsent offline pause | Server stops at documented expiry boundary; no claim of immediate global pause. |
| Lost heartbeat and stale browser return | Questions remain gated until claim/recovery acknowledgment; elapsed time does not decrease. |
| Leg closeout or final-score write fails midway | No partial advance/score; retry finishes the same leg exactly once. |
| Older frontend resumes adopted work | Protected raw writes fail safely; refresh preserves acknowledged records. |
| Teacher views records | Same owner/source work is visible through allowed reads; teacher identity never becomes the student writer. |

Test standalone LR and standalone RC separately from PrepTest LR/RC and the break. Use existing owned tester fixtures, ordinary authenticated accounts, and controlled request failures. Do not substitute service-role success for permission evidence.

## Deployment needs immediate route and credit approval

This batch contains the implementation plan only. It does not contain schema changes, RPC code, frontend RPC adapters, or a backend deployment.

Before starting a Lovable Cloud backend deployment, confirm the deployment route with Joshua. Deploy managed Edge Functions through the Lovable agent, not the Supabase CLI, unless the backend has been migrated to a separately managed project. Any action that spends or may spend Lovable credits needs Joshua's explicit confirmation immediately before that action, even though frontend releases were broadly authorized. Free publication controls do not authorize a credit-using backend action.

Prepare the reviewed migration/RPC code and test evidence first so that approval concerns a concrete deployment. Generate database types from the deployed backend afterward; do not hand-edit generated types. Report separately: code prepared, backend deployed, frontend switched, live acceptance verified.

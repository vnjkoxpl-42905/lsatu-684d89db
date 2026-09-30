# Ship the atomic PrepTest writer before standalone timed work

Date: 2026-09-30

Status: **Inactive PrepTest control, typed writer, child enforcement, server manifest, and local SQL verification artifacts are prepared. No backend deployment or switch of existing frontend writers.** See [writer readiness and limits](2026-09-30-timed-pt-writer-readiness.md) and [the earlier foundation phase](2026-09-30-timed-pt-foundation-readiness.md). Ticket #167 remains open. This expands [the proposed timed-write contract](2026-09-30-timed-write-contract.md); that contract's live metadata evidence and deployment approval requirements still apply.

The first backend release should cover PrepTest parent state, LR legs, RC legs, and the break together. Standalone timed LR/RC follows as a separate adoption phase. A parent-only RPC would leave the child-write race intact.

## The existing boundaries determine the first batch

| Existing boundary | Current behavior | Required v1 replacement |
| --- | --- | --- |
| `src/lib/practiceTestStore.ts` | Parent creation, revision CAS, device claim, pending device copies | Versioned create/claim commands and authoritative command responses; existing reads and backup ownership checks remain |
| `src/lib/drillResumeSession.ts` | Separate parent-device check, then official LR KV snapshot upsert | LR snapshot checkpoint under the parent lock; retained device copy until acknowledgement |
| `src/pages/Drill.tsx`, `src/lib/sectionHistorySave.ts` | LR closeout writes attempts, WAJ, history, resume completion in separate requests | One official close-leg command; explicit projection completion contract |
| `src/features/rc/api/rcProgress.ts` | Session creation, answer insert, clock/position update, and completion each check/write separately | Typed RC start/checkpoint/close-leg commands |
| `src/features/rc/pages/RcPlayer.tsx` | Questions and clock gated on account reads/saves; closeout writes blank first-attempt rows | Consume acknowledged session/position/clock; closeout batch and parent advance commit together |
| `src/pages/PracticeTestRun.tsx` | Reads child results and later saves parent advancement/break/final score | Read authoritative parent returned by close-leg; parent and break commands cannot accept arbitrary JSON patches |
| `src/lib/practiceTestRunner.ts`, `src/lib/practiceTestReview.ts` | Read attributed historical LR/RC records | Preserve result/review reads; v1 completion is not inferred from a child row that has not committed parent advancement |

Repository schema is concrete but is not a fresh live DDL verification. `practice_test_runs.id` is **text**, not UUID. Its statuses are `in-progress`, `complete`, `abandoned`; RC uses `in_progress`, `completed`, `abandoned`. LR official records are JSON in `bootcamp_kv`, under `practice_sessions`; do not assume a normalized LR sessions table exists. Keep the installed owner FKs and per-leg/first-attempt unique indexes described in the contract.

## Phase 0: freeze behavior and reproduce the races

Prepare an ordinary-authenticated two-client harness against an isolated database with the installed schema. Refresh the live metadata inventory before deployment. Exercise existing parent CAS, then demonstrate that separate child preflight/writes can race takeover. No service-role success is permission evidence.

Record these current semantics before implementation:

- Parent `section_seconds` freezes the user's chosen timing. The break is 600 seconds. Historical null timing retains existing reader compatibility.
- LR permits overtime and records `regulation_answered_qids`. Preserve that distinction; do not silently introduce automatic submission at budget expiry.
- RC answer column is `selected`; null closeout rows count as unanswered, and session elapsed time is not the sum of per-question times.
- Current scoring is client-derived. This work protects transactional ownership, clock state, and acknowledged results. It does **not** introduce a new secure-grade product requirement or claim server-verified answer correctness. Validate result structure and derive parent totals from acknowledged child results. Preserve existing scoring formulas and explicitly retain their trust boundary.
- Current LR closeout requires its expected WAJ work before the leg is considered finished. Do not move it after advancement without a separately recorded change to that behavior.

## Phase 1: add protected control state and receipts

Prepare two forward migrations, not a historical-record rewrite:

1. `supabase/migrations/<timestamp>_timed_work_v1_control.sql`: control fields, receipt table, typed RPC helpers, and owner result reads.
2. `supabase/migrations/<timestamp>_timed_work_v1_enforcement.sql`: v1 direct-write restrictions and exhaustive OLD/NEW attribution protection.

The exact timestamps are assigned when implementation starts. Keep deployment of enforcement and adapter activation coordinated; an RPC left beside unrestricted protected raw writes does not provide the guarantee.

For the PT phase add nullable `timed_contract_version` to `practice_test_runs`, plus server-owned writer epoch, phase, accumulated elapsed milliseconds, running anchor, lease expiry, and active clock leg. Keep existing `revision` as the single command CAS version. Preserve existing device ID for UI display; possession of an arbitrary device ID alone does not authorize a write. Epoch/lease/revision are validated under the parent lock.

Constraints for protected rows:

- Version is supported; revision/epoch/elapsed are nonnegative.
- Running phases have an anchor and lease; paused/terminal phases have no running anchor.
- Clock leg matches the current frozen leg, or the phase is the one permitted break.
- Owner, PT, pace, section duration, frozen leg definition, and protected version cannot be changed by a client patch.
- Terminal state cannot reopen. No protected source or completion record is deleted by this API.

Use a companion binding table for LR KV records. Its owner/run/leg, namespace, record ID, and frozen queue identity are immutable, and there is one binding per PT LR leg. The existing key `drill::practice-test::<runId>::leg-<index>` and `practiceSessionIdFor` can be preserved for PT compatibility. A generic owner JSON blob must not become writer/access authority.

Use a durable command receipt table with unique `(owner_id, work_kind, work_id, command_id)`, canonical payload hash, committed revision, and committed result. A command UUID is separate from an RC attempt UUID. Store receipts in the same transaction as progress. Authenticated clients can read their own receipts but cannot insert/update/delete them directly. Retain receipts long enough for supported recovery; a TTL policy is not part of this batch.

## Phase 2: implement one typed PT transaction

Public entry points: `create_timed_practice_test_v1` and `commit_timed_work_v1`. Creation cannot take an arbitrary owner. New protected children are created inside start-leg, not by direct browser inserts.

The commit envelope is `{workKind, workId, expectedRevision, writerEpoch, deviceId, commandId, operation, payload}`. Derive owner from `auth.uid()`. Parse only the fields for the named operation and reject unknown/immutable patches. Start with PT operations: claim/adopt, start-leg, checkpoint, pause, resume, close-leg, start-break, finish-break, abandon. Final completion is derived when the final leg closes; there is no unrestricted set-score or set-current-leg operation.

Each successful command performs these steps:

1. Resolve the actor-owned parent and lock it `FOR UPDATE`. Look for the command receipt under that lock. A matching receipt acknowledges the old committed operation before stale-revision or current-access rejection; changed payload rejects. Return both the receipt and **current** authoritative parent so retrying an old receipt cannot restore an older UI state.
2. Validate supported version, expected revision, writer epoch, lease, exact phase/leg, and immutable child binding. A new stale command returns a typed conflict with current state and makes no progress writes.
3. Check current PT entitlement using the existing `can_sit_practice_test` rules. Lock the actual grant row used for authorization: the profile feature row, exact owned/unlocked/nonarchived assignment, or admin-role row. A boolean precheck alone does not serialize a concurrent revoke. Use deterministic lock order and test it against the revocation paths. Missing access rejects new writes while preserving history and receipts.
4. Settle clock time using server time, bounded by the acknowledged lease expiry, then apply the operation. Never decrease elapsed time. Heartbeat renews only a valid active writer. Proposed 15-second heartbeat/45-second lease remains a proposal to verify, not an adopted product constant.
5. Persist LR snapshot or RC answer batch together with elapsed time and position. Validate qid membership, queue order, question count, selected letters/nulls, index bounds, and exact parent/leg/session attribution. Do not regenerate missing content or accept a new queue during recovery. Keep all acknowledged choices through takeover.
6. On close-leg, persist the official child result, required closeout projections, child terminal state, parent leg result, and advance/break/final state in one transaction. Increment parent revision once, write receipt, and return parent plus child checkpoint and server time.

RC retains existing first-attempt uniqueness. Same attempt UUID with the same owner/session/question/passage/choice is idempotent; different content rejects. A different first-attempt UUID for an already committed question conflicts rather than replacing the original. Review reanswers require their separate allowed semantics and cannot reopen an exam leg. Clock checkpoint and answer acknowledgement must share the command; current split calls are not enough.

LR stores the frozen `PracticeSession` shape and validates stable attribution outside that JSON. Do not trust supplied `user_id`, `pool_slug`, `completion_id`, or arbitrary section-history parent links. Keep unanswered/answered/overtime distinctions and current score trust. Validate totals against the frozen queue and derive parent aggregation from the acknowledged child record rather than a later unrelated readback.

For LR WAJ/analytics, inventory `commitSessionAttempts`, `logSectionWrongAnswers`, and `persistSectionResults` before moving their writes. Either put mandatory rows in the transaction, or introduce an explicit closeout-pending phase with an idempotent transactionally enqueued projection job. In the latter design, parent advancement still waits for required projection acknowledgement. Mail remains optional and cannot block the official leg, matching current behavior. Do not leave the existing client closeout path writing official rows around the RPC.

## Phase 3: close direct-write bypasses before switching clients

Protected parent INSERT/UPDATE, attributed LR KV INSERT/UPDATE, RC session/attempt INSERT/UPDATE/DELETE, and official section-result INSERT/UPDATE/DELETE must reject ordinary authenticated direct mutations. Restrict metadata-only RC operations deliberately rather than accidentally disabling exclusions/review flags. Preserve ordinary bootcamp data and historical reads.

Enforcement checks **OLD and NEW** protection, owner, source identity, and attribution. Clearing the PT FK, setting contract version null, moving a protected KV record, or inserting an alternate child for the same protected leg cannot escape it. Reserved PT LR source keys cannot be recreated through generic KV writes. Replace conflicting permissive policies; adding a stricter permissive policy leaves the existing owner policy effective.

Prefer a dedicated tightly privileged no-login executor role for protected RPCs if Lovable's managed migration role supports that ownership setup. Authenticated/anonymous must have no membership in it. Security-definer functions fix search path, qualify tables, check `auth.uid()`, and receive only narrow grants. Ordinary callers must not be able to forge an RPC-only bypass with a custom setting. Verify managed-role capabilities before selecting an enforcement technique; do not equate every `postgres`-owned definer function with this authorized writer.

## Phase 4: switch PT adapters and explicitly adopt active work

Add `src/lib/timedWorkClient.ts` for typed command envelopes/responses and conflict/access/expired-writer errors. Backups retain the same pending command UUID, payload, expected revision, and epoch until acknowledged. Never mint a fresh command on a lost-response retry.

Switch the existing boundaries in the first table. The parent returned by close-leg drives advancement; `PracticeTestRun.tsx` stops performing a second parent save for that v1 leg. `RcPlayer.tsx` and `Drill.tsx` stop clocks and hide/gate questions on loss of authoritative writer state until claim/recovery is acknowledged. Break pause/resume/finish uses the same contract. Device elapsed time is recovery evidence, not server proof of an instantaneous offline pause.

New PTs use v1 only after backend readiness is verified. Existing active rows enter through explicit adoption/claim under the parent lock. Validate and preserve owner, current leg, frozen queue/passages, acknowledged answers, saved position, timing, and terminal results. Adopt only a known server-owned child; unknown or contradictory device-only copies need explicit recovery rather than automatic import. Already completed/abandoned rows remain readable and are not rewritten.

An old browser meeting an adopted record must fail its raw writes and require refresh. Compatibility tests must include bypass attempts through every legacy writer, not only the new adapter's happy path.

## Phase 5: give standalone LR/RC durable sitting identities

Do not include this in the initial PT rollout. Standalone LR currently uses `drill::section::ptX-sY` with a deterministic record ID; retakes overwrite that identity. A control row keyed only to it would confuse terminal history with a new sitting.

Introduce a distinct v1 sitting UUID and immutable control/source identity. Use a distinct v1 LR KV record per sitting plus a current-active lookup, or normalized canonical snapshot storage. A unique active `(owner, source_kind, source_key)` permits one active writer while retaining completed retakes. RC already has a session UUID, but it still needs frozen standalone source authorization and control binding.

Inventory every supported standalone source before enforcement: feature-granted manual full section, exact classroom/homework assignment, bootcamp source, and any supported custom timed source. Freeze source identity and check its current ownership/unlock/archive state on every command. Unsupported source kinds fail explicitly. Broad access can authorize its supported source kinds; an unrelated assignment cannot authorize an arbitrary queue. Retain existing timing/retake behavior and clearly identify any temporarily excluded legacy paths.

## Code prepared is separate from deployed and verified

Implementation deliverables before approval:

- Reviewed additive schema/RPC and enforcement migrations, with immutable/terminal/owner constraints and a rollback-free forward recovery plan.
- An isolated PostgreSQL transaction harness covering same-revision races, save-versus-takeover, save-versus-revoke, changed-payload replay, old-receipt replay after later work, lease expiry, failed closeout, and raw OLD/NEW attribution bypasses.
- Frontend adapter tests for pending command retention, authoritative response consumption, no duplicate advancement, older clients, adoption, failed hydration, and frozen queues.
- Typecheck/build and student/teacher browser evidence before frontend release.

Refresh live metadata immediately before deployment. Joshua must confirm the Lovable Cloud backend route and immediately approve any credit-using action. No Supabase CLI Edge Function deployment under the current managed backend. Generate database types only from the deployed schema; temporary typed RPC boundaries may be isolated in the new client until regeneration, not hand edits to generated types.

Report four separate states: **code prepared**, **backend deployed**, **frontend switched**, **live acceptance verified**. Run ordinary authenticated two-device/outage/revocation acceptance for PT LR, PT RC, and break before expanding rollout. Later run standalone LR/RC separately. Keep #167 open while any supported active path lacks the contract or its acceptance evidence.

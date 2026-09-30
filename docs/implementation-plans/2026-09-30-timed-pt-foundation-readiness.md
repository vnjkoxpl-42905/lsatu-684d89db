# PrepTest control foundation is prepared and inactive

Date: 2026-09-30

**Code prepared: phase-1 draft only. Backend deployed: no. Frontend switched: no. Live acceptance verified: no.** Ticket #167 remains open. This implements part of [the timed implementation design](2026-09-30-timed-write-implementation.md), under [the proposed contract](2026-09-30-timed-write-contract.md).

The reviewable SQL is [the control foundation artifact](artifacts/2026-09-30-timed-pt-control-foundation.sql). It lives outside `supabase/migrations` and has not been applied to the managed backend. There are no public create/commit RPCs, adapters, adoption, or historical backfill. Existing frontend writers remain unchanged.

## What this draft establishes

- Nullable protected control fields on `practice_test_runs`, with supported version, phase, epoch, elapsed time, lease, clock-leg, terminal, and frozen-definition consistency checks. Legacy rows retain null control fields.
- A dedicated no-login executor role with no ordinary authenticated/anonymous membership. Protected parent mutations require that exact executor identity. A caller-settable session flag or an unrelated `postgres` definer does not authorize them.
- OLD and NEW protection checks, immutable source attribution and timing definition, sequential revisions, bounded epoch increments, terminal preservation, and append-only LR bindings and command receipts.
- Owner-readable receipts with database-computed canonical JSON payload hashes. Duplicate command identities cannot replace an existing receipt. Replay acknowledgement and changed-payload error handling still belong to the future writer.
- LR bindings retain the existing `practice_sessions` namespace and `drill::practice-test::<runId>::leg-<index>` source key. Queue cardinality must match an LR leg, with distinct nonempty identities. This checks identity structure, not authorization against a server content manifest.

The parent is `text` keyed. The composite receipt/binding FK targets `(practice_test_runs.id, practice_test_runs.user_id)`, matching the checked-in `unique(id,user_id)` in `20260829120000_practice_test_runs.sql`. This is repository schema verification, not a fresh live DDL check. Existing installation triggers, grants, functions, and managed role ownership must be inventoried before deployment.

## What local execution proves

The harness [timed-pt-foundation-sql.mjs](../../scripts/verification/timed-pt-foundation-sql.mjs) creates synthetic fixtures in one in-memory PGlite database, applies the artifact, and exercises SQL behavior. It takes an external module path through `--pglite-module` or `PGLITE_MODULE`; no application dependency was added.

```powershell
node scripts/verification/timed-pt-foundation-sql.mjs --pglite-module C:/Users/Joshu/AppData/Local/Temp/lsatu-db-validation/node_modules/@electric-sql/pglite/dist/index.js
```

34 isolated assertions passed, including an independent root rerun. Local checks cover legacy insert/update/delete, forged protection and ownership, frozen-definition changes, missing anchors, backwards control state, LR binding mismatches, receipt hashing and uniqueness, append-only records, owner-only receipt reads, custom-setting bypass denial, and terminal reopening denial. Independent review corrected legacy DELETE to return OLD; the regression proves it actually removes the unversioned synthetic fixture.

These are isolated foundation checks. They do **not** prove concurrent transactions, production JWT/authenticator role behavior, managed `CREATE ROLE`/function ownership support, entitlement revocation serialization, protected child-write exclusion, lease settlement, command replay responses, answer checkpoints, or atomic completion. Privileged local executor setup creates test records only; it is not evidence that a public API authorizes callers safely. The 45-second lease in test fixtures is not an adopted product constant.

## The next phase must close the transaction

Before any protected row is created or adopted in production, implement and review the typed writer and exhaustive child guards together:

1. Approve the server-owned content manifest and creation blueprint. Validate frozen LR queue/RC passage membership against it; a client-supplied queue is insufficient authority.
2. Derive actor from `auth.uid()`, lock the owned parent, check a durable receipt before stale-command rejection, and return both acknowledged receipt and current authoritative state. Changed-payload replay must reject explicitly.
3. Serialize authorization with the actual feature/assignment/admin grant row. Approve lease/heartbeat behavior and settle elapsed time under the same parent lock.
4. Validate and write LR snapshots or RC answers, position, and clock together. Protect all attributed legacy child writers using OLD and NEW attribution, including reserved LR source keys.
5. Resolve mandatory LR attempts/WAJ/history closeout behavior. Advance the parent only after required work is acknowledged, whether committed synchronously or represented by a transactionally enqueued closeout-pending job.
6. Test takeover, access loss, expired lease, lost reply, same-revision races, later-state receipt replay, failed closeout, and legacy bypasses with independent authenticated clients. Then switch adapters and explicitly adopt supported active records.

Do not deploy this foundation by itself as a timed safety fix. The absence of a public writer keeps this artifact inactive now; installing it and granting or adopting protected work prematurely would strand old writers without supplying a safe replacement. Backend deployment still requires the confirmed Lovable Cloud route and any immediate credit-spend approval described in the design.

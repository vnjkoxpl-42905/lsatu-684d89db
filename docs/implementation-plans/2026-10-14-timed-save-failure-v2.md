# Timed save failure v2: exact pause contract

Status: implementation design for [#167](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/167). No backend change or deployment is authorized by this document.

## Why version 1 cannot meet the decision

The full PrepTest and standalone section v1 RPCs settle a running clock through `min(server_now, lease_expires_at) - running_anchor`. The installed lease was 30 seconds in the 2026-09-30 verification receipts. If a save request never reaches the server, the server cannot observe the failure. A local pause screen blocks answers, but the account clock still accrues until lease expiry. Retrying the retained command does not recover that time. A shorter lease only reduces the discrepancy; it cannot make the pause exact.

The product decision is exact pause on a failed account save. Version 2 must accept a tightly bounded client-observed active duration for this case. That is a deliberate trust choice: an offline client can falsify its clock. Bounds, an immutable command, and anomaly logging reduce abuse but cannot prove an offline timestamp. Do not describe the current v1 screen as an authoritative clock pause.

## One atomic checkpoint and pause

For a v2 timed LR question, RC question, full PrepTest child, or running break, the client freezes its visible monotonic clock **before** transmitting any save or transition. It durably writes one pending command first. The command contains the complete answer and position state when applicable, the original writer epoch and expected revision, a fresh command ID, the last acknowledged server clock anchor, and `freeze_elapsed_ms`. The same command bytes are retried until an account receipt arrives or an explicit rejection resolves them. The UI disables answer changes, next/previous, closeout, break transition, and resume while pending.

The v2 RPC atomically validates and commits the checkpoint plus a paused phase. It sets `elapsed_ms` to the accepted `freeze_elapsed_ms`, clears the running anchor and lease, saves the answer/position, increments revision, and stores the canonical command and receipt in one database transaction. A successful receipt ends the pending state. Only a separate acknowledged `resume` command starts the clock again. A normal fast save may issue `resume` immediately after the pause receipt; after a failed or timed-out save, show the pause and require an explicit Continue action. If that resume acknowledgment fails, the account remains paused and its resume command stays pending.

The break uses the same freeze-and-pause command without answer payload. Finishing a break or starting a new leg is available only after its pending command is acknowledged. A closeout first acknowledges the final checkpoint, then closes from paused state. Every route that can advance a timed sitting must use this writer; legacy local-only writes cannot bypass it.

## Bounded client clock validation

Use an acknowledged v2 anchor containing `revision`, `writer_epoch`, `server_time`, `elapsed_ms`, `lease_expires_at`, and a server-generated unpredictable token stored with that revision. The client measures active duration with `performance.now()` from the receipt. At command preparation, persist `freeze_elapsed_ms = acknowledged_elapsed_ms + floor(active_monotonic_ms)` and the anchor token. A reload cannot reconstruct a lost monotonic interval: the persisted pending command can be retried unchanged, but a new timed command requires a fresh account read and explicit resume. Do not use `Date.now()` alone to backdate a pause.

The RPC accepts the client duration only if the token and revision match the current row, the epoch/device match, the duration is finite and nonnegative, the resulting elapsed never falls below acknowledged elapsed, and it does not exceed the server-observed active window plus a small documented skew allowance. It must reject impossible negative time, a future freeze, reused token on a different command, altered replay bytes, and durations beyond the authorized lease. Log the client/server duration difference and flag unusually large discrepancies for audit. Define the skew allowance and maximum timeouts in the migration, not in UI copy. The server cannot independently verify the exact offline duration within these bounds; that residual risk is explicit.

On request timeout, treat the receipt as unknown, never as a rejection. Keep the original command and frozen clock in device storage. A retry must not prepare a new checkpoint or alter its frozen time. A definite conflict or access denial keeps the backup, blocks restricted questions, and offers an account refresh plus a read-only explanation. It must not silently merge old answers into a newer epoch.

## Replay, takeover, and ownership

- Check `(owner_id, sitting_id, command_id)` before revision validation. Identical replay returns the original receipt and committed snapshot, including its paused elapsed. Changed bytes with the same ID fail. One answer selection creates at most one committed revision and attempt binding.
- A claim from a second signed-in device is explicit. It atomically pauses the old lease at a server-observed bound, increments `writer_epoch`, and assigns the new device. The prior device and all of its unresolved old-epoch commands can no longer write. If takeover is allowed before lease expiry, show that it interrupts the first device. Preserve the first device's backup for review; do not auto-attach it to the new writer.
- The current account owner is part of every command and local backup key. Ownerless browser records stay untouched and out of account Attempts. Access loss blocks question reads and resume while retaining the sitting and any completed result. A restored entitlement can resume the same owned sitting after fresh authority is read.
- Paused time does not accrue during reload, offline waiting, or an unresolved resume. A `claim` or other recovery command cannot secretly advance a paused clock.

## Coexistence and rollout

Add v2 tables or columns and v2 RPC names alongside v1. Keep v1 RPCs and frozen metadata readable and writable for existing v1 sittings; do not rewrite their `lease_ms`, elapsed values, result bindings, or historical records. Do not change the v1 settlement formula in place. New sittings are created with `timed_contract_version = 2` only after the v2 backend, client, RLS, and capability checks are deployed. Route each sitting by its frozen version. The v2 client must refuse a version it cannot safely run; no implicit v1-to-v2 adoption.

Deploy in this order: migration and grants; backend receipt/replay tests; capability flag disabled; client behind the same flag; one controlled account test; network and second-device acceptance; then enable v2 creation. Keep a rollback switch for **new creation only**. Disabling creation must not disable read, retry, pause, result access, or completion for existing v2 sittings. LSAT U's Lovable Cloud Edge Function path must be confirmed before any deployment; this design does not authorize spending Lovable credits.

## Required evidence before closing #167

1. Unit and RPC tests for LR, RC, full PrepTest leg, and break: delay, request dropped before server, committed reply dropped, duplicate retry, changed replay bytes, and reload with a pending command. Assert exact frozen elapsed and one answer binding.
2. A real browser network interruption on each route. Verify the visible clock stops at command preparation, all progression is blocked, the original backup survives reload, and the account clock after retry equals the frozen value. Resume only after account acknowledgment.
3. Two devices: force takeover, reject the first writer's pending command, retain its backup, then confirm the second writer cannot be overwritten. Test both a live and expired lease.
4. Remove access during a run. Verify blocked question/resume access, preserved owned state and completed result, and no ownerless history adoption.
5. Test v1 active sittings across rollout and v2 flag rollback. Confirm v1 behavior is unchanged and no current run is stranded.
6. Verify deployed database definitions, RLS/grants, capability flag, browser behavior, and persisted rows independently. A passing source test or UI screenshot alone is not release evidence.

# Phase 1 — Lovable edge-function deploy prompts

These are the only Phase 1 (swallowed-error sweep) items Claude Code could **not** do locally:
they live in `supabase/functions/` (Deno) and deploy through Lovable, not the app bundle.
The app-side sweep (~all named HIGH findings + the in-scope medium/low ones) is already
committed. Paste each prompt below into Lovable one at a time, in any order (they touch
independent functions). Each is self-contained.

All seven are the same root cause as the app sweep: **supabase-js v2 returns `{ error }` and
never throws, so a bare `await supabase.from(...).insert/update/delete(...)` reports success
on a real failure.** Each fix destructures the error and surfaces it.

> Note: H17 (embedding dims), H18 (gemini-proxy auth), and H19 (tutor-chat fire-and-forget)
> were already deployed in Phase 0 (see `PHASE0-LOVABLE-DEPLOY.md`). Do not redo them.
>
> **Prompts A and B are ALREADY DONE** (Lovable deployed them mid-session):
> - A (H20, admin-manage-users) — commit `90a90ab8`, `throw upsertError`/`throw deleteError` in place.
> - B (H21, process-email-queue) — `log_failures` counter, `CRITICAL: sent-log` guard, and the
>   `read_ct` retry-budget fallback all landed.
>
> **Remaining to paste: C, D, E, F, G (5 prompts).** Verified still swallowing their errors as of
> this update: gcal-sync-pull (unconditional nextSyncToken), voice-coach-respond (still returns a
> fabricated coach reply), teacher-operator-chat (participant insert unchecked), synthesize-session-bundle
> (ledger update unchecked), memory-admin (writeAudit insert unchecked).

---

## Prompt A — admin-manage-users (H20) — ✅ DONE (Lovable 90a90ab8), skip

## Prompt B — process-email-queue (H21) — ✅ DONE (landed mid-session), skip

## Prompt B (original text kept for reference) — process-email-queue (H21): sent-log insert unchecked breaks dedup/retry accounting

```
In supabase/functions/process-email-queue/index.ts (around line 274), the email_send_log
inserts are not error-checked. A failed "sent" log combined with a failed queue delete can
double-send, and a failed "failed" log breaks retry accounting.

Fix:
1. For the 'sent' log insert: `const { error: logErr } = await ...insert(...);` and if logErr,
   `console.error('CRITICAL: sent-log insert failed', { message_id, logErr })`; if the queue
   delete ALSO fails, do not treat the message as done (log loudly, re-attempt the delete once).
   Add a `log_failures` counter to the function response payload.
2. For the 'failed' log insert: check the error; on failure fall back to msg.read_ct for the
   retry budget so retries stay bounded.
3. Apply the same error check to the DLQ and rate_limited inserts.
Redeploy process-email-queue.
```

## Prompt C — gcal-sync-pull (M69): unchecked upserts drop events but advance the sync token

```
In supabase/functions/gcal-sync-pull/index.ts (around line 104), every schedule_events
upsert/update ignores its error, yet nextSyncToken is persisted anyway — so dropped events are
never retried (silent calendar data loss).

Fix:
1. Destructure `{ error }` from each upsert/update; collect failures into an `errors: string[]`.
2. If ANY event upsert failed, do NOT persist nextSyncToken (keep the old token so the next run
   retries the window) and return `{ ok: false, processed, errors }` with status 500.
3. Check the final gcal_sync_state update error and log/throw.
Redeploy gcal-sync-pull.
```

## Prompt D — voice-coach-respond (M71): fabricated coaching reply on failure

```
In supabase/functions/voice-coach-respond/index.ts (around line 125), the catch returns a
canned coaching reply as if the model generated it — a fake-data + swallowed-error violation.

Fix:
1. In the catch: `console.error('voice-coach-respond error', error);` then return a real error
   response `{ error: 'Coach unavailable, try again' }` at status 500 WITH cors headers, instead
   of fabricated coaching.
2. Keep the graceful degraded message only for the existing 429 path (line ~98).
3. Add validation that question.answerChoices and selectedAnswer exist before building the prompt.
Redeploy voice-coach-respond. (The app already renders an honest error state for the 500.)
```

## Prompt E — teacher-operator-chat (M72): participant insert unchecked

```
In supabase/functions/teacher-operator-chat/index.ts (around line 1019), send_message inserts
a conversation_participants row without checking the error, then inserts the message — so a
message can land in a thread the student cannot see.

Fix: `const { error: pErr } = await admin.from(table('conversation_participants')).insert([...]);`
and `if (pErr) throw pErr;` BEFORE inserting the message. The existing runTool catch converts it
to `{ ok: false, error }` which the desk already renders. Redeploy teacher-operator-chat.
```

## Prompt F — synthesize-session-bundle (M75): ledger update after draft creation unchecked

```
In supabase/functions/synthesize-session-bundle/index.ts (around line 290), the
session_ingestions ledger update after draft creation is unchecked, so a regenerate can orphan
drafts.

Fix (prefer atomic): destructure the error from the session_ingestions update; if it fails,
throw AND delete the just-created draft so the pair stays atomic, and console.error with
ledgerId + draftId. (Acceptable alternative: return `{ ok: true, draft_id, warning:
'ledger_update_failed' }` and log, since the draft does exist.) Redeploy synthesize-session-bundle.
```

## Prompt G — memory-admin (L119): audit-trail inserts unchecked

```
In supabase/functions/memory-admin/index.ts (around line 72), writeAudit ignores its insert
error, contradicting the "stays truthful" audit contract.

Fix: destructure `{ error }` in writeAudit; if it fails, console.error with action + memoryId
and include `audit_written: false` in the mutation's JSON response so the UI can flag it. For
the 'forget' action, write the audit row BEFORE the delete so a deletion is never trace-less.
Redeploy memory-admin.
```

---

## After deploying

Spot-check one write path per function where practical (e.g. change a role and confirm a forced
failure now 500s instead of silently succeeding). None of these require app redeploys — they are
edge-function-only.

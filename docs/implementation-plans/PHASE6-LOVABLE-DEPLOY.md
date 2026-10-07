# Phase 6 — Lovable deploy (migration + edge function)

Phase 6 (COMPREHENSIVEAUDIT: query hygiene + hardening) authored two things in-repo that
Claude Code cannot push to prod: one Postgres migration (four query RPCs) and one edge-function
fix (`send-transactional-email`). All the **app-side** work (the migration file, the call-site
swaps in `useInbox`/`Practice`/`Analytics`, the generated-types signatures, and a vitest spec) is
already committed. This doc is the deploy handoff.

The Lovable-managed prod DB + functions (`atrcqxpmqrynmtvvyjju`) are not reachable from the
Supabase MCP, so applying the migration and deploying the function is Lovable's job.

---

## 1. Apply the migration

Committed at:

```
supabase/migrations/20260709235900_phase6_query_rpcs.sql
```

It creates 4 functions (all `SECURITY INVOKER`, so existing RLS on `messages`,
`message_attachments`, and `attempts` still governs every row):

| Function | Reads | Effect |
|---|---|---|
| `get_latest_messages(conv_ids uuid[])` | `messages` | `DISTINCT ON (conversation_id)` latest message per conversation |
| `get_conversations_with_attachments(conv_ids uuid[])` | `messages` ⨝ `message_attachments` | which conversations have any attachment |
| `attempt_totals(p_class_id text)` | `attempts` | `(total, correct)` for the class |
| `attempt_accuracy_rollup(p_class_id text)` | `attempts` | `(qtype, level, bucket, total, correct)` grouped; bucket = current7d / prev7d / older |

Plus EXECUTE grants to `authenticated` and `anon`.

These replace client-side fetch-all queries whose row count was unbounded: the inbox
last-message-per-conversation (previously a bounded `.limit()` stopgap), the Practice
total/accuracy tile, and the Analytics rollup. **The call sites are already swapped in the
committed app code, so they will 404 until this migration is applied** — apply it before (or with)
the next app deploy.

### Prompt to paste into Lovable

```
Apply the committed migration file supabase/migrations/20260709235900_phase6_query_rpcs.sql
to the database. It creates four SECURITY INVOKER functions (get_latest_messages,
get_conversations_with_attachments, attempt_totals, attempt_accuracy_rollup) plus their
EXECUTE grants to authenticated and anon. Do not modify the SQL.

After applying, regenerate the Supabase TypeScript types so the generated types include these
four functions (Claude Code added matching signatures to src/integrations/supabase/types.ts
manually; your regenerated version should match and can overwrite them).
```

---

## 2. Deploy the edge-function fix

`supabase/functions/send-transactional-email/index.ts` was hardened in-repo (M68):

- The render / `template.subject(templateData)` / enqueue body is now wrapped in try/catch.
  `templateData` is caller-controlled, so a throw there previously escaped as a bare 500
  **without corsHeaders** (an opaque CORS failure to the browser) and logged no `failed` row.
  It now returns a 500 **with corsHeaders** and writes a `failed` `email_send_log` row.
- The `pending`-insert error is now checked (warn-only; the enqueue is the real work).
- `email_send_log` is documented as **append-only per `message_id`**: this function writes a
  `pending` row, `process-email-queue` later writes a `sent`/`failed` row keyed by the same
  `message_id`. **Readers computing status metrics must take the latest row per `message_id`**
  (a `pending` with no later terminal row = still in flight). Counting raw `pending` rows
  over-counts in-flight sends.

### Prompt to paste into Lovable

```
Deploy the committed edge function supabase/functions/send-transactional-email. The only change
is error-handling hardening (try/catch around render/subject/enqueue, a failed email_send_log
row + 500-with-CORS on throw, and a checked pending insert). No schema or config change.
```

---

## 3. M70 resolved in-repo (no deploy needed) — note

`generate-micro-drill` returned hardcoded fake questions. Decision: the micro-drill stays a real
feature, but the lookup is now **client-side** in `VoiceCoachModal.tsx` via
`questionBank.getQuestionsByFilter({ qtypes, difficulties })` — the question bank is static JSON
loaded in the browser, so there is nothing for an edge function to query. The vestigial
`generate-micro-drill` function was **deleted** (`git rm`); it was never in `config.toml`. No
Lovable action required. If prod still has a deployed `generate-micro-drill`, delete it there.

---

## After Lovable applies it — live verification (owed, do this with a test student)

The RPCs do not exist in prod until the migration is applied, so the call sites 404 until then.
Once applied, verify in the running app (admin login), preferably against a test student:

1. **Inbox** — open the messenger. Each thread shows its correct latest-message preview and
   unread state; a thread whose only attachment is an **old** message still shows the paperclip
   (the stopgap could miss this). No `[inbox] load messages failed` console errors.
2. **Practice** — the stats tile shows the right Practiced count + accuracy for a student with
   attempts (not "0 / No attempts yet"), and errors surface a toast rather than a fake zero.
3. **Analytics** — accuracy-by-type, accuracy-by-level, the 7d trend arrows, and the top-3
   opportunity areas match what the student's history implies. (Pure reconstruction is unit-tested
   in `src/lib/analyticsRollup.test.ts`; this checks the RPC wiring end to end.)
4. **Voice-coach micro-drill** — in a drill, open the voice coach, pick "1-min drill (2 Qs)". It
   should launch a type-drill of real questions matching the current question's type + difficulty
   (no `micro-<timestamp>` fake qids, no empty drill). If no similar questions exist it toasts
   instead of navigating to an empty drill.
5. **Transactional email error path** — send a transactional email whose templateData is missing
   a field the template renders (forces a render throw). The caller should get a JSON 500 (not an
   opaque CORS error), and `email_send_log` should hold a `failed` row for that `message_id`.

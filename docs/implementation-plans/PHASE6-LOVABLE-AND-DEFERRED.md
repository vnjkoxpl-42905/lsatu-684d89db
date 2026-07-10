# Phase 6 — Lovable-side + deferred work

COMPREHENSIVEAUDIT Phase 6 (hygiene + hardening). The **in-repo** work is committed and
pushed (6A gate foundation, 6B script integrity, 6C in-repo query hygiene, 6D engine specs).
This doc captures the pieces Claude Code could **not** land: prod edge-function deploys and
prod-DB RPCs (the `atrcqxpmqrynmtvvyjju` project is Lovable-managed, not MCP-reachable), plus
two items deliberately deferred to their own sessions.

> [!note] 6E update (in-repo authored, ready to deploy)
> M68, M70, and both RPC clusters below are now **authored + committed in-repo**. The migration
> and the `send-transactional-email` deploy are handed to Lovable in
> [[PHASE6-LOVABLE-DEPLOY]]. M70 was resolved fully in-repo (client-side lookup; the
> `generate-micro-drill` edge function was deleted). The sections below are kept for context; the
> deploy doc is the live handoff.

## Already done, do NOT redo

Phase 1 already deployed three of the five edge functions the Phase 6 scope note listed:
- `process-email-queue` (H20/H21 — log/DLQ integrity) — **deployed Phase 1**
- `gcal-sync-pull` (M69 — unchecked upserts) — **deployed Phase 1**
- `voice-coach-respond` (M71 — canned-reply fallback) — **deployed Phase 1**

Only the two below remain.

---

## 1. Edge-function fixes still owed (Lovable deploy)

These are Deno functions under `supabase/functions/`. The fix can be authored in-repo, but the
deploy to prod is Lovable-only. Neither was fixed in-repo this session (M70 needs a product
decision first; see below).

### M68 — `send-transactional-email`: 500 without CORS + stale `pending` rows
`supabase/functions/send-transactional-email/index.ts` (~line 324)

- (a) No try/catch around the render/subject/enqueue body of `Deno.serve`. If `renderAsync(...)`
  or `template.subject(templateData)` throws (templateData is caller-controlled), Deno returns a
  bare 500 **without corsHeaders**, so the browser caller sees an opaque CORS failure and no
  `failed` row is logged.
- (b) The `pending` `email_send_log` row (line ~342) is never terminalized; `process-email-queue`
  inserts a separate `sent`/`failed` row keyed by `message_id`, so every email leaves a stale
  `pending` row. Any status metric over-counts pending sends.

Fix: wrap render + subject + enqueue in try/catch; on throw insert a `failed` log row and return
a 500 JSON response **with corsHeaders**. Either have `process-email-queue` UPDATE the pending
row instead of inserting new rows, or document `email_send_log` as append-only-per-message and
make readers take the latest row per `message_id`. Check the pending-insert error.

### M70 — `generate-micro-drill`: returns hardcoded fake questions — DECISION NEEDED
`supabase/functions/generate-micro-drill/index.ts` (~line 29)

Ignores its inputs and returns two invented rows (`qid: 'micro-<timestamp>-1'`, `pt: 120`, ...)
that do not exist in the bank. Violates the no-fake-data rule. **Only one caller:**
`src/components/drill/VoiceCoachModal.tsx:233`.

Two clean options — **Joshua's call**:
- (a) **Implement it**: query the bank for N real questions matching qtype/difficulty, excluding
  `currentQid`, return real qids.
- (b) **Delete it** (recommended if the voice-coach micro-drill follow-up is not a real feature):
  remove the function + its config entry, and hide the entry point in `VoiceCoachModal.tsx`
  (the client already handles an empty result after Phase 4, so nothing crashes — but a dead
  button should not be shown).

Recommendation: (b) unless you want the micro-drill follow-up live. It is LLM-era scaffolding
with auth overhead and no working payload today.

---

## 2. Prod-DB RPCs to replace client-side fetch-all (Lovable migration)

Phase 6 narrowed the unbounded-query work to what is safe in-repo (BR batch insert; a bounded
`.limit()` stopgap on the inbox last-message fetch, committed in 6C). The **proper** fixes are
Postgres-side and need a migration on the prod DB.

### A. Inbox last-message RPC (H22 proper fix)
`src/hooks/useInbox.ts` currently fetches recent messages with a bounded `.limit()` stopgap
(see the STOPGAP comment there). Replace with a `SECURITY INVOKER` RPC:

```sql
create or replace function get_latest_messages(conv_ids uuid[])
returns table (conversation_id uuid, id uuid, body text, created_at timestamptz, sender_id uuid)
language sql stable security invoker as $$
  select distinct on (m.conversation_id)
         m.conversation_id, m.id, m.body, m.created_at, m.sender_id
  from messages m
  where m.conversation_id = any(conv_ids)
  order by m.conversation_id, m.created_at desc
$$;
```
Then call `supabase.rpc('get_latest_messages', { conv_ids })` and drop the `.limit()`. Keep the
returned shape `{ id, conversation_id, body, created_at, sender_id }` so the enrichment code is
unchanged. (RLS on `messages` still governs via `security invoker`.) Also either fold the
attachment-presence check into the same RPC or add a trigger-maintained `has_attachments` flag,
so the paperclip indicator is exact again.

### B. Practice / Analytics aggregate queries
`src/pages/Practice.tsx` (~line 266) and `src/pages/Analytics.tsx` (~line 72) each pull **every**
attempt row for a class and aggregate client-side. Columns are already narrowed, but the row
count is unbounded. Move the rollups server-side, e.g.:

```sql
-- Per-qtype / per-level accuracy for a class, computed in Postgres.
create or replace function attempt_accuracy_by_type(p_class_id uuid)
returns table (qtype text, level int, total bigint, correct bigint)
language sql stable security invoker as $$
  select qtype, level, count(*)::bigint,
         count(*) filter (where correct)::bigint
  from attempts where class_id = p_class_id
  group by qtype, level
$$;
```
Practice needs a lighter total/accuracy aggregate; Analytics needs the qtype×level×7d-window
rollup it currently computes in JS. Shape the RPC(s) to match what each page already derives.

---

## 3. Deferred to their own sessions (in-repo, not Lovable)

- **Drill.tsx reducer decomposition** (audit line 78): 3,539 lines, ~50 `useState`. Real
  regression surface; every state transition must be re-verified in the browser. Do it as a
  dedicated session behind a reducer, keeping diffs reviewable. Not started.
- **One-time `eslint --fix` autofix sweep** (part of 6A scope): the 38 auto-fixables. Skipped
  this session because the working tree carried heavy unrelated in-flight work and a blanket
  `--fix` entangled its edits (it strips ~25 unused `eslint-disable` directives across files
  Joshua is mid-edit on). Run `npx eslint src --fix` on a **clean** tree, review, commit.
- **`select('*')` narrowing** (audit line 76): 75 sites. High regression risk, low leverage vs
  the RPC work above. Narrow opportunistically when touching a file, not as a blanket sweep.
- **Repo-wide lint = 0 then add `npm run lint` to safe-push** (M152 tail): after H146 the count
  is 468 problems (147 errors, mostly pre-existing `no-explicit-any`). Triage to zero on product
  code, then add `npm run lint` alongside the typecheck gate. The typecheck gate is live now.

## In-flight files carrying my unstaged Phase 6 edits

Two files were edited by Phase 6 but left **unstaged** because they already carried Joshua's
uncommitted in-flight work; commit them together with that work:
- `src/lib/drillRouteState.ts` — resolved the duplicate `isGuidedDrill` identifier (the
  typecheck-gate blocker) on top of the in-flight guided-drill additions.
- `scripts/main-conclusion/import-content.ts` — M148 (drift fails the build, `ALLOW_DRIFT`
  escape), M149 (corrected header paths/CLI to the real `npx tsx ... --dry-run`, deleted dead
  `FORCE`), L155 (truthful count logs). These complete the in-flight path migration in that file.

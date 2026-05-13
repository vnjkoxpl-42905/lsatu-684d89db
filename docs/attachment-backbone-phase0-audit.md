# Attachment Backbone — Phase 0 Audit

Branch: `feat/attachment-backbone`
Scope: read-only audit of existing Gmail / Drive sync + messaging attachment infrastructure, in service of the canonical attachment model planned for Phase 1.

---

## 1. Existing Gmail sync behavior

**File:** `supabase/functions/gmail/index.ts` (357 lines)

**Gateway:** `https://connector-gateway.lovable.dev/google_mail/gmail/v1` (Lovable Connector Gateway pattern; OAuth tokens are NOT stored in LSAT U DB)

**Inbound auth:** Bearer JWT from Supabase Auth, plus `user_roles.role = 'admin'` check (lines 105–117). Non-admin callers get 403.

**Actions exposed (12 total):**

| Action | Params | Response |
|---|---|---|
| `list` / `listThreads` | `q`, `labelIds`, `maxResults`, `pageToken` | `{ threads, nextPageToken }` |
| `thread` / `getThread` | `id`, `markRead?` | `{ threadId, historyId, messages }` |
| `modifyThread` | `id`, `addLabelIds[]`, `removeLabelIds[]` | `{ thread }` |
| `trashThread` / `untrashThread` | `id` | `{ thread }` |
| `batchModify` / `batchTrash` | `ids[]`, `addLabelIds[]`, `removeLabelIds[]` | `{ results: { id, ok, error }[] }` |
| `listRecentContacts` | `maxThreads?` | `{ contacts }` (committed locally, not yet deployed) |
| `getMessage` | `id`, `format?` | `{ message }` |
| `send` | `to`, `cc?`, `bcc?`, `subject?`, `text`, `threadId?`, `inReplyTo?`, `references?` | `{ message }` |
| `listLabels` | (none) | `{ labels }` |
| `profile` | (none) | `{ emailAddress }` |

**DB writes:** none. Pure Gmail API proxy.
**Caching:** none. Every request fetches live from Gmail.
**Watch / push:** none. No `users.watch` reference anywhere.

**Frontend callers:** `src/features/admin-inbox/gmail/api/gmailClient.ts` → `supabase.functions.invoke("gmail", ...)`, fanned out by hooks under `src/features/admin-inbox/gmail/hooks/`.

---

## 2. Existing Drive sync behavior

**File:** `supabase/functions/gdrive/index.ts` (~180 lines)

**Gateway:** `https://connector-gateway.lovable.dev/google_drive/drive/v3` (same connector pattern).

**Inbound auth:** none in the edge function itself. Caller (`DrivePanel.tsx`) attaches the user's Supabase session token + `apikey` header; the Supabase Functions invocation layer enforces a valid session, but no admin role check inside the function. This is a known gap (admin-only routes guard via the page-level `is_admin` check).

**Actions exposed (4):**

| Action | Params | Response |
|---|---|---|
| `list` | `q?`, `pageToken?` | `{ files, nextPageToken }` |
| `meta` | `id` | `{ file }` |
| `formats` | `mimeType` | `{ formats }` |
| `download` | `id`, `format?` | binary stream, `Content-Disposition` header |

**DB writes:** none from the edge function. The frontend separately writes to `public.drive_files` when an admin "picks" a file in the admin UI at `src/pages/admin/DriveFiles.tsx`.

**Watch / push:** none.

**Frontend callers:**
- `src/components/inbox/DrivePanel.tsx` (browser pane, no DB writes)
- `src/pages/admin/DriveFiles.tsx` (admin picker, writes to `drive_files`)
- `src/components/inbox/DriveAttachmentPicker.tsx` (reads from `drive_files`, used by MessageComposer)

---

## 3. Existing attachment model (in detail — this is what Phase 1 replaces)

### 3.1 Tables

**`public.message_attachments`** (created in `20260416234013_*.sql`, extended in `20260421013408_*.sql`):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `message_id` | uuid NOT NULL | FK `messages(id)` ON DELETE CASCADE |
| `storage_path` | text | nullable after the extension migration |
| `file_name` | text NOT NULL | |
| `file_size` | integer NOT NULL DEFAULT 0 | (note: **integer**, not bigint; existing Drive picker hardcodes `0`) |
| `mime_type` | text NOT NULL | |
| `kind` | text | check: `IN ('storage','drive')` |
| `drive_file_id` | uuid | FK `drive_files(id)` ON DELETE SET NULL |
| `web_view_link` | text | populated for `kind='drive'` |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

Check constraint:
```
(kind = 'storage' AND storage_path IS NOT NULL)
OR (kind = 'drive' AND web_view_link IS NOT NULL)
```

**`public.drive_files`** (created in `20260420123314_create_drive_files_table.sql`):

| Column | Type |
|---|---|
| `id` | uuid PK |
| `admin_user_id` | uuid NOT NULL FK `auth.users(id)` |
| `google_file_id` | text NOT NULL |
| `file_name` | text NOT NULL |
| `mime_type` | text |
| `thumbnail_url` | text |
| `web_view_link` | text NOT NULL |
| `picked_at` | timestamptz NOT NULL |
| | UNIQUE `(admin_user_id, google_file_id)` |

This is the admin's "I picked these from Drive" catalog. The new `attachments` table will reference Drive files via `source_external_id = drive_files.google_file_id` (Drive's real id, **not** the local `drive_files.id`).

### 3.2 Storage bucket

**`message-attachments`** (private), created in `20260416234013_*.sql` lines 169–170.

Path convention: `{conversation_id}/{message_id}/{filename}`

RLS (lines 173–191):
- SELECT: `is_conversation_participant(((storage.foldername(name))[1])::uuid, auth.uid()) OR has_role(auth.uid(), 'admin')`
- INSERT: same predicate

There is no UPDATE or DELETE policy on `storage.objects` for this bucket. Deletes are not currently exposed to the UI.

**Phase 1 decision:** reuse the existing `message-attachments` bucket. Don't create `lsat-u-attachments`. Document the name in `attachment-backbone-phase0-audit.md` so future phases don't go hunting. Max file size: Supabase project default (50 MB per upload on the standard plan — not enforced in DB; client-side check belongs in MessageComposer if we want to surface a UX message).

### 3.3 RLS pattern on `message_attachments`

- SELECT: visible to thread participants OR admin
- INSERT: only by `messages.sender_id = auth.uid()` of the parent message
- UPDATE / DELETE: no policies = nobody can mutate post-insert

### 3.4 Renderer

**File:** `src/components/inbox/AttachmentCard.tsx` (116 lines)
- Switches on `attachment.kind`
- For `storage`: `supabase.storage.from('message-attachments').createSignedUrl(storage_path, 60)`
- For `drive`: opens `web_view_link` in a new tab
- Inline image preview when MIME matches `image/*`

### 3.5 Upload path

**File:** `src/components/inbox/MessageComposer.tsx` (lines 85–129)

Order:
1. INSERT `messages` row → returns `msg.id`
2. For each PDF file: `storage.upload(path, file)` then INSERT `message_attachments` (kind=storage)
3. For each Drive picker selection: INSERT `message_attachments` (kind=drive, `file_size=0` hardcoded)

**Atomicity:** none. Storage upload and DB insert are sequential and can drift if either fails. (We can't be truly atomic across Storage and DB. Phase 1 does NOT change this; we keep "Storage first, then DB; on DB failure attempt best-effort storage delete" as the documented order.)

**PDF-only constraint:** the file input filter is `accept=".pdf,application/pdf"` (line 52–54). Phase 1 does not relax this.

### 3.6 Drive picker

**File:** `src/components/inbox/DriveAttachmentPicker.tsx`
- Reads `drive_files` filtered by `admin_user_id = current admin`
- On attach, builds rows: `{ message_id, kind: 'drive', drive_file_id, web_view_link, file_name, file_size: 0, mime_type }`

---

## 4. Current OAuth / token storage pattern

**No user-facing Google OAuth tokens are stored in the LSAT U Supabase project.**

The Lovable Connector Gateway owns the OAuth handshake. Edge functions authenticate to the gateway with two static env vars:
- `LOVABLE_API_KEY`
- `GOOGLE_MAIL_API_KEY` (for Gmail) / `GOOGLE_DRIVE_API_KEY` (for Drive)

These are project-wide and not per-user. **Phase 2+ implication:** if we ever need to call Google APIs with a user-impersonated token (e.g. write-back to a student's Drive), we'd need to either go through a new connector or add direct OAuth — neither exists today.

---

## 5. Existing webhook / public callback support

**None for Drive or Gmail.**

The only webhook handler in the repo is `supabase/functions/handle-email-suppression/index.ts` (bounce/complaint webhook for SES via `@lovable.dev/webhooks-js`). That pattern is reusable shape-wise (Supabase Edge Functions are publicly addressable HTTPS endpoints), but it is not currently set up for Google push notifications.

---

## 6. Infrastructure gaps for Phase 2–5

| Need | Status | Notes |
|---|---|---|
| Verified HTTPS callback URL (Drive push notifications) | ✅ Available | Any deployed Supabase Edge Function URL works (e.g. `https://qodidbkoqrmqhdfwvcmk.supabase.co/functions/v1/drive-webhook`). Domain verification on Google Cloud Console is required before Drive will accept it as a notification target. **Currently no project is verified.** |
| Google Cloud Pub/Sub topic + subscription (Gmail watch) | ❌ Missing | Gmail's `users.watch` only posts to GCP Pub/Sub; we'd need a GCP project, a topic, a push subscription pointing at our edge function, and a service account that can sign messages. None of this exists today. |
| Background reconciliation scheduler | ⚠️ Available but unused | `pg_cron` extension is installed (`20260506124847_email_infra.sql`) for the email queue. We could schedule attachment reconciliation jobs against it. `pg_net` is also installed for outbound HTTP from triggers. |
| Realtime channels for attachments | ⚠️ Partial | `messages` / `conversations` / `conversation_participants` are added to `supabase_realtime` publication. `message_attachments` is NOT. Phase 1 should add `attachments` (the new table) to the realtime publication so the UI can react to sync status changes without polling. |
| Per-user Google OAuth tokens | ❌ Missing | Connector Gateway is the only Google auth path; no `user_oauth_tokens` table. |
| Drive watch channel lifecycle (renew on expiry, refresh on token rotation) | ❌ Missing | Drive channels expire after ~1 week and must be renewed. Needs a scheduled job + bookkeeping table. |

---

## 7. Cost risks for Phase 2–5

- **Drive watches (Phase 3).** One channel per watched resource (`files.watch` on root or per-file). Free under typical caps; expires every ~7 days and must be renewed. The cost vector is the cumulative `users.changes.list` calls when channels fire — bounded by user activity, not load.
- **Gmail watch + Pub/Sub (Phase 4).** Gmail `users.watch` itself is free, but it pushes to GCP Pub/Sub which has per-message pricing ($0.40 / million messages, free tier 10 GB/month). A noisy mailbox could generate non-trivial events. Throttle by limiting watch scope (`labelIds: ['INBOX']` only, not `CATEGORY_PERSONAL`).
- **Recurring Edge Function invocations.** Reconciliation jobs scheduled via `pg_cron + pg_net` invoke functions at the cadence we set. Stay conservative (every 6h, not every 5min) until we see real drift.
- **Storage egress.** Backfilling Drive files into our bucket would multiply storage cost. Phase 1 stops short of this: Drive attachments stay as references (`source_external_id`), no content copy.

---

## 8. Whether existing message attachments need backfill

**Yes.** Every existing `message_attachments` row must be mirrored into the new `attachments` table or the renderer (which the spec requires to read from `attachments`) will show empty threads.

### Mapping (storage rows)

| `attachments` column | `message_attachments` source |
|---|---|
| `id` | new `gen_random_uuid()` |
| `owner_user_id` | `messages.sender_id` (JOIN) |
| `student_id` | NULL (we'd need a per-conversation lookup; defer to a later cleanup pass) |
| `thread_id` | `messages.conversation_id` (JOIN) |
| `message_id` | `message_attachments.message_id` |
| `source` | `'lsat_u_upload'` |
| `source_external_id` | NULL |
| `source_url` | NULL |
| `display_name` | `file_name` |
| `mime_type` | `mime_type` |
| `size_bytes` | `file_size` (cast `integer → bigint`) |
| `version_token` | NULL |
| `checksum` | NULL |
| `last_synced_at` | `created_at` |
| `sync_status` | `'synced'` (file is in our bucket; deterministic) |
| `sync_error` | NULL |
| `visibility` | `'thread_scoped'` |
| `created_at` | `created_at` |
| `updated_at` | `created_at` |

### Mapping (drive rows)

| `attachments` column | `message_attachments` / `drive_files` source |
|---|---|
| `owner_user_id` | `messages.sender_id` |
| `thread_id` | `messages.conversation_id` |
| `message_id` | `message_attachments.message_id` |
| `source` | `'google_drive'` |
| `source_external_id` | `drive_files.google_file_id` (JOIN on `drive_file_id`) |
| `source_url` | `message_attachments.web_view_link` |
| `display_name` | `file_name` |
| `mime_type` | `mime_type` |
| `size_bytes` | `file_size` (will usually be `0` — see note below) |
| `version_token` | NULL (Drive etag not stored today) |
| `checksum` | NULL |
| `last_synced_at` | NULL |
| `sync_status` | `'needs_linking'` (we have the link but no canonical content fetch — matches Phase 1's "do not pretend live Drive sync" rule) |
| `visibility` | `'thread_scoped'` |

**Drive file_size = 0 caveat:** `DriveAttachmentPicker.tsx` hardcodes `file_size: 0` on insert. The `size_bytes` column on the new table is `bigint NOT NULL`. We accept `0` literally and document this — a Phase 2 reconciliation can fetch real sizes via `drive.files.get` metadata.

### Cutover, not dual-write

`MessageComposer.tsx` is the only writer to `message_attachments`. After Phase 1, MessageComposer writes only to the new `attachments` table (and Storage). `message_attachments` becomes a legacy read-only artifact; the table stays put for now and gets dropped in a later phase once we're confident the cutover is clean. Avoiding dual-write prevents drift.

---

## 9. Pre-Phase-1 brief confirmations (the spec's 4 items)

1. **`supabase/functions/gmail/index.ts`** is a 12-action pure proxy to Gmail via the Lovable Connector Gateway. Admin-only inbound, JWT + `user_roles.admin` check. Zero DB writes. Most-used actions: `list`, `getThread`, `send`, `modifyThread`, `trashThread`, `batchModify`. The `listRecentContacts` action is committed locally but not yet deployed (gated by `GMAIL_CONTACTS_ENABLED=false` feature flag).
2. **`supabase/functions/gdrive/index.ts`** is a 4-action pure proxy: `list`, `meta`, `formats`, `download`. No DB writes from the function. Direct fetch from `DrivePanel.tsx` (not `supabase.functions.invoke`). No admin check in the function itself — relies on Supabase Functions auth and page-level `is_admin` gating.
3. **Gmail admin tab** lives at `src/features/admin-inbox/gmail/` (Pane, Sidebar, ThreadList, ThreadRow, ReadingPane, Compose, SearchBar, Suggestions). It reads only via the edge function, never touches Supabase tables itself. Writes nothing to LSAT U DB.
4. **Message attachments** live in `public.message_attachments` (hybrid `kind ∈ {storage, drive}`), with file content in the `message-attachments` Storage bucket for `kind=storage` and `web_view_link`s for `kind=drive`. RLS uses `is_conversation_participant()` (security-definer helper) + `has_role(auth.uid(), 'admin')`. Renderer: `AttachmentCard.tsx`. Upload: `MessageComposer.tsx`. Drive picker: `DriveAttachmentPicker.tsx`.

---

## 10. Open architectural question for Joshua before Phase 1 migration

The spec says: `UNIQUE(source, source_external_id) WHERE source_external_id IS NOT NULL`.

That's a **global catalog** semantic: one Drive file = exactly one `attachments` row, regardless of how many messages reference it. Current LSAT U behavior attaches the same `drive_files.id` to many messages — each insert creates a fresh `message_attachments` row. Backfilling with the global-unique constraint would collapse those rows into one and lose per-message linkage (since `attachments.message_id` is a single column).

Two interpretations:

- **(A) Per-attach uniqueness:** `UNIQUE(source, source_external_id, message_id) WHERE source_external_id IS NOT NULL`. Idempotency is per-message: re-attaching the same Drive file to the same message is a no-op; attaching it to a different message creates a new row. Matches current behavior and the spec's idempotency intent ("Repeated upload events check existing records before insert"). Minor deviation from spec wording.
- **(B) True catalog:** spec as written, plus a new `attachment_message_links(attachment_id, message_id)` join table. Bigger refactor, more aligned with "canonical model" framing, **but the spec does not define this join table.**

**Recommendation:** option A. It honors the spec's intent (no duplicate inserts for the same external resource on the same message) without requiring a join table that the spec doesn't specify. The cost is a non-literal reading of "UNIQUE(source, source_external_id)".

**Surfacing in chat after this commit; will not write the migration until Joshua picks.**

---

## 11. Phase 1 plan (provisional, pending §10 resolution)

1. **Migration** `supabase/migrations/<timestamp>_add_attachments_canonical_model.sql`
   - Create `public.attachments` with all 19 spec columns
   - Check constraints on `source`, `sync_status`, `visibility`
   - Unique partial index on (`source`, `source_external_id`, `message_id`) — pending §10
   - `updated_at` trigger (reuses pattern from existing migrations if present, otherwise inline)
   - RLS: SELECT (participant or admin), INSERT (owner or admin), UPDATE (owner or admin), DELETE (admin only, but UI flips `sync_status='deleted_externally'` rather than deleting)
   - Backfill INSERT … SELECT from `message_attachments` (storage + drive flavors)
   - Add `attachments` to `supabase_realtime` publication
2. **MessageComposer cutover** — write to `attachments` instead of `message_attachments`
3. **AttachmentCard cutover** — read from `attachments`
4. **Hook adjustments** — `useInbox.ts` thread fetch joins `attachments` not `message_attachments`
5. **Branch push** — `git push -u origin feat/attachment-backbone`, no merge to main

---

## 12. What Phase 1 deliberately does NOT do

- No Drive content fetch (`source=google_drive` rows stay `sync_status='needs_linking'`)
- No Gmail attachment ingestion (`source=gmail_attachment` rows are not created in Phase 1 at all)
- No Drive watch / Gmail watch / Pub/Sub
- No new OAuth scope, no token storage
- No reconciliation scheduler
- No drop of `message_attachments` (kept for safety, removed in a later phase)
- No new bucket (`message-attachments` is reused as-is)

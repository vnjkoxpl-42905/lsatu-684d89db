-- Canonical attachment model for LSAT U.
--
-- Phase 1 of the attachment-backbone effort. Adds public.attachments as the
-- single source of truth for attachment metadata across:
--   - lsat_u_upload    (file lives in our message-attachments bucket)
--   - google_drive     (reference only, no content fetch yet)
--   - gmail_attachment (not produced in Phase 1; reserved for Phase 4 ingest)
--
-- Existing public.message_attachments is backfilled into this table and then
-- treated as legacy/read-only. MessageComposer is cut over to write only to
-- public.attachments. The legacy table stays put for a later phase to drop.
--
-- Storage bucket: reuses existing 'message-attachments' (see audit doc).
-- No new bucket is created.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Table
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE public.attachments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- student_id is nullable; in many threads the "student" is the conversation
  -- counterpart and can be derived from conversation_participants. We don't
  -- introduce a students table reference here because LSAT U identifies
  -- students via profiles.class_id (text), not a uuid students table. Phase 2
  -- can revisit if a stronger link is needed.
  student_id          uuid,
  -- "thread" in LSAT U is a conversation row.
  thread_id           uuid        REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id          uuid        REFERENCES public.messages(id) ON DELETE CASCADE,
  source              text        NOT NULL,
  source_external_id  text,
  source_url          text,
  display_name        text        NOT NULL,
  mime_type           text        NOT NULL,
  size_bytes          bigint      NOT NULL,
  version_token       text,
  checksum            text,
  last_synced_at      timestamptz,
  sync_status         text        NOT NULL DEFAULT 'pending',
  sync_error          text,
  visibility          text        NOT NULL DEFAULT 'thread_scoped',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT attachments_source_check CHECK (
    source IN ('lsat_u_upload', 'google_drive', 'gmail_attachment')
  ),
  CONSTRAINT attachments_sync_status_check CHECK (
    sync_status IN (
      'pending', 'synced', 'syncing', 'stale',
      'failed', 'permission_blocked', 'deleted_externally', 'needs_linking'
    )
  ),
  CONSTRAINT attachments_visibility_check CHECK (
    visibility IN ('thread_scoped', 'admin_only', 'private')
  ),
  -- Lsat U uploads have a storage object; record the path in source_url so
  -- the renderer has a single column to read. Drive rows put the webViewLink
  -- in source_url. Gmail rows (Phase 4) will put a deep link.
  CONSTRAINT attachments_source_url_present CHECK (
    (source = 'lsat_u_upload' AND source_url IS NOT NULL)
    OR (source = 'google_drive')
    OR (source = 'gmail_attachment')
  )
);

CREATE INDEX attachments_thread_idx        ON public.attachments(thread_id, created_at DESC);
CREATE INDEX attachments_message_idx       ON public.attachments(message_id);
CREATE INDEX attachments_owner_idx         ON public.attachments(owner_user_id, created_at DESC);
CREATE INDEX attachments_sync_status_idx   ON public.attachments(sync_status)
  WHERE sync_status IN ('pending', 'syncing', 'stale', 'failed', 'needs_linking');

-- Idempotency:
--   * For external sources (drive / gmail), preventing duplicate inserts of the
--     same external resource on the same message is the practical guarantee
--     we want (re-attach should be a no-op). Per-message scope keeps current
--     LSAT U semantics where the same Drive file can be attached to N
--     different messages.
--   * For lsat_u_upload (source_external_id is null) uniqueness comes from id
--     alone — the partial index excludes those rows.
CREATE UNIQUE INDEX attachments_unique_external_per_message
  ON public.attachments(source, source_external_id, message_id)
  WHERE source_external_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. updated_at trigger (reuses existing helper)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TRIGGER attachments_set_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ──────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: thread participants (via thread_id → conversation_participants)
-- see thread_scoped rows; admin sees everything; owner sees own private rows.
CREATE POLICY "Participants see thread-scoped, admin sees all, owner sees private"
ON public.attachments FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    visibility = 'thread_scoped'
    AND thread_id IS NOT NULL
    AND public.is_conversation_participant(thread_id, auth.uid())
  )
  OR (
    visibility = 'private'
    AND owner_user_id = auth.uid()
  )
);

-- INSERT: owner_user_id must be the caller, OR caller is admin.
CREATE POLICY "Owner or admin can insert attachments"
ON public.attachments FOR INSERT TO authenticated
WITH CHECK (
  owner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- UPDATE: owner or admin. Used to flip sync_status, refresh version_token,
-- and write last_synced_at as future phases come online.
CREATE POLICY "Owner or admin can update attachments"
ON public.attachments FOR UPDATE TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- DELETE: admin only. The product rule is "preserve message history; flip
-- sync_status to deleted_externally instead of deleting." UI code respects
-- that; the policy is the last-line guard against accidental wipes.
CREATE POLICY "Admin can delete attachments"
ON public.attachments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Realtime
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.attachments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Backfill from public.message_attachments
-- ──────────────────────────────────────────────────────────────────────────
--
-- Storage rows: file is in our bucket, deterministic → sync_status='synced'.
-- Drive rows:   reference only, no canonical content fetch yet → 'needs_linking'.
--
-- owner_user_id ← messages.sender_id. thread_id ← messages.conversation_id.
-- source_url for storage rows ← storage_path (renderer signs it on the fly).
-- source_url for drive rows  ← message_attachments.web_view_link.
-- size_bytes ← file_size (cast integer→bigint; drive rows are 0 today).
-- last_synced_at ← message_attachments.created_at for storage; null for drive.
--
-- ON CONFLICT DO NOTHING is a no-op for storage rows (no unique constraint on
-- them) and a guard for drive rows in case backfill is re-run.

INSERT INTO public.attachments (
  owner_user_id,
  thread_id,
  message_id,
  source,
  source_external_id,
  source_url,
  display_name,
  mime_type,
  size_bytes,
  last_synced_at,
  sync_status,
  visibility,
  created_at,
  updated_at
)
SELECT
  m.sender_id                                                      AS owner_user_id,
  m.conversation_id                                                AS thread_id,
  ma.message_id                                                    AS message_id,
  'lsat_u_upload'                                                  AS source,
  NULL                                                             AS source_external_id,
  ma.storage_path                                                  AS source_url,
  ma.file_name                                                     AS display_name,
  ma.mime_type                                                     AS mime_type,
  ma.file_size::bigint                                             AS size_bytes,
  ma.created_at                                                    AS last_synced_at,
  'synced'                                                         AS sync_status,
  'thread_scoped'                                                  AS visibility,
  ma.created_at                                                    AS created_at,
  ma.created_at                                                    AS updated_at
FROM public.message_attachments ma
JOIN public.messages m ON m.id = ma.message_id
WHERE ma.kind = 'storage'
  AND ma.storage_path IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.attachments (
  owner_user_id,
  thread_id,
  message_id,
  source,
  source_external_id,
  source_url,
  display_name,
  mime_type,
  size_bytes,
  sync_status,
  visibility,
  created_at,
  updated_at
)
SELECT
  m.sender_id                                                      AS owner_user_id,
  m.conversation_id                                                AS thread_id,
  ma.message_id                                                    AS message_id,
  'google_drive'                                                   AS source,
  df.google_file_id                                                AS source_external_id,
  ma.web_view_link                                                 AS source_url,
  ma.file_name                                                     AS display_name,
  COALESCE(ma.mime_type, 'application/vnd.google-apps.unknown')    AS mime_type,
  ma.file_size::bigint                                             AS size_bytes,
  'needs_linking'                                                  AS sync_status,
  'thread_scoped'                                                  AS visibility,
  ma.created_at                                                    AS created_at,
  ma.created_at                                                    AS updated_at
FROM public.message_attachments ma
JOIN public.messages m     ON m.id = ma.message_id
JOIN public.drive_files df ON df.id = ma.drive_file_id
WHERE ma.kind = 'drive'
  AND ma.drive_file_id IS NOT NULL
ON CONFLICT (source, source_external_id, message_id)
  WHERE source_external_id IS NOT NULL
  DO NOTHING;

-- Drive rows where the drive_files row is missing (FK was already SET NULL):
-- record what we have, leave source_external_id null so the unique index
-- doesn't apply, and mark needs_linking so a future phase can revisit.
INSERT INTO public.attachments (
  owner_user_id,
  thread_id,
  message_id,
  source,
  source_external_id,
  source_url,
  display_name,
  mime_type,
  size_bytes,
  sync_status,
  visibility,
  created_at,
  updated_at
)
SELECT
  m.sender_id,
  m.conversation_id,
  ma.message_id,
  'google_drive',
  NULL,
  ma.web_view_link,
  ma.file_name,
  COALESCE(ma.mime_type, 'application/vnd.google-apps.unknown'),
  ma.file_size::bigint,
  'needs_linking',
  'thread_scoped',
  ma.created_at,
  ma.created_at
FROM public.message_attachments ma
JOIN public.messages m ON m.id = ma.message_id
WHERE ma.kind = 'drive'
  AND ma.drive_file_id IS NULL
  AND ma.web_view_link IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Storage bucket
-- ──────────────────────────────────────────────────────────────────────────
--
-- The 'message-attachments' bucket already exists (created in
-- 20260416234013_*) with SELECT/INSERT policies keyed on the first folder
-- segment of the object path = conversation_id. We're reusing it as-is for
-- lsat_u_upload. No new bucket is created.
--
-- For visibility, the existing storage RLS is conversation-participant-scoped
-- which matches our new visibility='thread_scoped' rows. admin_only and
-- private visibilities don't require a storage object today (they're
-- catalog rows; if Phase 2+ stores private files, a separate bucket or path
-- convention should be introduced then).

-- Admin-scoped Google Drive file picker references.
-- One row per (admin, google_file_id). RLS: admin reads/writes/deletes only their own rows.
-- Page-level is_admin gate is the primary enforcer; DB enforces ownership only.

CREATE TABLE IF NOT EXISTS public.drive_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_file_id  text NOT NULL,
  file_name       text NOT NULL,
  mime_type       text,
  thumbnail_url   text,
  web_view_link   text NOT NULL,
  picked_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, google_file_id)
);

ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads own picked files"
  ON public.drive_files FOR SELECT TO authenticated
  USING (auth.uid() = admin_user_id);

CREATE POLICY "Admin inserts own picked files"
  ON public.drive_files FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Admin deletes own picked files"
  ON public.drive_files FOR DELETE TO authenticated
  USING (auth.uid() = admin_user_id);

CREATE INDEX IF NOT EXISTS drive_files_admin_picked_idx
  ON public.drive_files (admin_user_id, picked_at DESC);

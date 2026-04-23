-- AI Teaching Assistant Phase 2 (B): admin<->assistant conversation log.
-- One row per turn. The ta-chat edge function writes both admin and assistant
-- rows with the service role key. Admin-only read/write — students never see
-- TA conversations.

CREATE TABLE IF NOT EXISTS public.ta_interactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('admin','assistant')),
  message         text NOT NULL,
  draft_content   jsonb,
  draft_status    text CHECK (draft_status IS NULL OR draft_status IN ('pending','approved','rejected')),
  asset_ids       uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ta_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read TA interactions"
  ON public.ta_interactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert TA interactions"
  ON public.ta_interactions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update TA interactions"
  ON public.ta_interactions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete TA interactions"
  ON public.ta_interactions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Scan pattern: load a student's thread oldest-to-newest, cap at ~100 rows.
CREATE INDEX IF NOT EXISTS ta_interactions_student_created_idx
  ON public.ta_interactions (student_id, created_at DESC);

-- Realtime: the /admin/ta page and the Foyer widget both subscribe to INSERT
-- events on this table so conversations stay in sync across surfaces.
ALTER TABLE public.ta_interactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ta_interactions;

-- Admin corpus review for the tutor cache.
--
-- Joshua grades each reusable tutor answer 1-5, can edit it (admin_markdown
-- becomes the canonical served copy), and leave notes. Highly-rated / edited
-- rows feed back into generation as tone exemplars (see tutor-chat edge fn).

ALTER TABLE public.question_tutor_cache
  ADD COLUMN IF NOT EXISTS qtype          text,
  ADD COLUMN IF NOT EXISTS rating         smallint CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS admin_markdown text,
  ADD COLUMN IF NOT EXISTS admin_notes    text,
  ADD COLUMN IF NOT EXISTS reviewed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at    timestamptz;

-- Pull the best exemplars per (kind, qtype) fast when steering generation.
CREATE INDEX IF NOT EXISTS question_tutor_cache_rating_idx
  ON public.question_tutor_cache (kind, qtype, rating DESC);

-- Admins may grade / edit cache rows directly from the review surface.
DROP POLICY IF EXISTS "tutor_cache_update_admin" ON public.question_tutor_cache;
CREATE POLICY "tutor_cache_update_admin"
  ON public.question_tutor_cache FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

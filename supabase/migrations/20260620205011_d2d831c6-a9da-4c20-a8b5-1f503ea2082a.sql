
-- Revoke anon EXECUTE on admin-only SECURITY DEFINER search functions
REVOKE EXECUTE ON FUNCTION public.fts_lsatu_content(text, integer, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_lsatu_content(vector, integer, text[]) FROM PUBLIC, anon;

-- Tighten ta_interactions: students should only read posted/approved drafts
DROP POLICY IF EXISTS "Students read own TA interactions" ON public.ta_interactions;
CREATE POLICY "Students read own TA interactions"
  ON public.ta_interactions
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    AND (
      draft_status IS NULL
      OR draft_status = ANY (ARRAY['approved','posted'])
    )
  );

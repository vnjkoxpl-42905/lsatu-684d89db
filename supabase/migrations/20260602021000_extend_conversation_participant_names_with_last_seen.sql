-- Extend inbox participant lookup so shared messaging surfaces can show
-- lightweight online/away status without exposing the full profiles table.

CREATE OR REPLACE FUNCTION public.get_conversation_participant_names(_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  display_name text,
  is_admin boolean,
  last_seen_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.class_id::uuid AS user_id,
    p.display_name,
    public.has_role(p.class_id::uuid, 'admin') AS is_admin,
    p.last_seen_at
  FROM public.profiles p
  WHERE p.class_id::uuid = ANY(_user_ids)
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp_self
      JOIN public.conversation_participants cp_other
        ON cp_other.conversation_id = cp_self.conversation_id
      WHERE cp_self.user_id = auth.uid()
        AND cp_other.user_id = p.class_id::uuid
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_participant_names(uuid[]) TO authenticated;

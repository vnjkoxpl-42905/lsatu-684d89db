-- Expose display_name for users who share at least one conversation with the caller.
--
-- Background: RLS on `profiles` limits non-admin SELECTs to the caller's own row
-- (`class_id = auth.uid()::text`). That's the right default — we don't want any
-- authenticated user to read the whole roster. But it breaks the inbox: when a
-- student loads a thread they're a participant in, they cannot resolve the
-- admin's `display_name`, so the thread title falls back to "Conversation" and
-- the sender label above each inbound bubble is suppressed.
--
-- Fix: a narrowly-scoped SECURITY DEFINER RPC that returns (user_id,
-- display_name) only for users who share at least one conversation with the
-- caller. No other profile fields are exposed, and callers cannot query
-- arbitrary user_ids — the EXISTS gate enforces the participant relationship.
--
-- Precedent: `is_conversation_participant(_conv_id, _user_id)` uses the same
-- SECURITY DEFINER + participant-scoped pattern.

CREATE OR REPLACE FUNCTION public.get_conversation_participant_names(_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.class_id::uuid AS user_id, p.display_name
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

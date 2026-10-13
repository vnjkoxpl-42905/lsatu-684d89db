
-- session_replays
CREATE TABLE IF NOT EXISTS public.session_replays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  user_id uuid NOT NULL,
  qid text NOT NULL,
  mode text NOT NULL,
  events_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.session_replays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students insert own session replays"
  ON public.session_replays FOR INSERT TO authenticated
  WITH CHECK (class_id = (auth.uid())::text);
CREATE POLICY "Students view own session replays"
  ON public.session_replays FOR SELECT TO authenticated
  USING (class_id = (auth.uid())::text);
CREATE POLICY "Admins view all session replays"
  ON public.session_replays FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- get_or_create_joshua_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_joshua_conversation()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _student uuid := auth.uid();
  _admin   uuid;
  _conv    uuid;
BEGIN
  IF _student IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT user_id INTO _admin
    FROM public.user_roles WHERE role = 'admin'
    ORDER BY user_id LIMIT 1;
  IF _admin IS NULL THEN RAISE EXCEPTION 'no admin configured'; END IF;

  SELECT cp1.conversation_id INTO _conv
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2
    ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.user_id = _student AND cp2.user_id = _admin
  LIMIT 1;

  IF _conv IS NOT NULL THEN
    RETURN _conv::text;
  END IF;

  INSERT INTO public.conversations (created_by) VALUES (_admin) RETURNING id INTO _conv;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (_conv, _admin), (_conv, _student);

  RETURN _conv::text;
END;
$$;

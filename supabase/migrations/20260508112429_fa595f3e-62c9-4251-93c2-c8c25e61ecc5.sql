-- Operator chat: persistent history for the AI Teaching Assistant

CREATE TABLE IF NOT EXISTS public.operator_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_conversations_admin
  ON public.operator_conversations(admin_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.operator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.operator_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content TEXT,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_messages_conv
  ON public.operator_messages(conversation_id, created_at);

ALTER TABLE public.operator_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_messages ENABLE ROW LEVEL SECURITY;

-- Admins manage their own conversations
CREATE POLICY "operator_conv_admin_select"
  ON public.operator_conversations FOR SELECT
  USING (public.has_role(auth.uid(),'admin') AND admin_id = auth.uid());

CREATE POLICY "operator_conv_admin_insert"
  ON public.operator_conversations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') AND admin_id = auth.uid());

CREATE POLICY "operator_conv_admin_update"
  ON public.operator_conversations FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') AND admin_id = auth.uid());

CREATE POLICY "operator_conv_admin_delete"
  ON public.operator_conversations FOR DELETE
  USING (public.has_role(auth.uid(),'admin') AND admin_id = auth.uid());

-- Messages inherit access from parent conversation
CREATE POLICY "operator_msg_admin_select"
  ON public.operator_messages FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin') AND EXISTS (
      SELECT 1 FROM public.operator_conversations c
      WHERE c.id = conversation_id AND c.admin_id = auth.uid()
    )
  );

CREATE POLICY "operator_msg_admin_insert"
  ON public.operator_messages FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(),'admin') AND EXISTS (
      SELECT 1 FROM public.operator_conversations c
      WHERE c.id = conversation_id AND c.admin_id = auth.uid()
    )
  );

CREATE POLICY "operator_msg_admin_delete"
  ON public.operator_messages FOR DELETE
  USING (
    public.has_role(auth.uid(),'admin') AND EXISTS (
      SELECT 1 FROM public.operator_conversations c
      WHERE c.id = conversation_id AND c.admin_id = auth.uid()
    )
  );

-- Bump conversation updated_at when a new message arrives
CREATE OR REPLACE FUNCTION public.bump_operator_conversation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.operator_conversations
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_operator_msg_bump ON public.operator_messages;
CREATE TRIGGER trg_operator_msg_bump
  AFTER INSERT ON public.operator_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_operator_conversation_updated_at();
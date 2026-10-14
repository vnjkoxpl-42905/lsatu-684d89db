
CREATE TABLE public.messenger_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id TEXT NOT NULL,
  psid TEXT NOT NULL,
  user_name TEXT,
  profile_pic TEXT,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, psid)
);

CREATE INDEX idx_messenger_conversations_last_message_at
  ON public.messenger_conversations (last_message_at DESC);

CREATE TABLE public.messenger_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.messenger_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  mid TEXT,
  text TEXT,
  attachments JSONB,
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messenger_messages_conv_created
  ON public.messenger_messages (conversation_id, created_at);

ALTER TABLE public.messenger_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage messenger conversations"
  ON public.messenger_conversations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage messenger messages"
  ON public.messenger_messages
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_messenger_conversations_updated_at
  BEFORE UPDATE ON public.messenger_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_messages;

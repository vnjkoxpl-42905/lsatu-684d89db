CREATE TABLE public.tutor_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  qid text NOT NULL,
  session_id text,
  pt integer,
  section integer,
  qnum integer,
  qtype text,
  user_answer text,
  correct_answer text,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  mode text DEFAULT 'post-answer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_conversations_user_qid ON public.tutor_conversations(user_id, qid, created_at);

ALTER TABLE public.tutor_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tutor conversations"
ON public.tutor_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tutor conversations"
ON public.tutor_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tutor conversations"
ON public.tutor_conversations FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
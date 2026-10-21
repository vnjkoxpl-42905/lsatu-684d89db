CREATE TABLE public.teacher_todo_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_kind text NOT NULL,
  source_id text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, source_kind, source_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_todo_dismissals TO authenticated;
GRANT ALL ON public.teacher_todo_dismissals TO service_role;

ALTER TABLE public.teacher_todo_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own todo dismissals"
ON public.teacher_todo_dismissals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid());

CREATE INDEX idx_teacher_todo_dismissals_admin
ON public.teacher_todo_dismissals(admin_user_id, source_kind, source_id);

CREATE INDEX idx_teacher_todo_dismissals_expiry
ON public.teacher_todo_dismissals(expires_at)
WHERE expires_at IS NOT NULL;
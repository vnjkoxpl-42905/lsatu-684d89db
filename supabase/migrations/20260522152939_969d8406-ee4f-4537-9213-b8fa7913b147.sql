CREATE TABLE public.teacher_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'general' CHECK (template_type IN ('general','message','email')),
  subject TEXT,
  body TEXT NOT NULL,
  placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_message_templates_owner ON public.teacher_message_templates(owner_id);

ALTER TABLE public.teacher_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their templates"
  ON public.teacher_message_templates FOR SELECT
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can insert their templates"
  ON public.teacher_message_templates FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their templates"
  ON public.teacher_message_templates FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their templates"
  ON public.teacher_message_templates FOR DELETE
  USING (auth.uid() = owner_id);

CREATE TRIGGER update_teacher_message_templates_updated_at
  BEFORE UPDATE ON public.teacher_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
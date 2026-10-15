CREATE TABLE public.lr_preptests (
  preptest INTEGER PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lr_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preptest INTEGER NOT NULL REFERENCES public.lr_preptests(preptest) ON DELETE CASCADE,
  section INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (preptest, section)
);

CREATE TABLE public.lr_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.lr_sections(id) ON DELETE CASCADE,
  qid TEXT NOT NULL UNIQUE,
  preptest INTEGER NOT NULL,
  section INTEGER NOT NULL,
  question_number INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  stimulus TEXT NOT NULL,
  prompt TEXT NOT NULL,
  source_note TEXT,
  is_explained BOOLEAN NOT NULL DEFAULT false,
  correct_choice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (preptest, section, question_number)
);

CREATE TABLE public.lr_answer_choices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.lr_questions(id) ON DELETE CASCADE,
  letter TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  tag TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  student_percent INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, letter)
);

CREATE TABLE public.lr_explanations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.lr_questions(id) ON DELETE CASCADE,
  style TEXT NOT NULL CHECK (style IN ('single','standard','brief','another_way')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, style)
);

CREATE TABLE public.lr_explanation_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  explanation_id UUID NOT NULL REFERENCES public.lr_explanations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (explanation_id, position)
);

CREATE TABLE public.lr_explanation_choice_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  explanation_id UUID NOT NULL REFERENCES public.lr_explanations(id) ON DELETE CASCADE,
  letter TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (explanation_id, letter)
);

CREATE INDEX idx_lr_questions_type ON public.lr_questions (question_type);
CREATE INDEX idx_lr_questions_explained ON public.lr_questions (is_explained);
CREATE INDEX idx_lr_answer_choices_question ON public.lr_answer_choices (question_id);
CREATE INDEX idx_lr_explanations_question ON public.lr_explanations (question_id);
CREATE INDEX idx_lr_explanation_steps_explanation ON public.lr_explanation_steps (explanation_id);
CREATE INDEX idx_lr_explanation_choice_notes_explanation ON public.lr_explanation_choice_notes (explanation_id);
CREATE INDEX idx_lr_questions_stimulus_fts ON public.lr_questions USING gin (to_tsvector('english', stimulus));

GRANT SELECT ON public.lr_preptests TO authenticated;
GRANT SELECT ON public.lr_sections TO authenticated;
GRANT SELECT ON public.lr_questions TO authenticated;
GRANT SELECT ON public.lr_answer_choices TO authenticated;
GRANT SELECT ON public.lr_explanations TO authenticated;
GRANT SELECT ON public.lr_explanation_steps TO authenticated;
GRANT SELECT ON public.lr_explanation_choice_notes TO authenticated;
GRANT ALL ON public.lr_preptests TO service_role;
GRANT ALL ON public.lr_sections TO service_role;
GRANT ALL ON public.lr_questions TO service_role;
GRANT ALL ON public.lr_answer_choices TO service_role;
GRANT ALL ON public.lr_explanations TO service_role;
GRANT ALL ON public.lr_explanation_steps TO service_role;
GRANT ALL ON public.lr_explanation_choice_notes TO service_role;

ALTER TABLE public.lr_preptests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lr_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lr_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lr_answer_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lr_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lr_explanation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lr_explanation_choice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read lr_preptests" ON public.lr_preptests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read lr_sections" ON public.lr_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read lr_questions" ON public.lr_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read lr_answer_choices" ON public.lr_answer_choices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read lr_explanations" ON public.lr_explanations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read lr_explanation_steps" ON public.lr_explanation_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read lr_explanation_choice_notes" ON public.lr_explanation_choice_notes FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_lr_preptests_updated_at BEFORE UPDATE ON public.lr_preptests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lr_sections_updated_at BEFORE UPDATE ON public.lr_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lr_questions_updated_at BEFORE UPDATE ON public.lr_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lr_answer_choices_updated_at BEFORE UPDATE ON public.lr_answer_choices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lr_explanations_updated_at BEFORE UPDATE ON public.lr_explanations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
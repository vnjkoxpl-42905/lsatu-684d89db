-- Extend homework_sets to support reusable guided drill instruction cards.
-- A guided set is a homework_set with is_guided_set=true that carries
-- pre-start instructional content (typically a 2-column markdown card) plus
-- pedagogical metadata (question type, reasoning type, source PTs, difficulty
-- band, estimated time). All existing homework_sets continue to work unchanged.

ALTER TABLE public.homework_sets
  ADD COLUMN IF NOT EXISTS is_guided_set         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instructions_markdown text,
  ADD COLUMN IF NOT EXISTS instruction_layout    text CHECK (instruction_layout IN ('two_column','single_column')),
  ADD COLUMN IF NOT EXISTS guided_set_type       text,
  ADD COLUMN IF NOT EXISTS question_type         text,
  ADD COLUMN IF NOT EXISTS reasoning_type        text,
  ADD COLUMN IF NOT EXISTS question_feature      text,
  ADD COLUMN IF NOT EXISTS estimated_minutes     integer,
  ADD COLUMN IF NOT EXISTS source_pts            text[],
  ADD COLUMN IF NOT EXISTS difficulty_min        integer CHECK (difficulty_min BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS difficulty_max        integer CHECK (difficulty_max BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS start_button_label    text DEFAULT 'Start';

CREATE INDEX IF NOT EXISTS homework_sets_guided_idx
  ON public.homework_sets (is_guided_set) WHERE is_guided_set = true;

-- Students need to read the parent homework_set when opening an assignment so
-- the guided drill instruction card can render. Restrict to sets the student
-- has actually been assigned (via homework_assignments.set_id).
DROP POLICY IF EXISTS "Students read homework sets they're assigned to"
  ON public.homework_sets;
CREATE POLICY "Students read homework sets they're assigned to"
  ON public.homework_sets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.homework_assignments ha
      WHERE ha.set_id = public.homework_sets.id
        AND ha.student_id = auth.uid()
    )
  );

-- TA discovery RPC. Returns guided sets matching a free-text query so the
-- ta-chat edge function can include them when drafting assignment proposals.
CREATE OR REPLACE FUNCTION public.search_guided_drill_sets(q text, max_rows int DEFAULT 10)
RETURNS TABLE (
  id                    uuid,
  title                 text,
  description           text,
  question_type         text,
  reasoning_type        text,
  question_feature      text,
  guided_set_type       text,
  estimated_minutes     integer,
  difficulty_min        integer,
  difficulty_max        integer,
  question_count        integer,
  instructions_excerpt  text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    hs.id,
    hs.title,
    hs.description,
    hs.question_type,
    hs.reasoning_type,
    hs.question_feature,
    hs.guided_set_type,
    hs.estimated_minutes,
    hs.difficulty_min,
    hs.difficulty_max,
    coalesce(array_length(hs.question_qids, 1), 0)::int AS question_count,
    left(coalesce(hs.instructions_markdown, ''), 400) AS instructions_excerpt
  FROM public.homework_sets hs
  WHERE hs.is_guided_set = true
    AND (
      q IS NULL OR q = '' OR
      hs.title ILIKE '%' || q || '%' OR
      hs.description ILIKE '%' || q || '%' OR
      hs.question_type ILIKE '%' || q || '%' OR
      hs.reasoning_type ILIKE '%' || q || '%' OR
      hs.question_feature ILIKE '%' || q || '%' OR
      hs.guided_set_type ILIKE '%' || q || '%'
    )
  ORDER BY hs.updated_at DESC
  LIMIT max_rows;
$$;

GRANT EXECUTE ON FUNCTION public.search_guided_drill_sets(text, int) TO authenticated;

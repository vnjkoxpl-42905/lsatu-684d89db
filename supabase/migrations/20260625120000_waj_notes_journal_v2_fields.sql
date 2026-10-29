-- Wrong Answer Journal v2: extend wrong_answer_journal_notes with the
-- LSAT-Journal-style structured review fields, the student's self-rating,
-- the chosen wrong answer, freehand annotation strokes, and a generated title.
--
-- All additive + nullable, so existing rows are untouched and the change is
-- reversible. Keeps existing columns (root_cause, trap_pattern, student_note,
-- next_action, review_status, reattempt_due_at) for back-compat.

ALTER TABLE public.wrong_answer_journal_notes
  ADD COLUMN IF NOT EXISTS self_rating       text
    CHECK (self_rating IN ('correct', 'unsure', 'wrong')),
  ADD COLUMN IF NOT EXISTS date_taken         date,
  ADD COLUMN IF NOT EXISTS question_summary  text,
  ADD COLUMN IF NOT EXISTS wrong_answer       text,
  ADD COLUMN IF NOT EXISTS wrong_reasoning    text,
  ADD COLUMN IF NOT EXISTS correct_reasoning  text,
  ADD COLUMN IF NOT EXISTS lesson             text,
  ADD COLUMN IF NOT EXISTS other_notes        text,
  ADD COLUMN IF NOT EXISTS annotations        jsonb,
  ADD COLUMN IF NOT EXISTS title              text;

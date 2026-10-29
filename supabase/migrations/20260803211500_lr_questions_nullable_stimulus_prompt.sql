-- Video-only LR questions have no authored stimulus or prompt.
--
-- LSAT Lab publishes 14 questions (across PT143 and PT146) with a video
-- explanation and no written one. The corpus records them honestly:
-- is_explained = false, correct_choice set, stimulus and prompt absent.
-- NOT NULL forced a choice between inventing question text and dropping the
-- rows, so the constraint goes instead. NULL is the correct encoding of
-- "no such content exists".
--
-- Safe by construction: dropping NOT NULL rewrites no rows, and no read path
-- selects these two columns (src/hooks/useLrExplanation.ts pulls id, preptest,
-- section, question_number, question_type, correct_choice only).
ALTER TABLE public.lr_questions ALTER COLUMN stimulus DROP NOT NULL;
ALTER TABLE public.lr_questions ALTER COLUMN prompt DROP NOT NULL;

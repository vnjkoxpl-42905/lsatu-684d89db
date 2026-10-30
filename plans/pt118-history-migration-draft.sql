-- PT118 Section 1 legacy identity repair DRAFT. Do not execute until live
-- record provenance and uniqueness collisions have been reviewed. If those
-- checks pass, deploy through Lovable before publishing the corrected app.
-- The historical app stored the
-- content of official Q6..Q26 under Q5..Q25, respectively. Historical Q26 is
-- a duplicate of official Q26 and remains untouched for manual adjudication.
-- This migration does not modify lr_questions or any Section 3 history.
-- Admin-authored templates, assignment snapshots, tutor caches, and teaching
-- notes require provenance review and are intentionally outside this migration.
-- This draft also does not repair PT118 S2 Q1/Q5 historical grading or JSONB
-- session queues; those dependencies must be resolved before any execution.
--
-- Preflight evidence is emitted as NOTICE counts, then all affected tables are
-- locked and uniqueness collisions abort the entire transaction. In particular,
-- a student with both old Q25 and old Q26 in a unique-key table requires manual
-- adjudication. Do not delete either history row to force this migration through.
BEGIN;

CREATE TEMP TABLE pt118_s1_remap (
  old_qid text PRIMARY KEY,
  new_qid text UNIQUE NOT NULL,
  new_qnum integer NOT NULL,
  answer text NOT NULL,
  difficulty integer NOT NULL
) ON COMMIT DROP;

INSERT INTO pt118_s1_remap VALUES
  ('PT118-S1-Q5','PT118-S1-Q6',6,'D',3),
  ('PT118-S1-Q6','PT118-S1-Q7',7,'B',4),
  ('PT118-S1-Q7','PT118-S1-Q8',8,'A',2),
  ('PT118-S1-Q8','PT118-S1-Q9',9,'E',2),
  ('PT118-S1-Q9','PT118-S1-Q10',10,'A',2),
  ('PT118-S1-Q10','PT118-S1-Q11',11,'C',2),
  ('PT118-S1-Q11','PT118-S1-Q12',12,'C',2),
  ('PT118-S1-Q12','PT118-S1-Q13',13,'E',3),
  ('PT118-S1-Q13','PT118-S1-Q14',14,'E',2),
  ('PT118-S1-Q14','PT118-S1-Q15',15,'E',3),
  ('PT118-S1-Q15','PT118-S1-Q16',16,'C',3),
  ('PT118-S1-Q16','PT118-S1-Q17',17,'B',2),
  ('PT118-S1-Q17','PT118-S1-Q18',18,'D',3),
  ('PT118-S1-Q18','PT118-S1-Q19',19,'A',3),
  ('PT118-S1-Q19','PT118-S1-Q20',20,'D',3),
  ('PT118-S1-Q20','PT118-S1-Q21',21,'A',4),
  ('PT118-S1-Q21','PT118-S1-Q22',22,'E',3),
  ('PT118-S1-Q22','PT118-S1-Q23',23,'C',4),
  ('PT118-S1-Q23','PT118-S1-Q24',24,'B',3),
  ('PT118-S1-Q24','PT118-S1-Q25',25,'C',3),
  ('PT118-S1-Q25','PT118-S1-Q26',26,'E',3);

LOCK TABLE public.attempts, public.question_views, public.session_replays,
  public.question_exposures, public.wrong_answer_journal,
  public.wrong_answer_journal_notes, public.question_usage,
  public.user_saved_sets, public.flagged_questions, public.sessions
  IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  table_name text;
  count_rows bigint;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'attempts','question_views','session_replays','wrong_answer_journal',
    'wrong_answer_journal_notes','question_usage','flagged_questions'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I t JOIN pt118_s1_remap m ON t.qid = m.old_qid', table_name)
      INTO count_rows;
    RAISE NOTICE 'PT118 S1 legacy rows in %: %', table_name, count_rows;
  END LOOP;
  SELECT count(*) INTO count_rows FROM public.question_exposures e
    JOIN pt118_s1_remap m ON e.question_id = m.old_qid;
  RAISE NOTICE 'PT118 S1 legacy rows in question_exposures: %', count_rows;
  SELECT count(*) INTO count_rows FROM public.attempts a
    JOIN pt118_s1_remap m ON a.qid = m.old_qid
    WHERE a.selected_answer IS NULL;
  RAISE NOTICE 'PT118 S1 attempts without selected_answer (correct remains historical): %', count_rows;
  SELECT count(*) INTO count_rows FROM public.user_saved_sets s
    WHERE s.question_ids && (SELECT array_agg(old_qid) FROM pt118_s1_remap);
  RAISE NOTICE 'PT118 S1 affected user_saved_sets: %', count_rows;
  SELECT count(*) INTO count_rows FROM public.sessions s
    JOIN pt118_s1_remap m ON s.current_qid = m.old_qid;
  RAISE NOTICE 'PT118 S1 affected sessions.current_qid: %', count_rows;

  IF EXISTS (
    SELECT 1 FROM public.attempts a JOIN pt118_s1_remap m ON a.qid = m.old_qid
    WHERE a.pt <> 118 OR a.section <> 1
  ) OR EXISTS (
    SELECT 1 FROM public.wrong_answer_journal w JOIN pt118_s1_remap m ON w.qid = m.old_qid
    WHERE w.pt <> 118 OR w.section <> 1
  ) OR EXISTS (
    SELECT 1 FROM public.flagged_questions f JOIN pt118_s1_remap m ON f.qid = m.old_qid
    WHERE f.pt <> 118 OR f.section <> 1
  ) THEN
    RAISE EXCEPTION 'PT118 S1 QID conflicts with pt/section columns; inspect inconsistent historical rows';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wrong_answer_journal WHERE left(qid, length('__pt118_s1_remap__')) = '__pt118_s1_remap__'
  ) OR EXISTS (
    SELECT 1 FROM public.question_usage WHERE left(qid, length('__pt118_s1_remap__')) = '__pt118_s1_remap__'
  ) OR EXISTS (
    SELECT 1 FROM public.wrong_answer_journal_notes WHERE left(qid, length('__pt118_s1_remap__')) = '__pt118_s1_remap__'
  ) OR EXISTS (
    SELECT 1 FROM public.flagged_questions WHERE left(qid, length('__pt118_s1_remap__')) = '__pt118_s1_remap__'
  ) THEN
    RAISE EXCEPTION 'PT118 S1 temporary migration QID prefix already exists';
  END IF;

  -- Only old Q26 is outside the source set but inside its destination set.
  IF EXISTS (
    SELECT 1 FROM public.wrong_answer_journal old
    JOIN public.wrong_answer_journal target
      ON target.class_id = old.class_id AND target.qid = 'PT118-S1-Q26'
    WHERE old.qid = 'PT118-S1-Q25'
  ) OR EXISTS (
    SELECT 1 FROM public.question_usage old
    JOIN public.question_usage target
      ON target.class_id = old.class_id AND target.mode = old.mode
      AND target.qid = 'PT118-S1-Q26'
    WHERE old.qid = 'PT118-S1-Q25'
  ) OR EXISTS (
    SELECT 1 FROM public.wrong_answer_journal_notes old
    JOIN public.wrong_answer_journal_notes target
      ON target.user_id = old.user_id AND target.class_id = old.class_id
      AND target.qid = 'PT118-S1-Q26'
    WHERE old.qid = 'PT118-S1-Q25'
  ) OR EXISTS (
    SELECT 1 FROM public.flagged_questions old
    JOIN public.flagged_questions target
      ON target.class_id = old.class_id AND target.qid = 'PT118-S1-Q26'
    WHERE old.qid = 'PT118-S1-Q25'
  ) THEN
    RAISE EXCEPTION 'PT118 S1 Q25 to Q26 collides with duplicate Q26 history; adjudicate before deploy';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_saved_sets WHERE question_ids @> ARRAY['PT118-S1-Q25','PT118-S1-Q26']::text[]
  ) THEN
    RAISE EXCEPTION 'PT118 S1 Q25/Q26 both occur in a saved array; adjudicate duplicate content before deploy';
  END IF;
END $$;

UPDATE public.attempts a SET
  qid = m.new_qid, qnum = m.new_qnum, level = m.difficulty,
  correct = CASE WHEN a.selected_answer IS NULL THEN a.correct
                 ELSE upper(a.selected_answer) = m.answer END
FROM pt118_s1_remap m WHERE a.qid = m.old_qid AND a.pt = 118 AND a.section = 1;

UPDATE public.wrong_answer_journal w SET
  qid = '__pt118_s1_remap__' || w.qid,
  qnum = m.new_qnum, level = m.difficulty
FROM pt118_s1_remap m WHERE w.qid = m.old_qid AND w.pt = 118 AND w.section = 1;
UPDATE public.wrong_answer_journal w SET qid = m.new_qid
FROM pt118_s1_remap m WHERE w.qid = '__pt118_s1_remap__' || m.old_qid;

UPDATE public.question_usage u SET qid = '__pt118_s1_remap__' || u.qid
FROM pt118_s1_remap m WHERE u.qid = m.old_qid;
UPDATE public.question_usage u SET qid = m.new_qid
FROM pt118_s1_remap m WHERE u.qid = '__pt118_s1_remap__' || m.old_qid;

UPDATE public.wrong_answer_journal_notes n SET qid = '__pt118_s1_remap__' || n.qid
FROM pt118_s1_remap m WHERE n.qid = m.old_qid;
UPDATE public.wrong_answer_journal_notes n SET qid = m.new_qid
FROM pt118_s1_remap m WHERE n.qid = '__pt118_s1_remap__' || m.old_qid;

UPDATE public.flagged_questions f SET
  qid = '__pt118_s1_remap__' || f.qid, qnum = m.new_qnum
FROM pt118_s1_remap m WHERE f.qid = m.old_qid AND f.pt = 118 AND f.section = 1;
UPDATE public.flagged_questions f SET qid = m.new_qid
FROM pt118_s1_remap m WHERE f.qid = '__pt118_s1_remap__' || m.old_qid;

UPDATE public.question_views v SET qid = m.new_qid
FROM pt118_s1_remap m WHERE v.qid = m.old_qid;
UPDATE public.session_replays r SET qid = m.new_qid
FROM pt118_s1_remap m WHERE r.qid = m.old_qid;
UPDATE public.question_exposures e SET question_id = m.new_qid
FROM pt118_s1_remap m WHERE e.question_id = m.old_qid;
UPDATE public.sessions s SET current_qid = m.new_qid
FROM pt118_s1_remap m WHERE s.current_qid = m.old_qid;

UPDATE public.user_saved_sets s SET question_ids = (
  SELECT array_agg(coalesce(m.new_qid, q.qid) ORDER BY q.ordinality)
  FROM unnest(s.question_ids) WITH ORDINALITY AS q(qid, ordinality)
  LEFT JOIN pt118_s1_remap m ON m.old_qid = q.qid
) WHERE s.question_ids && (SELECT array_agg(old_qid) FROM pt118_s1_remap);

COMMIT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.profiles.archived_at IS
  'Set when a student is archived: access revoked, sign-in banned, records kept. NULL means active.';

CREATE INDEX IF NOT EXISTS profiles_archived_at_idx
  ON public.profiles (archived_at) WHERE archived_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.purge_student_account_data(p_class_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  targets text[][] := ARRAY[
    ['abstract_drill_attempts','user_id'],
    ['abstract_final_set','user_id'],
    ['abstract_gauntlet_attempts','user_id'],
    ['abstract_lesson_progress','user_id'],
    ['abstract_translator_attempts','user_id'],
    ['achievements','class_id'],
    ['user_achievements','class_id'],
    ['activity_section_grades','student_id'],
    ['ai_ta_drafts','class_id'],
    ['attempts','class_id'],
    ['blind_review_sessions','class_id'],
    ['conversation_participants','user_id'],
    ['cs_attempts','user_id'],
    ['daily_stats','class_id'],
    ['drill_templates','class_id'],
    ['events','class_id'],
    ['external_work_uploads','student_id'],
    ['flagged_questions','class_id'],
    ['guided_drill_assignments','student_id'],
    ['question_usage','class_id'],
    ['question_views','class_id'],
    ['rc_lesson_progress','user_id'],
    ['section_history','class_id'],
    ['session_replays','class_id'],
    ['sessions','class_id'],
    ['settings','class_id'],
    ['smartboard_sessions','student_id'],
    ['student_analytics_sources','student_id'],
    ['students','class_id'],
    ['tutor_conversations','user_id'],
    ['voice_coaching_sessions','class_id'],
    ['weekly_plan_items','student_id'],
    ['weekly_plans','student_id'],
    ['wrong_answer_journal','class_id'],
    ['wrong_answer_journal_notes','class_id'],
    ['homework_assignments','class_id'],
    ['classroom_items','class_id'],
    ['activity_assignments','class_id'],
    ['profiles','class_id']
  ];
  i int;
  tbl text;
  col text;
  coltype text;
BEGIN
  IF p_class_id IS NULL THEN
    RAISE EXCEPTION 'purge_student_account_data: class_id is required';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_class_id) THEN
    RAISE EXCEPTION 'purge_student_account_data: account % still exists', p_class_id;
  END IF;

  FOR i IN 1 .. array_length(targets, 1) LOOP
    tbl := targets[i][1];
    col := targets[i][2];

    IF to_regclass('public.' || tbl) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT data_type INTO coltype
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = tbl AND column_name = col;

    IF coltype IS NULL THEN
      CONTINUE;
    END IF;

    IF coltype = 'text' THEN
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', tbl, col) USING p_class_id::text;
    ELSE
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', tbl, col) USING p_class_id;
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_student_account_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_student_account_data(uuid) TO service_role;
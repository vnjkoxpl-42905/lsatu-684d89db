
-- 1. Extend profile guard to cover newer access flags
CREATE OR REPLACE FUNCTION public.guard_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.has_bootcamp_access  IS DISTINCT FROM OLD.has_bootcamp_access  OR
     NEW.has_classroom_access IS DISTINCT FROM OLD.has_classroom_access OR
     NEW.has_analytics_access IS DISTINCT FROM OLD.has_analytics_access OR
     NEW.has_schedule_access  IS DISTINCT FROM OLD.has_schedule_access  OR
     NEW.has_practice_access  IS DISTINCT FROM OLD.has_practice_access  OR
     NEW.has_drill_access     IS DISTINCT FROM OLD.has_drill_access     OR
     NEW.has_waj_access       IS DISTINCT FROM OLD.has_waj_access       OR
     NEW.has_journal_access   IS DISTINCT FROM OLD.has_journal_access   OR
     NEW.has_flagged_access   IS DISTINCT FROM OLD.has_flagged_access   OR
     NEW.has_chat_access      IS DISTINCT FROM OLD.has_chat_access      OR
     NEW.has_export_access    IS DISTINCT FROM OLD.has_export_access    OR
     NEW.has_ta_access        IS DISTINCT FROM OLD.has_ta_access        OR
     NEW.class_id             IS DISTINCT FROM OLD.class_id             THEN
    RAISE EXCEPTION 'profiles: access flags and class_id are admin-controlled';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Replace the student UPDATE policy on profiles with a column-scoped one
-- so students cannot even submit access-flag columns in an UPDATE statement.
DROP POLICY IF EXISTS "Students can update own profile" ON public.profiles;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  overall_answered, overall_correct, overall_avg_ms,
  by_qtype_json, by_level_json,
  streak_current, xp_total, daily_goal_streak,
  updated_at, last_practice_date, longest_streak,
  daily_goal_questions, level, display_name, has_seen_tour, last_seen_at
) ON public.profiles TO authenticated;

CREATE POLICY "Students can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (class_id = (auth.uid())::text)
WITH CHECK (class_id = (auth.uid())::text);

-- 3. students table: revoke client read on hash columns
REVOKE SELECT ON public.students FROM authenticated;
GRANT SELECT (
  id, class_id, student_label, created_at, last_active_at, schema_version, user_id
) ON public.students TO authenticated;

-- 4. ai_ta_drafts: allow students to read approved/posted drafts addressed to them
CREATE POLICY "Students can view their posted drafts"
ON public.ai_ta_drafts
FOR SELECT
TO authenticated
USING (student_id = auth.uid() AND status IN ('approved','posted'));

-- 5. message_attachments: explicit admin-only UPDATE policy (records are otherwise immutable)
CREATE POLICY "Admins can update attachments"
ON public.message_attachments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

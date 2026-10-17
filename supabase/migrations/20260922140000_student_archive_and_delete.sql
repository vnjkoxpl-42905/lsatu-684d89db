-- Two ways to remove a student from the People page.
--
-- Archive is the everyday one: access off, hidden from the list, every record
-- kept, reversible. It is a profiles column, not a deletion.
--
-- Hard delete removes the auth user, which cascades to roughly sixty tables.
-- Two things must outlive it: Joshua's own session records, and the payment
-- and booking history. The booking tables already snapshot email and name, so
-- they read fine once detached. student_sessions did not: student_id was NOT
-- NULL and cascaded, so deleting a student destroyed the teaching record of
-- sessions he taught. That is his work product, not theirs.

-- ── Archive ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_reason text;

COMMENT ON COLUMN public.profiles.archived_at IS
  'Set when a student is archived: access revoked, hidden from the People list, records kept. NULL means active.';

CREATE INDEX IF NOT EXISTS profiles_archived_at_idx
  ON public.profiles (archived_at) WHERE archived_at IS NOT NULL;

-- Archiving is an admin act, like the access flags, so students cannot clear
-- it on their own row through the "Students can update own profile" policy.
CREATE OR REPLACE FUNCTION public.guard_profile_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
     NEW.has_activity_access  IS DISTINCT FROM OLD.has_activity_access  OR
     NEW.archived_at          IS DISTINCT FROM OLD.archived_at          OR
     NEW.archived_reason      IS DISTINCT FROM OLD.archived_reason      OR
     NEW.proficiency_level    IS DISTINCT FROM OLD.proficiency_level    OR
     NEW.class_id             IS DISTINCT FROM OLD.class_id             THEN
    RAISE EXCEPTION 'profiles: access flags, archive state, proficiency_level and class_id are admin-controlled';
  END IF;

  RETURN NEW;
END;
$function$;

-- ── Who was deleted ──────────────────────────────────────────────────────
-- The surviving rows keep the old uuid in former_student_id, which is a plain
-- column and not a foreign key. This table is what makes that uuid readable
-- again, so a detached session or payment still has a name on it.
CREATE TABLE IF NOT EXISTS public.deleted_students (
  user_id      uuid PRIMARY KEY,
  email        text,
  display_name text,
  deleted_at   timestamptz NOT NULL DEFAULT now(),
  deleted_by   uuid,
  note         text
);

ALTER TABLE public.deleted_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view deleted students" ON public.deleted_students;
CREATE POLICY "Admins can view deleted students"
  ON public.deleted_students FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ── Keep the session record ──────────────────────────────────────────────
ALTER TABLE public.student_sessions
  ADD COLUMN IF NOT EXISTS former_student_id uuid;

ALTER TABLE public.student_sessions ALTER COLUMN student_id DROP NOT NULL;

DO $$
DECLARE fk_name text;
BEGIN
  SELECT c.conname INTO fk_name
  FROM pg_constraint c
  JOIN unnest(c.conkey) k(attnum) ON true
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
  WHERE c.contype = 'f'
    AND c.conrelid = 'public.student_sessions'::regclass
    AND c.confrelid = 'auth.users'::regclass
    AND a.attname = 'student_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.student_sessions DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.student_sessions
    ADD CONSTRAINT student_sessions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- The booking and payment tables are already ON DELETE SET NULL and already
-- carry their own email/name snapshots. They only need the old id kept so the
-- rows can still be grouped per person after the account is gone.
ALTER TABLE public.booking_passes          ADD COLUMN IF NOT EXISTS former_student_id uuid;
ALTER TABLE public.booking_commerce_events ADD COLUMN IF NOT EXISTS former_student_id uuid;
ALTER TABLE public.single_session_bookings ADD COLUMN IF NOT EXISTS former_student_id uuid;
ALTER TABLE public.external_booking_events ADD COLUMN IF NOT EXISTS former_student_id uuid;

-- ── Snapshot on the way out ──────────────────────────────────────────────
-- Runs BEFORE the delete, so it can still read the profile and still see the
-- rows that are about to be detached by the SET NULL cascades.
CREATE OR REPLACE FUNCTION public.snapshot_deleted_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.deleted_students (user_id, email, display_name, deleted_at)
  VALUES (
    OLD.id,
    OLD.email,
    (SELECT display_name FROM public.profiles WHERE class_id = OLD.id::text),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, public.deleted_students.display_name),
        deleted_at = EXCLUDED.deleted_at;

  UPDATE public.student_sessions          SET former_student_id = OLD.id WHERE student_id = OLD.id;
  UPDATE public.booking_passes            SET former_student_id = OLD.id WHERE student_id = OLD.id;
  UPDATE public.booking_commerce_events   SET former_student_id = OLD.id WHERE student_id = OLD.id;
  UPDATE public.single_session_bookings   SET former_student_id = OLD.id WHERE user_id    = OLD.id;
  UPDATE public.external_booking_events   SET former_student_id = OLD.id WHERE student_id = OLD.id;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS snapshot_deleted_student_trg ON auth.users;
CREATE TRIGGER snapshot_deleted_student_trg
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_deleted_student();

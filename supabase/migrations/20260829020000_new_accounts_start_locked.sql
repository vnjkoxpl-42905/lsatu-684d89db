-- A new account no longer arrives holding the whole product.
--
-- Every access flag defaulted to true, so anyone who made an account got the
-- drills, the bootcamps, the practice tests and the rest before paying a cent.
-- A new signup now gets exactly what they need to become a student: their
-- classroom, the intake, a way to message Joshua, and a way to book. Paying
-- opens the rest (see _shared/grantStudentAccess.ts), and Joshua can always
-- grant by hand from People.
--
-- Defaults only apply to rows created from here on. Every existing student
-- keeps the access they already have.
ALTER TABLE public.profiles
  ALTER COLUMN has_practice_access  SET DEFAULT false,
  ALTER COLUMN has_drill_access     SET DEFAULT false,
  ALTER COLUMN has_bootcamp_access  SET DEFAULT false,
  ALTER COLUMN has_analytics_access SET DEFAULT false,
  ALTER COLUMN has_waj_access       SET DEFAULT false,
  ALTER COLUMN has_flagged_access   SET DEFAULT false,
  ALTER COLUMN has_export_access    SET DEFAULT false,
  ALTER COLUMN has_ta_access        SET DEFAULT false,
  ALTER COLUMN has_journal_access   SET DEFAULT false,
  ALTER COLUMN has_activity_access  SET DEFAULT false;

-- Left on by default, because a locked door with no way through is worse than
-- no door: the classroom shell holds the intake, chat is how they reach Joshua,
-- and schedule is how they book the consult that turns them into a student.
ALTER TABLE public.profiles
  ALTER COLUMN has_classroom_access SET DEFAULT true,
  ALTER COLUMN has_chat_access      SET DEFAULT true,
  ALTER COLUMN has_schedule_access  SET DEFAULT true;

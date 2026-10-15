-- has_classroom_access goes back to meaning "this person is a student", not
-- "this person made an account".
--
-- 20260829020000 left it on by default so a fresh signup could still reach the
-- shell that holds the intake. That was the wrong lever: the shell, the account
-- page and the intake are already reachable through their routes' allowSignedIn
-- guard, which does not consult this flag at all. Leaving the flag on instead
-- handed every new signup the things that DO read it -- assigned work, notes and
-- recaps -- before they had paid for a single session.
--
-- A new signup now gets the intake, messages, booking and Admissions. Paying
-- turns this on with the rest (see _shared/grantStudentAccess.ts), and Joshua
-- can grant it by hand from People at any time.
--
-- Defaults only apply to rows created from here on. Every existing student keeps
-- the access they already have.
ALTER TABLE public.profiles
  ALTER COLUMN has_classroom_access SET DEFAULT false;

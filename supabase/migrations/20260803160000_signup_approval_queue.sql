-- Signup approval queue.
--
-- notify_admins_on_signup already fired a 'signup' notification at every admin,
-- but it was a dead end: the row recorded only the ADMIN's user_id, so nothing
-- said who had actually signed up, and there was no way to act on it. It also
-- read NEW.display_name, which is empty at profile-insert time for every real
-- signup, so every notification read "A new user just joined the platform."
--
-- This migration gives the notification a subject and a lifecycle, names the
-- person properly, and adds the two admin-only actions behind SECURITY DEFINER
-- RPCs so approval can never be self-served by the account being approved.

-- ── 1. Subject + lifecycle on the notification ──────────────────────────────

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS subject_class_id text,
  ADD COLUMN IF NOT EXISTS status text;

COMMENT ON COLUMN public.notifications.subject_class_id IS
  'For actionable notifications, the profiles.class_id this notification is ABOUT (as opposed to user_id, which is who receives it).';
COMMENT ON COLUMN public.notifications.status IS
  'Lifecycle for actionable notifications: pending | approved | dismissed. NULL for informational ones.';

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_status_check
  CHECK (status IS NULL OR status IN ('pending', 'approved', 'dismissed'));

-- Admins open the bell constantly; keep the pending lookup cheap.
CREATE INDEX IF NOT EXISTS notifications_pending_signups_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE type = 'signup' AND status = 'pending';

-- ── 2. Name the person, and record who they are ─────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_admins_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  who text;
  subject_email text;
BEGIN
  -- class_id = auth uid by the auth-provisioner invariant, but it is a text
  -- column, so guard the cast rather than let a malformed id abort the signup.
  BEGIN
    SELECT u.email INTO subject_email
    FROM auth.users u
    WHERE u.id = NEW.class_id::uuid;
  EXCEPTION WHEN others THEN
    subject_email := NULL;
  END;

  -- display_name is essentially always empty at INSERT (the name is collected
  -- during onboarding, after the profile row exists), so the email is the
  -- name we actually have at this moment. The UPDATE trigger below upgrades
  -- the text in place once a real name lands.
  who := COALESCE(
    NULLIF(NEW.display_name, ''),
    NULLIF(subject_email, ''),
    'A new user'
  );

  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link, subject_class_id, status)
    VALUES (
      admin_id,
      'signup',
      'New signup',
      who || ' just signed up and is waiting for access.',
      '/admin',
      NEW.class_id,
      'pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admins_on_signup_trigger ON public.profiles;
CREATE TRIGGER notify_admins_on_signup_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_signup();

-- When onboarding finally supplies a real name, rewrite the still-pending
-- notification so the admin sees a person instead of an email address.
CREATE OR REPLACE FUNCTION public.rename_pending_signup_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.display_name, '') = '' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(OLD.display_name, '') = COALESCE(NEW.display_name, '') THEN
    RETURN NEW;
  END IF;

  UPDATE public.notifications
  SET body = NEW.display_name || ' just signed up and is waiting for access.'
  WHERE type = 'signup'
    AND status = 'pending'
    AND subject_class_id = NEW.class_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rename_pending_signup_notification_trigger ON public.profiles;
CREATE TRIGGER rename_pending_signup_notification_trigger
AFTER UPDATE OF display_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.rename_pending_signup_notification();

-- ── 3. The two actions ──────────────────────────────────────────────────────

-- The standard student set: everything a paying student needs to work on day
-- one. Deliberately excludes analytics, export, flagged and TA, which stay
-- per-person toggles on the Admin dashboard.
CREATE OR REPLACE FUNCTION public.approve_signup(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only an admin can approve a signup.';
  END IF;

  SELECT subject_class_id INTO v_subject
  FROM public.notifications
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND type = 'signup';

  IF v_subject IS NULL THEN
    RAISE EXCEPTION 'No signup notification % for this admin.', p_notification_id;
  END IF;

  UPDATE public.profiles SET
    has_classroom_access = true,
    has_practice_access  = true,
    has_drill_access     = true,
    has_bootcamp_access  = true,
    has_journal_access   = true,
    has_waj_access       = true,
    has_chat_access      = true,
    has_schedule_access  = true,
    has_activity_access  = true
  WHERE class_id = v_subject;

  UPDATE public.notifications
  SET status = 'approved', read = true
  WHERE id = p_notification_id;
END;
$$;

-- Dismiss changes no access. New profiles already default to no access on every
-- flag, so dismissing simply means "not now" and leaves the Admin dashboard as
-- the way back in.
CREATE OR REPLACE FUNCTION public.dismiss_signup(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only an admin can dismiss a signup.';
  END IF;

  UPDATE public.notifications
  SET status = 'dismissed', read = true
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND type = 'signup';
END;
$$;

REVOKE ALL ON FUNCTION public.approve_signup(uuid) FROM public;
REVOKE ALL ON FUNCTION public.dismiss_signup(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_signup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_signup(uuid) TO authenticated;

-- ── 4. Backfill ─────────────────────────────────────────────────────────────
-- Existing signup notifications have no subject and no status, so they would
-- render as un-actionable forever. Mark them handled rather than leave a
-- permanent row of dead buttons in the bell.
UPDATE public.notifications
SET status = 'dismissed'
WHERE type = 'signup' AND status IS NULL;

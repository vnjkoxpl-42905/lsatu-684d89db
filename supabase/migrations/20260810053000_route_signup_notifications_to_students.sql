-- Signup approvals now live in the Students destination in the classroom rail.
-- Keep both future notifications and any still-pending notification links on
-- the canonical route instead of relying on the retired /admin redirect.

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
  BEGIN
    SELECT u.email INTO subject_email
    FROM auth.users u
    WHERE u.id = NEW.class_id::uuid;
  EXCEPTION WHEN others THEN
    subject_email := NULL;
  END;

  who := COALESCE(
    NULLIF(NEW.display_name, ''),
    NULLIF(subject_email, ''),
    'A new user'
  );

  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      link,
      subject_class_id,
      status
    )
    VALUES (
      admin_id,
      'signup',
      'New signup',
      who || ' just signed up and is waiting for access.',
      '/teacher/students',
      NEW.class_id,
      'pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

UPDATE public.notifications
SET link = '/teacher/students'
WHERE type = 'signup'
  AND status = 'pending'
  AND link IS DISTINCT FROM '/teacher/students';

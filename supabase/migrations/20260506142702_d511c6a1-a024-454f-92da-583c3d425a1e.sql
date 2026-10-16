CREATE OR REPLACE FUNCTION public.notify_admins_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  who text;
BEGIN
  who := COALESCE(NULLIF(NEW.display_name, ''), 'A new user');
  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      admin_id,
      'signup',
      'New signup',
      who || ' just joined the platform.',
      '/admin'
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
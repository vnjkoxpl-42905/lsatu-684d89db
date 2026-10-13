INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email IN ('joshua.fisseha01@gmail.com','joshuafisseha@hotmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
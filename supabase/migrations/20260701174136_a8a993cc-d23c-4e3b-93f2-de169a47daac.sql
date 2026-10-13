GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS layout_prefs jsonb;
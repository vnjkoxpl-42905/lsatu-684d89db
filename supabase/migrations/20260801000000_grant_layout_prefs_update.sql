-- The 2026-06-12 column-scoped grant on profiles (20260612153001) revoked
-- blanket UPDATE and re-granted specific columns — layout_prefs wasn't among
-- them, so students have been unable to save layout preferences since then
-- (the old Customize-layout page failed silently; the classroom rail editor
-- surfaces the failure). layout_prefs is student-owned preference data, so
-- grant it back. Row scoping stays enforced by the existing UPDATE policy
-- (class_id = auth.uid()).
GRANT UPDATE (layout_prefs) ON public.profiles TO authenticated;

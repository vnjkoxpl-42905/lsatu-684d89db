-- Orientation saves the student's LSAT test date after the profile row already
-- exists. Profile updates are column-restricted, so this newer column needs an
-- explicit grant just like the other onboarding-owned fields.
GRANT UPDATE (test_date) ON public.profiles TO authenticated;

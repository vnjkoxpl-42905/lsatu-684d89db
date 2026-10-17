-- Fix: users with no students row should still be able to write attempts.
--
-- Root cause: get_user_class_id() returns NULL when no students row exists,
-- causing all RLS policies that depend on it to silently reject inserts.
--
-- Solution:
--   1. Make get_user_class_id() fall back to auth.uid()::text so the function
--      always returns a non-NULL value for any authenticated user.
--   2. Add a self-service INSERT policy to students so the AuthContext
--      provisioner can create the row on first login.

-- 1. Update get_user_class_id to fall back to auth UUID when no student row exists
CREATE OR REPLACE FUNCTION public.get_user_class_id(uid UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT class_id FROM students WHERE user_id = uid LIMIT 1),
    uid::text
  );
$$;

-- 2. Allow authenticated users to self-provision their own students row
CREATE POLICY "Users can insert own student record"
ON public.students
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

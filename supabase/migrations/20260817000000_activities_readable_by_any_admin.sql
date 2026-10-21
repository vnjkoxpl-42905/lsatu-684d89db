-- Activity Centre: the library is readable by any admin, not only its creator.
--
-- The original SELECT policy was `has_role(admin) AND created_by = auth.uid()`,
-- which pairs badly with how the library is actually seeded. The seed migration
-- attaches every authored Activity to the FIRST admin by user_id order:
--
--   SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
--   ORDER BY ur.user_id LIMIT 1;
--
-- Any other admin account therefore reads zero rows and the teacher library
-- renders "No activities yet." while the rows sit in the table, correctly
-- seeded. Nothing in the UI can distinguish that from a failed seed, so the
-- failure mode is a teacher who believes the content was never built.
--
-- Widening SELECT to every admin also makes this table agree with the one it is
-- always read alongside: activity_assignments already grants admins read on ALL
-- rows and insert for any student, so an admin could already see who had done
-- an Activity while being unable to see the Activity itself.
--
-- Authorship is unchanged. INSERT, UPDATE and DELETE stay scoped to
-- created_by = auth.uid(), so an admin still edits and deletes only their own
-- Activities; this grants reading the shared library, not rewriting it.
-- Students are unaffected: they have no direct access to this table at all and
-- continue to read the immutable snapshot in activity_assignments.

DROP POLICY IF EXISTS "Admins read their activities" ON public.activities;

CREATE POLICY "Admins read the activity library"
  ON public.activities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

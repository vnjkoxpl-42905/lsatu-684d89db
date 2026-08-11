-- 1. bootcamp_kv: students may no longer delete cloud-synced progress; admin-only.
DROP POLICY IF EXISTS "Users delete own bootcamp data" ON public.bootcamp_kv;
CREATE POLICY "Admins delete bootcamp data"
ON public.bootcamp_kv
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. wrong_answer_journal_notes: WAJ notes are core student work product;
--    deletion becomes admin-only so review notes can never be lost.
DROP POLICY IF EXISTS "waj_notes_delete_own" ON public.wrong_answer_journal_notes;
CREATE POLICY "waj_notes_delete_admin"
ON public.wrong_answer_journal_notes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
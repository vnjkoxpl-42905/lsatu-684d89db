-- Joshua can edit who gets which offer, from a screen instead of from SQL.
--
-- student_booking_offers has only ever had a read policy -- a student may see
-- their own row -- so nobody, admin included, could write one through the
-- client. booking_offers is the same story with a read-active policy. Both are
-- how a person's booking access is actually expressed, so both need an admin
-- door before an admin screen can exist.
--
-- Students are unaffected: their existing read policies stand, and neither of
-- these grants a student any new sight of anyone else's arrangement.

CREATE POLICY "Admins manage student booking offers"
  ON public.student_booking_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage booking offers"
  ON public.booking_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

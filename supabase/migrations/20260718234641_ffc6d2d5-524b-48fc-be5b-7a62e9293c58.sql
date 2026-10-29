CREATE POLICY "Authenticated can read schedule events"
  ON public.schedule_events
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);
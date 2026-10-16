-- Enable realtime for the per-student context + sessions tables so the
-- Student Hub's Notes tab and session lists refresh within ~1s when an
-- admin uploads a file / logs a session from another tab or window.
--
-- The tables already exist (phase A2 and phase D migrations); this just
-- adds them to the supabase_realtime publication. Idempotency handled
-- at the migration level — re-running would be a no-op since these are
-- one-time publication add calls.

ALTER PUBLICATION supabase_realtime ADD TABLE public.student_context;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_sessions;

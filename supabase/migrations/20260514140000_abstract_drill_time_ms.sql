-- abstract_drill_attempts.time_ms: per-attempt response time in
-- milliseconds. Nullable so historical rows survive without backfill.
-- Used by the Completion Report (avg time per drill type) and by the
-- DrillRunner diagnostic banner (slow + wrong = signal).

alter table public.abstract_drill_attempts
  add column if not exists time_ms integer;

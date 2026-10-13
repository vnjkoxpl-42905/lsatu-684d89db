ALTER TABLE public.profiles
  ALTER COLUMN has_bootcamp_access SET DEFAULT true,
  ALTER COLUMN has_classroom_access SET DEFAULT true,
  ALTER COLUMN has_analytics_access SET DEFAULT true,
  ALTER COLUMN has_schedule_access SET DEFAULT true;
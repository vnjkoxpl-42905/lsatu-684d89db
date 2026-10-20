-- A student's intended LSAT date is a local calendar date, not a timestamp.
-- Null means no date has been set. Past dates remain valid historical values;
-- the Classroom treats them like null for forward-looking countdown copy.
alter table public.profiles
  add column if not exists test_date date;

comment on column public.profiles.test_date is
  'Student-local LSAT calendar date. Null when unknown; past dates are retained as history.';


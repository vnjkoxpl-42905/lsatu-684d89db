-- The score stops counting an unjudged answer as a wrong one.
--
-- A run's score was the weighted sum of its verdicts divided by the ITEM COUNT.
-- When the Coach could not be reached, the item resolved with a null verdict --
-- and a null verdict divided by the item count is arithmetically identical to a
-- zero. A student whose network dropped on question nine was marked down for
-- it, permanently, and nothing on the screen said so.
--
-- The denominator is now the number of items that actually reached a verdict.
-- That change is not representable in the schema as it stands: `score` is one
-- bare percentage, so "88% of 59 checked" and "88% of 62" are the same stored
-- value, and the Activity card renders that number with no context. The parts
-- are therefore stored alongside it.
--
-- Nothing is backfilled into a meaning it was not computed under. Rows that
-- already carry a score were scored over every item, so they are stamped
-- version 1 and keep exactly the number they have always had. New completions
-- default to version 2.

alter table public.activity_assignments
  add column if not exists score_numerator  numeric,
  add column if not exists score_judged     integer,
  add column if not exists score_total      integer,
  add column if not exists scoring_version  smallint;

comment on column public.activity_assignments.score_numerator is
  'Weighted sum over the judged items: 1 per correct, 0.5 per partial, 0 per incorrect. Unjudged items contribute nothing and are not counted in the denominator either.';

comment on column public.activity_assignments.score_judged is
  'How many items reached a verdict. This is the denominator `score` was computed over under scoring_version 2.';

comment on column public.activity_assignments.score_total is
  'How many items the run contained. score_total - score_judged is the number of answers the Coach never read.';

comment on column public.activity_assignments.scoring_version is
  '1 = scored over every item, so an item the Coach could not reach counted as wrong. 2 = scored over the judged items only, with the parts recorded. Old rows keep 1 and their original number; they are never recomputed.';

-- The immutability guard exempts admins via has_role(auth.uid(), 'admin'), and
-- auth.uid() is NULL inside a migration, so the guard would raise and take the
-- whole migration down with it.
alter table public.activity_assignments disable trigger user;

-- Only rows that actually carry a score are stamped. A row with no score has
-- not been completed, so it has no scoring version yet and will be written as
-- version 2 when it finishes.
update public.activity_assignments
set scoring_version = 1
where scoring_version is null
  and score is not null;

alter table public.activity_assignments enable trigger user;

alter table public.activity_assignments
  alter column scoring_version set default 2;
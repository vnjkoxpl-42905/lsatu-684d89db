-- Which accommodation a student runs under, and who is allowed to say so.
--
-- Read, Recall, Colour carries three goals for every section -- 25 minutes
-- standard, 38 at a 53-minute accommodation, 50 at a 70-minute one (ADR 0014).
-- Only the first has ever been used, because nothing supplied the accommodation
-- and the runner fell back to "standard" for everyone. A student with double
-- time who finished in 40 minutes was recorded as fifteen minutes over goal
-- when she was ten minutes inside her own. ADR 0014 exists to prevent exactly
-- that and says so: "her accommodation is scored as slowness, which is the one
-- thing three numbers exist to prevent."
--
-- It lives on the profile rather than on the run because it is a fact about the
-- student, granted by LSAC, and it does not change between one Tuesday and the
-- next. Asking at the start of every section would put the same failure in a
-- new place: whoever forgets to pick it is scored as slow.

alter table public.profiles
  add column if not exists lsat_accommodation text not null default 'standard';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_lsat_accommodation_check'
  ) then
    alter table public.profiles
      add constraint profiles_lsat_accommodation_check
      check (lsat_accommodation in ('standard', 'accommodation_53', 'accommodation_70'));
  end if;
end $$;

comment on column public.profiles.lsat_accommodation is
  'LSAC time accommodation. Scales the RRC section goal (ADR 0014). Admin-writable only.';

-- The student reads her own and cannot set it.
--
-- `Students can update own profile` grants UPDATE on the whole row with
-- `class_id = auth.uid()::text`, so a new column arrives student-writable
-- unless something stops it. It has to be stopped, for the same reason a grade
-- does not live on `activity_assignments` (ADR 0019): the accommodation picks
-- which goal the run is scored against, so a student who can set it can set her
-- own passing time.
--
-- A trigger rather than a policy, because the existing policy is row-level and
-- splitting it per column would mean rewriting a rule every other feature
-- depends on. Same shape as `guard_activity_assignment_immutables`.
create or replace function public.guard_profile_accommodation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lsat_accommodation is distinct from old.lsat_accommodation then
    -- `auth.uid()` is null for the service role, which is the grader and the
    -- migrations. Those are server-side and already trusted; there is no client
    -- path to this table without a session, because `anon` holds no policy.
    if auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
      raise exception 'lsat_accommodation may only be changed by an admin'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_accommodation on public.profiles;
create trigger guard_profile_accommodation
  before update on public.profiles
  for each row execute function public.guard_profile_accommodation();

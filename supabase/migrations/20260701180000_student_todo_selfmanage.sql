-- Student self-managed to-do: let students own their weekly_plan_items as a
-- true to-do list. They can add their own tasks (source='self'), delete any of
-- their own items (including admin-assigned ones), and continue to check off /
-- move-day via the existing update policy. Self-added tasks live on a durable
-- per-student "personal" plan so they satisfy the published-plan select policy.
--
-- Task -> action wiring convention (no new column): weekly_plan_items.metadata_json
-- may carry an `action` object:
--   { "kind": "drill"|"homework"|"bootcamp"|"plain", "ref_id": "<id>", "route": "<path>" }
-- The Today list uses this to launch the linked surface and auto-complete the task.

-- ── 1. source column ─────────────────────────────────────────────────
alter table public.weekly_plan_items
  add column if not exists source text not null default 'admin'
    check (source in ('admin', 'self'));

-- one-way Google Calendar push idempotency (Stage 5)
alter table public.weekly_plan_items
  add column if not exists google_event_id text;

-- ── 2. student INSERT / DELETE policies ──────────────────────────────
-- Students may insert only their own self-sourced tasks.
drop policy if exists weekly_plan_items_student_insert on public.weekly_plan_items;
create policy weekly_plan_items_student_insert on public.weekly_plan_items
  for insert to authenticated
  with check (student_id = auth.uid() and source = 'self');

-- Students may delete any of their own items (admin-assigned included, per spec).
drop policy if exists weekly_plan_items_student_delete on public.weekly_plan_items;
create policy weekly_plan_items_student_delete on public.weekly_plan_items
  for delete to authenticated
  using (student_id = auth.uid());

-- ── 3. durable per-student personal plan ─────────────────────────────
-- One published plan per student that hosts self-added tasks. Published so the
-- existing weekly_plan_items_student_select policy admits its items. Marked with
-- metadata via title sentinel + wide week range.
create or replace function public.get_or_create_personal_plan(p_student uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_student is null then
    raise exception 'p_student is required';
  end if;

  select id into v_id
  from public.weekly_plans
  where student_id = p_student and title = '__personal__'
  limit 1;

  if v_id is null then
    insert into public.weekly_plans (
      student_id, created_by, title, week_start, week_end, status, ai_generated
    ) values (
      p_student, p_student, '__personal__',
      '2000-01-01'::date, '2999-12-31'::date, 'published', false
    )
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function public.get_or_create_personal_plan(uuid) to authenticated;

-- ── 4. student email + calendar prefs ────────────────────────────────
alter table public.profiles
  add column if not exists daily_digest_email boolean not null default false;
alter table public.profiles
  add column if not exists gcal_push_enabled boolean not null default false;

-- ── 5. per-student Google OAuth tokens (Stage 5) ─────────────────────
create table if not exists public.google_oauth_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expiry timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_oauth_tokens enable row level security;

-- Owner-only: a user can see/manage only their own token row. (Edge functions
-- use the service role and bypass RLS for the push job.)
drop policy if exists google_oauth_tokens_owner on public.google_oauth_tokens;
create policy google_oauth_tokens_owner on public.google_oauth_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

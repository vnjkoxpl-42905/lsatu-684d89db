-- weekly_plans + weekly_plan_items: published or draft weekly plans for a
-- student. Students only ever see published plans. Plan items reference
-- a classroom_items row when they hold an assignable task.

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid,
  created_by uuid not null,
  title text not null,
  week_start date not null,
  week_end date not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  ai_generated boolean not null default false,
  rationale text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_plans_student_idx
  on public.weekly_plans (student_id, status, week_start desc);

create or replace function public.touch_weekly_plans_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists weekly_plans_touch on public.weekly_plans;
create trigger weekly_plans_touch before update on public.weekly_plans
  for each row execute function public.touch_weekly_plans_updated_at();

alter table public.weekly_plans enable row level security;

create policy weekly_plans_student_select on public.weekly_plans
  for select to authenticated
  using (student_id = auth.uid() and status = 'published');

create policy weekly_plans_admin_all on public.weekly_plans
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ── weekly_plan_items ────────────────────────────────────────────────

create table if not exists public.weekly_plan_items (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  classroom_item_id uuid references public.classroom_items(id) on delete set null,
  day_date date not null,
  title text not null,
  instructions text,
  estimated_minutes integer,
  unlock_at timestamptz,
  due_at timestamptz,
  status text not null default 'assigned' check (status in (
    'assigned','in_progress','completed','skipped'
  )),
  sort_order integer not null default 0,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_plan_items_plan_idx
  on public.weekly_plan_items (weekly_plan_id, day_date, sort_order);

create or replace function public.touch_weekly_plan_items_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists weekly_plan_items_touch on public.weekly_plan_items;
create trigger weekly_plan_items_touch before update on public.weekly_plan_items
  for each row execute function public.touch_weekly_plan_items_updated_at();

alter table public.weekly_plan_items enable row level security;

create policy weekly_plan_items_student_select on public.weekly_plan_items
  for select to authenticated
  using (
    student_id = auth.uid()
    and exists (
      select 1 from public.weekly_plans p
      where p.id = weekly_plan_id and p.status = 'published'
    )
  );

create policy weekly_plan_items_student_update on public.weekly_plan_items
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy weekly_plan_items_admin_all on public.weekly_plan_items
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

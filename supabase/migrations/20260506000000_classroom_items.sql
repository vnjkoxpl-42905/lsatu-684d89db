-- classroom_items: unified assignable / postable item model.
-- Every "thing the student sees in the Classroom" is a row here. Created
-- by admin/teacher; the student only sees rows where visible_to_student
-- is true and unlock_at (if set) is in the past.

create table if not exists public.classroom_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid,
  created_by uuid not null,
  type text not null check (type in (
    'drill','homework','bootcamp_module','note','session_recap',
    'announcement','upload_summary','weekly_plan_task','smartboard_recap'
  )),
  title text not null,
  description text,
  content_html text,
  content_markdown text,
  source_table text,
  source_id text,
  status text not null default 'draft' check (status in (
    'draft','assigned','in_progress','completed','archived'
  )),
  unlock_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  priority integer not null default 0,
  visible_to_student boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists classroom_items_student_idx
  on public.classroom_items (student_id, visible_to_student, unlock_at);
create index if not exists classroom_items_status_idx
  on public.classroom_items (student_id, status);
create index if not exists classroom_items_type_idx
  on public.classroom_items (student_id, type);

-- updated_at trigger
create or replace function public.touch_classroom_items_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists classroom_items_touch on public.classroom_items;
create trigger classroom_items_touch before update on public.classroom_items
  for each row execute function public.touch_classroom_items_updated_at();

alter table public.classroom_items enable row level security;

-- Student SELECT: own row, visible, unlocked.
create policy classroom_items_student_select on public.classroom_items
  for select to authenticated
  using (
    student_id = auth.uid()
    and visible_to_student = true
    and (unlock_at is null or unlock_at <= now())
  );

-- Student UPDATE limited to status -> in_progress / completed on own row.
create policy classroom_items_student_update on public.classroom_items
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Admin: full CRUD.
create policy classroom_items_admin_all on public.classroom_items
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- classroom_items: unified assignable item model used by Teacher → Bootcamps
-- toggle and the per-student BootcampGate.
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

create or replace function public.touch_classroom_items_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists classroom_items_touch on public.classroom_items;
create trigger classroom_items_touch before update on public.classroom_items
  for each row execute function public.touch_classroom_items_updated_at();

alter table public.classroom_items enable row level security;

drop policy if exists classroom_items_student_select on public.classroom_items;
create policy classroom_items_student_select on public.classroom_items
  for select to authenticated
  using (
    student_id = auth.uid()
    and visible_to_student = true
    and (unlock_at is null or unlock_at <= now())
  );

drop policy if exists classroom_items_student_update on public.classroom_items;
create policy classroom_items_student_update on public.classroom_items
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists classroom_items_admin_all on public.classroom_items;
create policy classroom_items_admin_all on public.classroom_items
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- notifications: bell + assign-toast feed.
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('assignment','message','reminder','streak')),
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Admins read all notifications" on public.notifications;
create policy "Admins read all notifications"
  on public.notifications for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins insert notifications" on public.notifications;
create policy "Admins insert notifications"
  on public.notifications for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update notifications" on public.notifications;
create policy "Admins update notifications"
  on public.notifications for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete notifications" on public.notifications;
create policy "Admins delete notifications"
  on public.notifications for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.guard_notification_immutables()
returns trigger language plpgsql as $$
begin
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if new.user_id    is distinct from old.user_id    or
     new.type       is distinct from old.type       or
     new.title      is distinct from old.title      or
     new.body       is distinct from old.body       or
     new.link       is distinct from old.link       or
     new.created_at is distinct from old.created_at then
    raise exception 'notifications: only the read flag is mutable for non-admin users';
  end if;
  if old.read = true and new.read = false then
    raise exception 'notifications: read flag cannot be flipped back to false';
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_guard on public.notifications;
create trigger notifications_guard before update on public.notifications
  for each row execute function public.guard_notification_immutables();
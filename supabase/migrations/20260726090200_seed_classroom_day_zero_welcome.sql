-- Seed the welcome only when Classroom access is granted. This is deliberately
-- an UPDATE trigger, never an auth-signup or profile-insert trigger.
create or replace function public.seed_classroom_day_zero_welcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
begin
  select ur.user_id
    into admin_id
  from public.user_roles ur
  where ur.role = 'admin'
  order by ur.user_id
  limit 1;

  if admin_id is null then
    raise exception
      'Cannot seed Classroom welcome: no admin user is available as author';
  end if;

  insert into public.classroom_items (
    student_id,
    class_id,
    created_by,
    type,
    title,
    description,
    content_html,
    source_table,
    source_id,
    status,
    priority,
    visible_to_student,
    metadata_json
  )
  values (
    new.class_id::uuid,
    new.class_id::uuid,
    admin_id,
    'note',
    'Welcome to your classroom',
    'This is where your next step, session notes, and assigned work will stay organized.',
    '<p>Welcome to your classroom. This is where your next step, session notes, and assigned work will stay organized.</p>',
    'profiles',
    'day-0-welcome',
    'assigned',
    0,
    true,
    '{"kind":"day_zero_welcome"}'::jsonb
  )
  on conflict (student_id, source_table, source_id)
    where source_table = 'profiles' and source_id = 'day-0-welcome'
  do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_seed_classroom_day_zero_welcome
  on public.profiles;

create trigger profiles_seed_classroom_day_zero_welcome
  after update of has_classroom_access on public.profiles
  for each row
  when (
    old.has_classroom_access is distinct from true
    and new.has_classroom_access is true
  )
  execute function public.seed_classroom_day_zero_welcome();

-- Existing enrolled students did not pass through the new transition trigger.
-- Backfill them through the same function's insert contract, with the same
-- resolved author and idempotency key.
do $$
declare
  admin_id uuid;
begin
  select ur.user_id
    into admin_id
  from public.user_roles ur
  where ur.role = 'admin'
  order by ur.user_id
  limit 1;

  if admin_id is null then
    raise exception
      'Cannot backfill Classroom welcomes: no admin user is available as author';
  end if;

  insert into public.classroom_items (
    student_id,
    class_id,
    created_by,
    type,
    title,
    description,
    content_html,
    source_table,
    source_id,
    status,
    priority,
    visible_to_student,
    metadata_json
  )
  select
    p.class_id::uuid,
    p.class_id::uuid,
    admin_id,
    'note',
    'Welcome to your classroom',
    'This is where your next step, session notes, and assigned work will stay organized.',
    '<p>Welcome to your classroom. This is where your next step, session notes, and assigned work will stay organized.</p>',
    'profiles',
    'day-0-welcome',
    'assigned',
    0,
    true,
    '{"kind":"day_zero_welcome"}'::jsonb
  from public.profiles p
  where p.has_classroom_access is true
    and p.class_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  on conflict (student_id, source_table, source_id)
    where source_table = 'profiles' and source_id = 'day-0-welcome'
  do nothing;
end;
$$;

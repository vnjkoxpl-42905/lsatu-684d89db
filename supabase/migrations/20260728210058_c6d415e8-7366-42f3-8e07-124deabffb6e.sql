alter table public.ta_assignments
  add column if not exists response_schema jsonb not null default '{"version":1,"sections":[]}'::jsonb,
  add column if not exists response_data jsonb not null default '{}'::jsonb,
  add column if not exists response_saved_at timestamptz,
  add column if not exists answer_key_html text;

create table if not exists public.mcp_write_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  tool_name text not null,
  idempotency_key text not null,
  student_id uuid references auth.users(id) on delete set null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (actor_id, tool_name, idempotency_key)
);

grant select on public.mcp_write_audit to authenticated;
grant all on public.mcp_write_audit to service_role;

alter table public.mcp_write_audit enable row level security;

drop policy if exists "Admins read MCP write audit" on public.mcp_write_audit;
create policy "Admins read MCP write audit"
  on public.mcp_write_audit for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.mcp_require_admin()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or not public.has_role(caller, 'admin') then
    raise exception 'admin authentication required';
  end if;
  return caller;
end;
$$;

revoke all on function public.mcp_require_admin() from public, anon;
grant execute on function public.mcp_require_admin() to authenticated;

create or replace function public.mcp_find_students(p_query text, p_limit integer default 10)
returns table(student_id uuid, display_name text, email text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.mcp_require_admin();
  if length(trim(coalesce(p_query, ''))) < 2 then
    raise exception 'student query must contain at least two characters';
  end if;

  return query
  select p.class_id, p.display_name, u.email::text
  from public.profiles p
  join auth.users u on u.id = p.class_id
  where not exists (
    select 1 from public.user_roles r
    where r.user_id = p.class_id and r.role = 'admin'
  )
    and (
      coalesce(p.display_name, '') ilike '%' || trim(p_query) || '%'
      or coalesce(u.email, '') ilike '%' || trim(p_query) || '%'
    )
  order by
    case when lower(coalesce(p.display_name, '')) = lower(trim(p_query)) then 0 else 1 end,
    p.display_name nulls last,
    u.email
  limit greatest(1, least(coalesce(p_limit, 10), 25));
end;
$$;

revoke all on function public.mcp_find_students(text, integer) from public, anon;
grant execute on function public.mcp_find_students(text, integer) to authenticated;

create or replace function public.mcp_get_or_create_admin_student_conversation(
  p_admin_id uuid,
  p_student_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  select cp1.conversation_id into conv_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = p_admin_id
    and cp2.user_id = p_student_id
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (subject, created_by, last_message_at)
  values (null, p_admin_id, now())
  returning id into conv_id;

  insert into public.conversation_participants
    (conversation_id, user_id, last_read_at)
  values
    (conv_id, p_admin_id, now()),
    (conv_id, p_student_id, null);

  return conv_id;
end;
$$;

revoke all on function public.mcp_get_or_create_admin_student_conversation(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.mcp_post_classroom_note(
  p_student_id uuid,
  p_title text,
  p_content_html text,
  p_idempotency_key text,
  p_description text default null,
  p_notify boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := public.mcp_require_admin();
  prior jsonb;
  item_id uuid;
  conv_id uuid;
  route text;
  output jsonb;
begin
  if not exists (select 1 from public.profiles where class_id = p_student_id) then
    raise exception 'student not found';
  end if;
  if length(trim(coalesce(p_title, ''))) not between 1 and 160 then
    raise exception 'title must contain 1 to 160 characters';
  end if;
  if length(trim(coalesce(p_content_html, ''))) < 1
     or length(p_content_html) > 500000 then
    raise exception 'content_html must contain 1 to 500000 characters';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 160 then
    raise exception 'idempotency_key must contain 8 to 160 characters';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(caller::text || ':post_classroom_note:' || p_idempotency_key, 0)
  );
  select result into prior
  from public.mcp_write_audit
  where actor_id = caller
    and tool_name = 'post_classroom_note'
    and idempotency_key = p_idempotency_key;
  if prior is not null then
    return prior || jsonb_build_object('reused', true);
  end if;

  insert into public.classroom_items (
    student_id, class_id, created_by, type, title, description,
    content_html, status, visible_to_student, metadata_json
  )
  values (
    p_student_id, p_student_id, caller, 'note', trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''), p_content_html,
    'assigned', true,
    jsonb_build_object(
      'mcp_tool', 'post_classroom_note',
      'mcp_idempotency_key', p_idempotency_key
    )
  )
  returning id into item_id;

  route := '/classroom/item/' || item_id::text;

  if p_notify then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      p_student_id, 'assignment', 'New note: ' || trim(p_title),
      nullif(trim(coalesce(p_description, '')), ''), route
    );

    conv_id := public.mcp_get_or_create_admin_student_conversation(caller, p_student_id);
    insert into public.messages (conversation_id, sender_id, body)
    values (
      conv_id,
      caller,
      'New note: ' || trim(p_title) || E'\n\nView it in your Classroom: ' || route
    );
  end if;

  output := jsonb_build_object(
    'ok', true,
    'reused', false,
    'kind', 'note',
    'item_id', item_id,
    'student_id', p_student_id,
    'route', route,
    'notified', p_notify
  );
  insert into public.mcp_write_audit
    (actor_id, tool_name, idempotency_key, student_id, result)
  values
    (caller, 'post_classroom_note', p_idempotency_key, p_student_id, output);
  return output;
end;
$$;

revoke all on function public.mcp_post_classroom_note(
  uuid, text, text, text, text, boolean
) from public, anon;
grant execute on function public.mcp_post_classroom_note(
  uuid, text, text, text, text, boolean
) to authenticated;

create or replace function public.mcp_assign_passage_map_homework(
  p_student_id uuid,
  p_title text,
  p_content_html text,
  p_response_schema jsonb,
  p_answer_key_html text,
  p_idempotency_key text,
  p_notify boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := public.mcp_require_admin();
  prior jsonb;
  assignment_id uuid;
  conv_id uuid;
  route text;
  output jsonb;
begin
  if not exists (select 1 from public.profiles where class_id = p_student_id) then
    raise exception 'student not found';
  end if;
  if length(trim(coalesce(p_title, ''))) not between 1 and 160 then
    raise exception 'title must contain 1 to 160 characters';
  end if;
  if length(trim(coalesce(p_content_html, ''))) < 1
     or length(p_content_html) > 500000 then
    raise exception 'content_html must contain 1 to 500000 characters';
  end if;
  if jsonb_typeof(coalesce(p_response_schema, '{}'::jsonb)) <> 'object'
     or coalesce(p_response_schema->>'version', '') <> '1'
     or jsonb_typeof(coalesce(p_response_schema->'sections', 'null'::jsonb)) <> 'array' then
    raise exception 'response_schema must be a version 1 object with a sections array';
  end if;
  if length(trim(coalesce(p_answer_key_html, ''))) < 1
     or length(p_answer_key_html) > 500000 then
    raise exception 'answer_key_html must contain 1 to 500000 characters';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 160 then
    raise exception 'idempotency_key must contain 8 to 160 characters';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(caller::text || ':assign_passage_map_homework:' || p_idempotency_key, 0)
  );
  select result into prior
  from public.mcp_write_audit
  where actor_id = caller
    and tool_name = 'assign_passage_map_homework'
    and idempotency_key = p_idempotency_key;
  if prior is not null then
    return prior || jsonb_build_object('reused', true);
  end if;

  insert into public.ta_assignments (
    student_id, title, content_html, response_schema, answer_key_html,
    assigned_by, status
  )
  values (
    p_student_id, trim(p_title), p_content_html, p_response_schema,
    p_answer_key_html, caller, 'assigned'
  )
  returning id into assignment_id;

  route := '/classroom/ta/' || assignment_id::text;

  if p_notify then
    insert into public.notifications (user_id, type, title, link)
    values (
      p_student_id, 'assignment',
      'New assignment: ' || trim(p_title), route
    );

    conv_id := public.mcp_get_or_create_admin_student_conversation(caller, p_student_id);
    insert into public.messages (conversation_id, sender_id, body)
    values (
      conv_id,
      caller,
      'New assignment: ' || trim(p_title) ||
      E'\n\nComplete it in your Classroom: ' || route
    );
  end if;

  output := jsonb_build_object(
    'ok', true,
    'reused', false,
    'kind', 'passage_map_homework',
    'assignment_id', assignment_id,
    'student_id', p_student_id,
    'route', route,
    'answer_key', 'reveals_after_submission',
    'notified', p_notify
  );
  insert into public.mcp_write_audit
    (actor_id, tool_name, idempotency_key, student_id, result)
  values
    (caller, 'assign_passage_map_homework', p_idempotency_key, p_student_id, output);
  return output;
end;
$$;

revoke all on function public.mcp_assign_passage_map_homework(
  uuid, text, text, jsonb, text, text, boolean
) from public, anon;
grant execute on function public.mcp_assign_passage_map_homework(
  uuid, text, text, jsonb, text, text, boolean
) to authenticated;

create or replace function public.mcp_get_assignment_status(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  output jsonb;
begin
  perform public.mcp_require_admin();
  select jsonb_build_object(
    'assignment_id', a.id,
    'student_id', a.student_id,
    'title', a.title,
    'status', a.status,
    'assigned_at', a.assigned_at,
    'viewed_at', a.viewed_at,
    'response_saved_at', a.response_saved_at,
    'completed_at', a.completed_at,
    'has_responses', a.response_data <> '{}'::jsonb,
    'answer_key_attached', nullif(trim(coalesce(a.answer_key_html, '')), '') is not null,
    'route', '/classroom/ta/' || a.id::text
  )
  into output
  from public.ta_assignments a
  where a.id = p_assignment_id;
  if output is null then
    raise exception 'assignment not found';
  end if;
  return output;
end;
$$;

revoke all on function public.mcp_get_assignment_status(uuid) from public, anon;
grant execute on function public.mcp_get_assignment_status(uuid) to authenticated;

create or replace function public.guard_ta_assignment_immutables()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if new.student_id is distinct from old.student_id
     or new.interaction_id is distinct from old.interaction_id
     or new.title is distinct from old.title
     or new.content_html is distinct from old.content_html
     or new.asset_ids is distinct from old.asset_ids
     or new.pdf_url is distinct from old.pdf_url
     or new.response_schema is distinct from old.response_schema
     or new.answer_key_html is distinct from old.answer_key_html
     or new.assigned_by is distinct from old.assigned_by
     or new.assigned_at is distinct from old.assigned_at
     or new.created_at is distinct from old.created_at then
    raise exception 'ta_assignments: assignment content is immutable for students';
  end if;
  if old.status = 'completed'
     and (
       new.status is distinct from old.status
       or new.response_data is distinct from old.response_data
       or new.response_saved_at is distinct from old.response_saved_at
       or new.completed_at is distinct from old.completed_at
     ) then
    raise exception 'ta_assignments: submitted work is locked';
  end if;
  return new;
end;
$$;

drop trigger if exists ta_assignments_guard_immutables on public.ta_assignments;
create trigger ta_assignments_guard_immutables
before update on public.ta_assignments
for each row execute function public.guard_ta_assignment_immutables();
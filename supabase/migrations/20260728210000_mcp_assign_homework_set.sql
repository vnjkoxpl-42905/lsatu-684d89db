-- Notifying twin for assigning an existing homework SET (homework_sets ->
-- homework_assignments). The passage-map homework RPC covers ta_assignments;
-- this covers the question-set homework the `assign_homework` tool assigns.
-- Same guarantees as the sibling RPCs: admin-only, idempotent, audited, and it
-- fires the in-app bell + inbox message. Email is sent by the tool layer.

create or replace function public.mcp_assign_homework_set(
  p_set_id uuid,
  p_student_id uuid,
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
  hw record;
  assignment_id uuid;
  already_assigned boolean := false;
  conv_id uuid;
  route text;
  output jsonb;
begin
  if not exists (select 1 from public.profiles where class_id = p_student_id) then
    raise exception 'student not found';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 160 then
    raise exception 'idempotency_key must contain 8 to 160 characters';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(caller::text || ':assign_homework_set:' || p_idempotency_key, 0)
  );
  select result into prior
  from public.mcp_write_audit
  where actor_id = caller
    and tool_name = 'assign_homework_set'
    and idempotency_key = p_idempotency_key;
  if prior is not null then
    return prior || jsonb_build_object('reused', true);
  end if;

  select id, title, description, question_qids, class_id
    into hw
  from public.homework_sets
  where id = p_set_id;
  if hw.id is null then
    raise exception 'homework set not found';
  end if;

  begin
    insert into public.homework_assignments (
      set_id, student_id, question_qids, set_title, set_description,
      status, assigned_by, class_id
    )
    values (
      hw.id, p_student_id, hw.question_qids, hw.title, hw.description,
      'assigned', caller, hw.class_id
    )
    returning id into assignment_id;
  exception when unique_violation then
    -- Set is already assigned to this student. Return the existing assignment
    -- without re-notifying or duplicating the classroom feed item.
    already_assigned := true;
    select id into assignment_id
    from public.homework_assignments
    where set_id = hw.id and student_id = p_student_id
    limit 1;
  end;

  route := '/classroom/' || assignment_id::text;

  if not already_assigned then
    insert into public.classroom_items (
      student_id, created_by, type, title, description,
      source_table, source_id, status, visible_to_student, metadata_json
    )
    values (
      p_student_id, caller, 'homework', hw.title, hw.description,
      'homework_assignments', assignment_id, 'assigned', true,
      jsonb_build_object(
        'assigned_route', route,
        'mcp_tool', 'assign_homework_set',
        'mcp_idempotency_key', p_idempotency_key
      )
    );

    if p_notify then
      insert into public.notifications (user_id, type, title, body, link)
      values (
        p_student_id, 'assignment', 'New homework: ' || hw.title,
        nullif(trim(coalesce(hw.description, '')), ''), route
      );

      conv_id := public.mcp_get_or_create_admin_student_conversation(caller, p_student_id);
      insert into public.messages (conversation_id, sender_id, body)
      values (
        conv_id,
        caller,
        'New homework: ' || hw.title || E'\n\nStart it in your Classroom: ' || route
      );
    end if;
  end if;

  output := jsonb_build_object(
    'ok', true,
    'reused', false,
    'kind', 'homework_set',
    'assignment_id', assignment_id,
    'student_id', p_student_id,
    'set_id', hw.id,
    'title', hw.title,
    'route', route,
    'already_assigned', already_assigned,
    'notified', p_notify and not already_assigned
  );
  insert into public.mcp_write_audit
    (actor_id, tool_name, idempotency_key, student_id, result)
  values
    (caller, 'assign_homework_set', p_idempotency_key, p_student_id, output);
  return output;
end;
$$;

revoke all on function public.mcp_assign_homework_set(uuid, uuid, text, boolean)
  from public, anon;
grant execute on function public.mcp_assign_homework_set(uuid, uuid, text, boolean)
  to authenticated;

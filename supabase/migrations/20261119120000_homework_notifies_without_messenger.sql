-- Homework and passage-map assignments notify through the bell only.
-- They no longer post a Messenger message into the student's thread. The bell
-- links to the assigned work in the Classroom (single assignment) or My Work.
-- Classroom notes are unchanged. Existing messages are untouched.
begin;

CREATE OR REPLACE FUNCTION public.mcp_assign_homework_set(p_set_id uuid, p_student_id uuid, p_idempotency_key text, p_notify boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller uuid := public.mcp_require_admin();
  prior jsonb;
  hw record;
  assignment_id uuid;
  already_assigned boolean := false;
  route text;
  output jsonb;
  delivery_group uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.profiles where class_id = p_student_id::text) then
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
      status, assigned_by, class_id, notification_policy, notification_group_id
    )
    values (
      hw.id, p_student_id, hw.question_qids, hw.title, hw.description,
      'assigned', caller, hw.class_id, case when p_notify then 'managed' else 'suppressed' end, delivery_group
    )
    returning id into assignment_id;
  exception when unique_violation then
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
    perform public.finalize_assignment_notification_group(delivery_group, 'New assignment', null, '/my-work/to-do');
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
$function$
;

CREATE OR REPLACE FUNCTION public.mcp_assign_passage_map_homework(p_student_id uuid, p_title text, p_content_html text, p_response_schema jsonb, p_answer_key_html text, p_idempotency_key text, p_notify boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller uuid := public.mcp_require_admin();
  prior jsonb;
  assignment_id uuid;
  route text;
  output jsonb;
  delivery_group uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.profiles where class_id = p_student_id::text) then
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
    assigned_by, status, notification_policy, notification_group_id
  )
  values (
    p_student_id, trim(p_title), p_content_html, p_response_schema,
    p_answer_key_html, caller, 'assigned', case when p_notify then 'managed' else 'suppressed' end, delivery_group
  )
  returning id into assignment_id;

  route := '/classroom/ta/' || assignment_id::text;

  if p_notify then
    perform public.finalize_assignment_notification_group(delivery_group, 'New assignment', null, '/my-work/to-do');
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
$function$
;

revoke all on function public.mcp_assign_homework_set(uuid,uuid,text,boolean),
 public.mcp_assign_passage_map_homework(uuid,text,text,jsonb,text,text,boolean) from public,anon;
grant execute on function public.mcp_assign_homework_set(uuid,uuid,text,boolean),
 public.mcp_assign_passage_map_homework(uuid,text,text,jsonb,text,text,boolean) to authenticated;
commit;

-- Scoped assignment preview, atomic publication, and retry receipt for the existing OAuth MCP.
begin;

create function public.mcp_teaching_assignment_plan(p_actor uuid, p_student_id uuid, p_item jsonb, p_settings jsonb)
returns jsonb language plpgsql stable set search_path = pg_catalog, public as $$
declare
  student public.profiles%rowtype;
  drill public.guided_drills%rowtype;
  activity public.activities%rowtype;
  kind text := p_item->>'kind';
  item_id text := p_item->>'id';
  target_pt integer;
  target_section integer;
  section_type text;
  manifest text;
  qids text[];
  set_id uuid;
  set_created boolean;
  level text;
  question_count integer;
  timing text;
  item_title text;
  item_description text;
  item_route text;
  activity_behavior jsonb;
  revision text;
  item_meta jsonb := '{}';
  notify boolean := coalesce((p_settings->>'notify')::boolean, true);
  allow_repeat boolean := false;
  unlock_at timestamptz;
  due_at timestamptz;
  days jsonb;
  duplicate_rows jsonb;
  access_issue text;
  zone text := p_settings->>'time_zone';
begin
  select * into student from public.profiles p where p.class_id = p_student_id::text and p.archived_at is null;
  if not found or p_student_id = p_actor or public.has_role(p_student_id, 'admin') then
    raise exception 'Choose an active student account' using errcode = '22023';
  end if;
  if not coalesce(student.has_classroom_access, false) then
    access_issue := 'The student needs Classroom access.';
  end if;

  if coalesce(jsonb_typeof(p_item), '') <> 'object' or coalesce(jsonb_typeof(p_settings), '') <> 'object'
    or octet_length(p_item::text) > 50000 or octet_length(p_settings::text) > 10000
    or kind is null then
    raise exception 'Invalid assignment inputs' using errcode = '22023';
  end if;
  if p_settings ? 'allow_repeat' then
    if kind not in ('guided_drill','activity') or coalesce(jsonb_typeof(p_settings->'allow_repeat'), '') <> 'boolean' then
      raise exception 'Repeat overrides apply only to guided drills and activities' using errcode = '22023';
    end if;
    allow_repeat := (p_settings->>'allow_repeat')::boolean;
  end if;
  if p_settings ? 'scheduled_for' or p_settings ? 'due_on' then
    if zone is null or not exists(select from pg_catalog.pg_timezone_names where name = zone) then
      raise exception 'A valid time zone is required for calendar dates' using errcode = '22023';
    end if;
    if (p_settings ? 'scheduled_for' and coalesce(p_settings->>'scheduled_for', '') !~ '^\d{4}-\d{2}-\d{2}$')
      or (p_settings ? 'due_on' and coalesce(p_settings->>'due_on', '') !~ '^\d{4}-\d{2}-\d{2}$') then
      raise exception 'Use YYYY-MM-DD for calendar dates' using errcode = '22023';
    end if;
    unlock_at := (p_settings->>'scheduled_for')::date::timestamp at time zone zone;
    due_at := ((p_settings->>'due_on')::date + time '23:59:59') at time zone zone;
    if due_at < unlock_at then raise exception 'The due date precedes the scheduled unlock' using errcode = '22023'; end if;
  end if;

  if kind = 'prep_test_section' then
    target_pt := (p_item->>'pt')::integer;
    target_section := (p_item->>'section')::integer;
    section_type := p_item->>'section_type';
    timing := coalesce(p_settings->>'timing_mode', '35');
    if target_pt is null or target_pt not between 1 and 999 or target_section is null or target_section not between 1 and 4
       or section_type is null or section_type not in ('lr','rc') or timing not in ('35','52.5','70') then
      raise exception 'Invalid PrepTest section or timing' using errcode = '22023';
    end if;
    if section_type = 'lr' then
      -- This private identity-only mirror is generated together with the
      -- searchable app question-bank catalog. It preserves original order.
      select catalog.question_qids into qids
      from public.mcp_lr_section_catalog catalog
      where catalog.prep_test = target_pt and catalog.section_number = target_section;
    else
      -- The RC runner uses this exact active protected source and will refuse an
      -- unseeded manifest. The catalog tool only exposes non-secret identities.
      select m.manifest_sha256, array(select jsonb_array_elements_text(m.definition->'qids'))
      into manifest, qids
      from public.timed_section_configuration_v1 c
      join public.timed_section_content_manifests_v1 m on m.manifest_sha256 = c.manifest_sha256
      where c.singleton and c.enabled and m.pt = target_pt and m.section = target_section and m.kind = 'rc';
    end if;
    if coalesce(cardinality(qids), 0) = 0 or to_jsonb(qids) is distinct from p_item->'question_ids' then
      raise exception 'The canonical section and its original question order could not be verified in the active question bank' using errcode = '22023';
    end if;
    item_id := format('PT%s.S%s', target_pt, target_section);
    item_title := format('%s (%s)', item_id, upper(section_type));
    item_description := format('PrepTest %s, Section %s. %s.', target_pt, target_section,
      case section_type when 'lr' then 'Logical Reasoning' else 'Reading Comprehension' end);
    item_meta := jsonb_build_object('pt', target_pt, 'section', target_section, 'section_kind', section_type, 'section_timing_mode', timing);
    select s.id into set_id from public.homework_sets s
      where s.created_by = p_actor and s.question_qids = qids and not coalesce(s.is_guided_set, false)
      order by (s.title = item_title) desc, s.created_at, s.id limit 1;
    set_created := set_id is null;
    select coalesce(jsonb_agg(jsonb_build_object('assignment_id', ha.id, 'classroom_item_id', ci.id,
      'status', ha.status) order by ha.id, ci.id), '[]') into duplicate_rows
    from public.homework_assignments ha
    left join public.classroom_items ci on ci.student_id = ha.student_id and ci.source_table = 'homework_assignments' and ci.source_id = ha.id::text
    where ha.student_id = p_student_id and ha.status <> 'completed' and ha.question_qids = qids
      and (section_type = 'lr' or (ha.section_kind = 'rc' and ha.section_preptest = target_pt and ha.section_number = target_section));

  elsif kind = 'guided_drill' then
    select * into drill from public.guided_drills where id = item_id::uuid;
    if not found then raise exception 'Guided drill not found' using errcode = '22023'; end if;
    item_title := drill.title;
    item_description := 'New guided drill: ' || drill.title;
    item_meta := jsonb_build_object('guided_drill_id', drill.id);
    revision := md5(to_jsonb(drill)::text);
    level := case when p_settings ? 'drill_level' then p_settings->>'drill_level' else student.proficiency_level end;
    question_count := (p_settings->>'question_count')::integer;
    if level not in ('beginner','intermediate','advanced') or question_count < 1 then
      raise exception 'Invalid guided-drill level or count' using errcode = '22023';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object('assignment_id', a.id, 'classroom_item_id', ci.id,
      'status', a.status) order by a.id, ci.id), '[]') into duplicate_rows
    from public.guided_drill_assignments a
    left join public.classroom_items ci on ci.student_id = a.student_id and ci.source_table = 'guided_drill_assignments' and ci.source_id = a.id::text
    where a.student_id = p_student_id and a.guided_drill_id = drill.id and a.status not in ('completed', 'archived', 'abandoned');

  elsif kind = 'activity' then
    select * into activity from public.activities where id = item_id::uuid;
    if not found then raise exception 'Activity not found' using errcode = '22023'; end if;
    item_title := activity.title;
    item_description := activity.subtitle;
    item_meta := jsonb_build_object('activity_id', activity.id);
    revision := md5(to_jsonb(activity)::text);
    activity_behavior := jsonb_build_object('mode', activity.mode, 'time_goal_minutes', activity.time_goal_minutes,
      'item_format', activity.item_format, 'source_section', activity.source_section);
    select coalesce(jsonb_agg(jsonb_build_object('assignment_id', a.id, 'classroom_item_id', ci.id,
      'status', a.status) order by a.id, ci.id), '[]') into duplicate_rows
    from public.activity_assignments a
    left join public.classroom_items ci on ci.student_id = a.student_id and ci.source_table = 'activity_assignments' and ci.source_id = a.id::text
    where a.student_id = p_student_id and a.activity_id = activity.id and a.status not in ('completed', 'archived', 'abandoned');

  elsif kind = 'bootcamp' then
    item_title := p_item->>'title';
    item_description := p_item->>'description';
    item_route := p_item->>'route';
    item_meta := p_item->'metadata';
    -- The app planner supplies the grant, but direct authenticated RPC callers
    -- are still confined to known curriculum routes and grant metadata.
    if coalesce(jsonb_typeof(item_meta), '') <> 'object'
      or item_meta->>'bootcamp_id' is distinct from item_id
      or item_meta - array['bootcamp_id','assigned_day_ids','conditional_target','conditional_target_key','conditional_requirements'] <> '{}'::jsonb
      or item_route is null or length(item_route) > 2000
      or not (case item_id
        when 'conditional-indicators-refresher' then item_route = '/conditional-indicators-refresher'
        when 'unless-drill' then item_route = '/quick-drills/unless-drill'
        when 'abstraction' then item_route = '/topics/abstract'
        when 'conditionals' then item_route ~ '^/bootcamp/conditionals(/practice|/lessons/[a-z0-9-]+)?(\?[a-zA-Z0-9%_.~+&=:-]+)?$'
        when 'principle-flaw' then item_route = '/bootcamp/principle-flaw'
        when 'intro-to-lr' then item_route = '/bootcamp/intro-to-lr'
        when 'causation-station' then item_route = '/bootcamp/causation-station'
        when 'fallacy-flaw' then item_route = '/bootcamp/fallacy-flaw'
        when 'rc-engaging-with-the-passage' then item_route = '/bootcamp/rc-engaging-with-the-passage'
        else false end)
      or (item_id <> 'conditionals' and item_meta ?| array['conditional_target','conditional_target_key','conditional_requirements'])
      or (item_id = 'conditionals' and (
        coalesce(jsonb_typeof(item_meta->'conditional_target'), '') <> 'object'
        or coalesce(item_meta->'conditional_target'->>'scope', '') not in ('course','stage','area','skill','general','activity')
        or length(coalesce(item_meta->>'conditional_target_key', '')) not between 1 and 250
        or item_route ~ '[?&]assignment='
        or (item_meta->'conditional_target' ? 'courseEdition' and (
          item_meta->'conditional_target'->>'courseEdition' is distinct from 'full-conditionals-v3'
          or item_meta->'conditional_target'->>'curriculumVersion' is distinct from '3'
          or item_route !~ '^/bootcamp/conditionals\?'
          or item_route !~ '[?&]edition=full-conditionals-v3(&|$)')))) then
      raise exception 'Invalid bootcamp assignment' using errcode = '22023';
    end if;
    days := item_meta->'assigned_day_ids';
    if days is not null and (
      item_id <> 'principle-flaw' or jsonb_typeof(days) <> 'array'
      or jsonb_array_length(days) not between 1 and 14
      or exists (select from jsonb_array_elements_text(days) d(day) where d.day !~ '^([1-9]|1[0-4])$')
    ) then
      raise exception 'Invalid assigned bootcamp days' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('assignment_id', null, 'classroom_item_id', c.id,
      'status', c.status) order by c.created_at, c.id), '[]') into duplicate_rows
    from public.classroom_items c
    where c.student_id = p_student_id and c.source_table = 'bootcamps' and c.type = 'bootcamp_module'
      and c.status not in ('completed', 'archived') and c.metadata_json->>'bootcamp_id' = item_id
      and (item_id <> 'conditionals' or
        (coalesce(c.metadata_json->>'conditional_target_key','course') = coalesce(item_meta->>'conditional_target_key','course')
          and c.metadata_json->'conditional_requirements' is not distinct from item_meta->'conditional_requirements'));
  else
    raise exception 'Unsupported teaching assignment kind' using errcode = '22023';
  end if;

  item_title := coalesce(nullif(btrim(p_settings->>'title'), ''), item_title);
  item_description := coalesce(nullif(btrim(p_settings->>'description'), ''), item_description);
  if coalesce(length(item_title), 0) not between 1 and 200 or length(item_description) > 4000 then
    raise exception 'Invalid Classroom title or description' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'student', jsonb_build_object('id', p_student_id, 'display_name', student.display_name),
    'kind', kind, 'catalog_id', item_id, 'title', item_title, 'description', item_description,
    'route', item_route, 'metadata', item_meta, 'source_revision', revision,
    'unlock_at', unlock_at, 'due_at', due_at, 'notification_requested', notify,
    'notification_window', case when not notify then 'none' when unlock_at > now() then 'future' else 'now' end,
    'schedule_date', p_settings->>'scheduled_for', 'time_zone', zone,
    'timing_mode', timing, 'question_order', qids, 'section_manifest', manifest,
    'set_id', set_id, 'would_create_set', set_created, 'drill_level', level,
    'question_count', coalesce(cardinality(qids), question_count, drill.question_count),
    'question_count_override', question_count, 'activity_behavior', activity_behavior,
    'duplicates', duplicate_rows, 'allow_repeat', allow_repeat, 'access_issue', access_issue);
end
$$;
revoke all on function public.mcp_teaching_assignment_plan(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;

create function public.mcp_preview_teaching_assignment(p_student_id uuid, p_item jsonb, p_settings jsonb)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  actor uuid := public.mcp_require_admin();
  plan jsonb := public.mcp_teaching_assignment_plan(actor, p_student_id, p_item, p_settings);
  future boolean := coalesce((plan->>'unlock_at')::timestamptz > now(), false);
  notify boolean := (plan->>'notification_requested')::boolean;
  blocked boolean := (jsonb_array_length(plan->'duplicates') > 0 and not (plan->>'allow_repeat')::boolean)
    or plan->>'access_issue' is not null;
begin
  return plan - array['section_manifest','source_revision','question_order'] || jsonb_build_object(
    'confirmation', md5(actor::text || plan::text),
    'notification', jsonb_build_object(
      'bell', case when blocked or not notify then 'none' when future then 'at_unlock' else 'requested_now' end,
      'inbox', case when blocked or not notify or future then 'none' else 'requested_now' end,
      'email', case when blocked or not notify or future then 'none' else 'requested_now' end));
end
$$;

create function public.mcp_read_teaching_assignment_receipt(p_student_id uuid, p_confirmation text, p_idempotency_key text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  actor uuid := public.mcp_require_admin();
  receipt jsonb;
begin
  select a.result into receipt from public.mcp_write_audit a
    where a.actor_id = actor and a.tool_name = 'assign_teaching_work' and a.idempotency_key = p_idempotency_key;
  if receipt is null then return null; end if;
  if receipt->>'student_id' is distinct from p_student_id::text or receipt->>'confirmation' is distinct from p_confirmation then
    raise exception 'This idempotency key belongs to a different approved assignment' using errcode = '22023';
  end if;
  return receipt - 'confirmation' || jsonb_build_object('reused', true);
end
$$;

create function public.mcp_execute_teaching_assignment(
  p_student_id uuid, p_item jsonb, p_settings jsonb, p_confirmation text, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor uuid := public.mcp_require_admin();
  kind text := p_item->>'kind';
  plan jsonb;
  receipt jsonb;
  unlock_at timestamptz;
  due_at timestamptz;
  notify boolean;
  delivery_policy text;
  delivery_group uuid := gen_random_uuid();
  set_id uuid;
  assignment_id uuid;
  classroom_item_id uuid := gen_random_uuid();
  assignment_type text;
  classroom_type text;
  source_table text;
  source_id text;
  item_route text;
  item_title text;
  item_description text;
  item_meta jsonb;
  qids text[];
  bell jsonb := jsonb_build_object('status','suppressed');
  inbox jsonb := jsonb_build_object('status','suppressed');
  email jsonb := jsonb_build_object('status','suppressed');
  bell_result jsonb;
  channels_claimed boolean := false;
  inbox_thread uuid;
  inbox_message uuid;
  email_claimed boolean := false;
begin
  if coalesce(length(p_idempotency_key), 0) not between 8 and 160 or p_idempotency_key <> btrim(p_idempotency_key)
    or coalesce(p_confirmation, '') !~ '^[a-f0-9]{32}$' then
    raise exception 'Use the approved preview confirmation and a stable idempotency key' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('mcp-teaching-key:' || actor::text || ':' || p_idempotency_key, 0));
  receipt := public.mcp_read_teaching_assignment_receipt(p_student_id, p_confirmation, p_idempotency_key);
  if receipt is not null then return receipt; end if;

  -- Separate keys for retries cannot create multiple active copies of an item.
  perform pg_advisory_xact_lock(hashtextextended('mcp-teaching-student:' || p_student_id::text, 0));
  if kind = 'prep_test_section' then
    perform pg_advisory_xact_lock(hashtextextended('mcp-section-set:' || (p_item->>'pt') || ':' || (p_item->>'section'), 0));
  end if;
  -- Lock catalog/profile rows before comparing the preview and reading the
  -- material to snapshot into the assignment.
  perform 1 from public.profiles p where p.class_id = p_student_id::text for share;
  if kind = 'guided_drill' then
    perform 1 from public.guided_drills where id = (p_item->>'id')::uuid for share;
  elsif kind = 'activity' then
    perform 1 from public.activities where id = (p_item->>'id')::uuid for share;
  elsif kind = 'prep_test_section' and p_item->>'section_type' = 'rc' then
    perform 1 from public.timed_section_configuration_v1 where singleton for share;
  end if;
  plan := public.mcp_teaching_assignment_plan(actor, p_student_id, p_item, p_settings);
  if md5(actor::text || plan::text) <> p_confirmation then
    raise exception 'Assignment preview changed. Refresh the preview before assigning.' using errcode = '40001';
  end if;
  if plan->>'access_issue' is not null then raise exception '%', plan->>'access_issue' using errcode = '42501'; end if;
  if jsonb_array_length(plan->'duplicates') > 0 and not (plan->>'allow_repeat')::boolean then
    return jsonb_build_object('ok', true, 'already_assigned', true, 'student_id', p_student_id,
      'duplicates', plan->'duplicates', 'notification', jsonb_build_object('bell', 'not_sent', 'inbox', 'not_sent', 'email', 'not_sent'));
  end if;

  unlock_at := (plan->>'unlock_at')::timestamptz;
  due_at := (plan->>'due_at')::timestamptz;
  notify := (plan->>'notification_requested')::boolean;
  delivery_policy := case when notify then 'managed' else 'suppressed' end;
  item_title := plan->>'title';
  item_description := plan->>'description';
  item_meta := plan->'metadata';
  if kind = 'prep_test_section' then
    select array(select jsonb_array_elements_text(plan->'question_order')) into qids;
    set_id := (plan->>'set_id')::uuid;
    if set_id is not null then
      perform 1 from public.homework_sets s where s.id = set_id and s.created_by = actor and s.question_qids = qids and not coalesce(s.is_guided_set, false) for share;
      if not found then raise exception 'Saved section changed. Refresh the preview.' using errcode = '40001'; end if;
    else
      insert into public.homework_sets (class_id, created_by, title, description, question_qids, estimated_minutes)
      values (actor, actor, format('%s (%s)', plan->>'catalog_id', upper(p_item->>'section_type')),
        'PrepTest ' || (p_item->>'pt') || ', Section ' || (p_item->>'section') || '.', qids, 35)
      returning id into set_id;
    end if;
    insert into public.homework_assignments (set_id, student_id, class_id, assigned_by, set_title,
      set_description, question_qids, status, unlock_at, section_timing_mode, section_kind, section_preptest,
      section_number, section_manifest_sha256, notification_policy, notification_group_id)
    values (set_id, p_student_id, p_student_id, actor, item_title, item_description, qids, 'assigned', unlock_at,
      plan->>'timing_mode', case when p_item->>'section_type' = 'rc' then 'rc' end,
      case when p_item->>'section_type' = 'rc' then (p_item->>'pt')::integer end,
      case when p_item->>'section_type' = 'rc' then (p_item->>'section')::integer end,
      plan->>'section_manifest', delivery_policy, delivery_group)
    returning id into assignment_id;
    assignment_type := 'timed section';
    classroom_type := 'homework';
    source_table := 'homework_assignments';
    source_id := assignment_id::text;
    item_route := case when p_item->>'section_type' = 'rc' then '/testing/sections/assigned/' else '/section/' end || source_id;
    item_meta := item_meta || jsonb_build_object('set_id', set_id);

  elsif kind = 'guided_drill' then
    insert into public.guided_drill_assignments (guided_drill_id, student_id, class_id, assigned_by,
      scheduled_for, unlock_at, status, level, question_count, notification_policy, notification_group_id)
    values ((p_item->>'id')::uuid, p_student_id, p_student_id, actor, (plan->>'schedule_date')::date,
      unlock_at, 'assigned', plan->>'drill_level', (plan->>'question_count_override')::integer, delivery_policy, delivery_group)
    returning id into assignment_id;
    assignment_type := 'guided drill';
    classroom_type := 'drill';
    source_table := 'guided_drill_assignments';
    source_id := assignment_id::text;
    item_route := '/guided/' || source_id || '?returnTo=%2Fclassroom';

  elsif kind = 'activity' then
    insert into public.activity_assignments (activity_id, student_id, class_id, assigned_by,
      title, subtitle, instructions, item_format, items, mode, time_goal_minutes, source_section, unlock_at,
      status, notification_policy, notification_group_id)
    select a.id, p_student_id, p_student_id, actor, a.title, a.subtitle, a.instructions,
      a.item_format, a.items, a.mode, a.time_goal_minutes, a.source_section, unlock_at, 'assigned', delivery_policy, delivery_group
    from public.activities a where a.id = (p_item->>'id')::uuid
    returning id into assignment_id;
    assignment_type := 'activity';
    classroom_type := 'activity';
    source_table := 'activity_assignments';
    source_id := assignment_id::text;
    item_route := '/activities/' || source_id;

  elsif kind = 'bootcamp' then
    assignment_type := 'bootcamp';
    classroom_type := 'bootcamp_module';
    source_table := 'bootcamps';
    item_route := plan->>'route';
    if item_meta->'conditional_target'->>'courseEdition' = 'full-conditionals-v3' then
      item_route := item_route || '&assignment=' || classroom_item_id::text;
    end if;
    source_id := item_route;
  end if;

  insert into public.classroom_items (id, student_id, created_by, type, title, description, source_table,
    source_id, status, visible_to_student, unlock_at, due_at, metadata_json, notification_policy, notification_group_id)
  values (classroom_item_id, p_student_id, actor, classroom_type, item_title, item_description,
    source_table, source_id, 'assigned', true, unlock_at, due_at, item_meta || jsonb_build_object('assigned_route', item_route),
    delivery_policy, delivery_group);

  if notify then
    begin
      bell_result := public.finalize_assignment_notification_group(delivery_group, 'New assignment: ' || item_title, item_description, item_route);
      bell := jsonb_build_object('group_id', delivery_group, 'status', case
        when (bell_result->>'delivered_count')::integer > 0 then 'sent'
        when (bell_result->>'pending_count')::integer > 0 then 'queued'
        else 'unverified' end);
    exception when others then
      bell := jsonb_build_object('group_id', delivery_group, 'status', 'failed');
    end;
    if unlock_at > now() then
      inbox := jsonb_build_object('status', 'omitted_for_scheduled_work');
      email := jsonb_build_object('status', 'omitted_for_scheduled_work');
    else
      inbox := jsonb_build_object('status', 'not_sent');
      email := jsonb_build_object('status', 'not_sent');
      if bell->>'status' = 'sent' then
        begin
          channels_claimed := public.claim_assignment_notification_channels(delivery_group);
        exception when others then
          inbox := jsonb_build_object('status', 'claim_failed');
          email := jsonb_build_object('status', 'claim_failed');
        end;
      end if;
      if channels_claimed then
        begin
          perform pg_advisory_xact_lock(hashtextextended('mcp-assignment-thread:' || actor::text || ':' || p_student_id::text, 0));
          inbox_thread := public.mcp_get_or_create_admin_student_conversation(actor, p_student_id);
          insert into public.messages (conversation_id, sender_id, body)
          values (inbox_thread, actor, 'New assignment: ' || item_title || E'\n\n' ||
            coalesce(item_description || E'\n\n', '') || 'View in your Classroom: ' || item_route)
          returning id into inbox_message;
          inbox := jsonb_build_object('status','sent','thread_id',inbox_thread,'message_id',inbox_message);
        exception when others then
          inbox := jsonb_build_object('status','failed');
        end;
        email_claimed := true;
        email := jsonb_build_object('status','claimed_delivery_unverified');
      end if;
    end if;
  end if;

  receipt := jsonb_build_object('ok', true, 'reused', false, 'student_id', p_student_id, 'kind', kind,
    'assignment_type', assignment_type, 'title', item_title, 'description', item_description,
    'catalog_id', plan->>'catalog_id', 'timing_mode', plan->>'timing_mode', 'question_count', plan->'question_count',
    'assignment_id', coalesce(assignment_id, classroom_item_id), 'set_id', set_id, 'route', item_route,
    'classroom', jsonb_build_object('id', classroom_item_id, 'type', classroom_type, 'title', item_title,
      'status', 'assigned', 'visible_to_student', true, 'unlock_at', unlock_at, 'due_at', due_at, 'route', item_route),
    'notification', jsonb_build_object('bell', bell, 'inbox', inbox, 'email', email));
  insert into public.mcp_write_audit (actor_id, tool_name, idempotency_key, student_id, result)
  values (actor, 'assign_teaching_work', p_idempotency_key, p_student_id, receipt || jsonb_build_object('confirmation', p_confirmation));
  return receipt || jsonb_build_object('email_claimed', email_claimed);
end
$$;

create function public.mcp_record_teaching_assignment_email(
  p_student_id uuid, p_confirmation text, p_idempotency_key text, p_ok boolean, p_error text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor uuid := public.mcp_require_admin();
  receipt jsonb;
begin
  update public.mcp_write_audit a set result = jsonb_set(a.result, '{notification,email}',
    jsonb_strip_nulls(jsonb_build_object('status', case when p_ok then 'sent' else 'failed' end,
      'error', case when not p_ok then left(p_error, 300) end)))
  where a.actor_id = actor and a.tool_name = 'assign_teaching_work' and a.idempotency_key = p_idempotency_key
    and a.student_id = p_student_id and a.result->>'confirmation' = p_confirmation
    and a.result#>>'{notification,email,status}' = 'claimed_delivery_unverified'
  returning a.result into receipt;
  if receipt is null then raise exception 'No email delivery claim for this assignment' using errcode = '22023'; end if;
  return receipt - 'confirmation';
end
$$;

revoke all on function public.mcp_preview_teaching_assignment(uuid, jsonb, jsonb),
  public.mcp_read_teaching_assignment_receipt(uuid, text, text),
  public.mcp_execute_teaching_assignment(uuid, jsonb, jsonb, text, text),
  public.mcp_record_teaching_assignment_email(uuid, text, text, boolean, text) from public, anon;
grant execute on function public.mcp_preview_teaching_assignment(uuid, jsonb, jsonb),
  public.mcp_read_teaching_assignment_receipt(uuid, text, text),
  public.mcp_execute_teaching_assignment(uuid, jsonb, jsonb, text, text),
  public.mcp_record_teaching_assignment_email(uuid, text, text, boolean, text) to authenticated;

-- Assigned RC can be scheduled through MCP. Keep the protected runner's
-- direct owner entry point behind the same opening time as the Classroom.
create or replace function public.timed_section_owned_homework_v1(p_owner uuid, p_assignment uuid)
returns public.homework_assignments
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  homework public.homework_assignments%rowtype;
begin
  select * into homework
  from public.homework_assignments
  where id = p_assignment and student_id = p_owner and section_kind = 'rc'
    and (unlock_at is null or unlock_at <= now());
  if not found then raise exception 'Assigned section unavailable' using errcode = 'PT401'; end if;
  perform 1 from public.profiles
  where class_id = p_owner::text and has_classroom_access and archived_at is null
  for share;
  if not found then raise exception 'Assigned section unavailable' using errcode = 'PT401'; end if;
  return homework;
end $$;
revoke all on function public.timed_section_owned_homework_v1(uuid, uuid) from public, anon, authenticated;
commit;

-- Run only against an empty disposable PostgreSQL database. These rows are synthetic.
\set ON_ERROR_STOP on
do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
create schema auth;
create table public.fixture_admins(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function public.has_role(who uuid, wanted text) returns boolean language sql stable as $$
 select wanted = 'admin' and exists(select from public.fixture_admins where id=who)
$$;
create function public.mcp_require_admin() returns uuid language plpgsql security definer as $$
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'admin authentication required' using errcode='42501'; end if;
 return auth.uid();
end $$;

create table public.profiles(class_id text primary key, display_name text, archived_at timestamptz,
 has_classroom_access boolean, has_drill_access boolean, has_activity_access boolean, has_bootcamp_access boolean, proficiency_level text);
create table public.timed_section_configuration_v1(singleton boolean, enabled boolean, manifest_sha256 text);
create table public.timed_section_content_manifests_v1(manifest_sha256 text, pt integer, section integer, kind text, definition jsonb);
create table public.guided_drills(id uuid primary key, title text, question_count integer);
create table public.activities(id uuid primary key, title text, subtitle text, instructions jsonb, item_format text,
 items jsonb, mode text, time_goal_minutes numeric, source_section text);
create table public.homework_sets(id uuid primary key default gen_random_uuid(), class_id uuid, created_by uuid,
 title text, description text, question_qids text[], estimated_minutes int, is_guided_set boolean default false, created_at timestamptz default now());
create table public.homework_assignments(id uuid primary key default gen_random_uuid(), set_id uuid, student_id uuid, class_id uuid,
 assigned_by uuid, set_title text, set_description text, question_qids text[], status text, unlock_at timestamptz,
 section_timing_mode text, section_kind text, section_preptest integer, section_number integer, section_manifest_sha256 text,
 notification_policy text, notification_group_id uuid);
create unique index homework_assignments_active_unique on public.homework_assignments(set_id, student_id) where status <> 'completed';
create table public.guided_drill_assignments(id uuid primary key default gen_random_uuid(), guided_drill_id uuid,
 student_id uuid, class_id uuid, assigned_by uuid, scheduled_for date, unlock_at timestamptz, status text,
 level text, question_count integer, notification_policy text, notification_group_id uuid);
create table public.activity_assignments(id uuid primary key default gen_random_uuid(), activity_id uuid,
 student_id uuid, class_id uuid, assigned_by uuid, title text, subtitle text, instructions jsonb, item_format text,
 items jsonb, mode text, time_goal_minutes numeric, source_section text, unlock_at timestamptz, status text,
 notification_policy text, notification_group_id uuid);
create table public.classroom_items(id uuid primary key default gen_random_uuid(), student_id uuid, created_by uuid,
 type text, title text, description text, source_table text, source_id text, status text, visible_to_student boolean,
 unlock_at timestamptz, due_at timestamptz, metadata_json jsonb, notification_policy text, notification_group_id uuid,
 created_at timestamptz default now());
create table public.mcp_write_audit(actor_id uuid, tool_name text, idempotency_key text, student_id uuid, result jsonb,
 unique(actor_id, tool_name, idempotency_key));
create table public.messages(id uuid primary key default gen_random_uuid(), conversation_id uuid, sender_id uuid, body text);
create table public.fixture_bell(group_id uuid primary key);
create table public.fixture_channel_claim(group_id uuid primary key);
-- Minimal contracts for existing delivery RPCs. The mock bell records actual
-- requested deliveries and does not simulate the production release engine.
create function public.finalize_assignment_notification_group(group_id uuid, text, text, text) returns jsonb language plpgsql as $$
begin
 if exists(select from public.classroom_items c where c.notification_group_id = group_id and c.unlock_at > now()) then
  return '{"delivered_count":0,"pending_count":1}';
 end if;
 insert into public.fixture_bell values(group_id);
 return '{"delivered_count":1,"pending_count":0}';
end $$;
create function public.claim_assignment_notification_channels(group_id uuid) returns boolean language plpgsql as $$
begin
 insert into public.fixture_channel_claim values(group_id) on conflict do nothing;
 return found;
end $$;
create function public.mcp_get_or_create_admin_student_conversation(uuid,uuid) returns uuid language sql as $$
 select '30000000-0000-4000-8000-000000000001'::uuid
$$;

\ir ../../supabase/migrations/20261127205500_mcp_lr_section_catalog.sql
\ir ../../supabase/migrations/20261127210000_mcp_teaching_assignments.sql

insert into public.fixture_admins values ('10000000-0000-4000-8000-000000000001');
insert into public.profiles values
 ('10000000-0000-4000-8000-000000000001','Fixture Teacher',null,true,true,true,true,null),
 ('20000000-0000-4000-8000-000000000001','Fixture Student Alpha',null,true,true,true,true,'advanced'),
 ('20000000-0000-4000-8000-000000000002','Fixture Student Beta',null,true,true,true,true,'intermediate');
insert into public.guided_drills values ('40000000-0000-4000-8000-000000000001','Fixture Guided Drill',12);
insert into public.activities values ('50000000-0000-4000-8000-000000000001','Fixture Activity','Activity instructions',
 '{"steps":["Read","Recall"]}', 'text', '["original"]','timed',5,'PT150.S2');
insert into public.timed_section_configuration_v1 values (true,true,repeat('a',64));
insert into public.timed_section_content_manifests_v1 values
 (repeat('a',64),150,1,'rc','{"qids":["1","2"]}');

grant usage on schema auth to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);
do $$ begin
  begin
    perform public.mcp_preview_teaching_assignment('20000000-0000-4000-8000-000000000001','{}','{}');
    raise exception 'non-admin unexpectedly previewed';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.mcp_lr_section_catalog;
    raise exception 'learner unexpectedly read private canonical catalog';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $$
declare
  alpha uuid := '20000000-0000-4000-8000-000000000001';
  beta uuid := '20000000-0000-4000-8000-000000000002';
  pt150 jsonb := jsonb_build_object('kind','prep_test_section','pt',150,'section',2,'section_type','lr',
    'question_ids', (select jsonb_agg(format('PT150-S2-Q%s', i) order by i) from generate_series(1,25) i));
  rc jsonb := '{"kind":"prep_test_section","pt":150,"section":1,"section_type":"rc","question_ids":["1","2"]}';
  drill jsonb := '{"kind":"guided_drill","id":"40000000-0000-4000-8000-000000000001"}';
  activity jsonb := '{"kind":"activity","id":"50000000-0000-4000-8000-000000000001"}';
  bootcamp jsonb := '{"kind":"bootcamp","id":"principle-flaw","title":"Principle & Flaw","route":"/bootcamp/principle-flaw","metadata":{"bootcamp_id":"principle-flaw","assigned_day_ids":[2,4]}}';
  settings jsonb;
  preview jsonb;
  out jsonb;
  retry jsonb;
  first_set uuid;
  card uuid;
begin
  preview := public.mcp_preview_teaching_assignment(alpha,pt150,'{}');
  assert preview#>>'{student,display_name}' = 'Fixture Student Alpha';
  assert (preview->>'question_count')::int = 25;
  assert preview->>'timing_mode' = '35';
  assert preview->>'would_create_set' = 'true';
  assert preview#>>'{notification,email}' = 'requested_now';
  assert (select count(*) from public.classroom_items) = 0;
  assert (select count(*) from public.homework_sets) = 0;

  begin
    perform public.mcp_execute_teaching_assignment(alpha,pt150,'{"notify":false}',preview->>'confirmation','pt150-lr-fixture');
    raise exception 'altered preview unexpectedly executed';
  exception when serialization_failure then null; end;

  out := public.mcp_execute_teaching_assignment(alpha,pt150,'{}',preview->>'confirmation','pt150-lr-fixture');
  first_set := (out->>'set_id')::uuid;
  card := (out#>>'{classroom,id}')::uuid;
  assert out->>'route' = '/section/' || (out->>'assignment_id');
  assert out#>>'{notification,bell,status}' = 'sent';
  assert out#>>'{notification,inbox,status}' = 'sent';
  assert out#>>'{notification,email,status}' = 'claimed_delivery_unverified';
  assert out->>'email_claimed' = 'true';
  assert exists(select from public.homework_assignments h where h.id = (out->>'assignment_id')::uuid
    and h.student_id=alpha and h.class_id=alpha and h.section_timing_mode='35'
    and to_jsonb(h.question_qids)=pt150->'question_ids');
  assert exists(select from public.classroom_items c where c.id=card and c.student_id=alpha and c.visible_to_student
    and c.type='homework' and c.metadata_json->>'assigned_route'=out->>'route');

  out := public.mcp_record_teaching_assignment_email(alpha,preview->>'confirmation','pt150-lr-fixture',true,null);
  assert out#>>'{notification,email,status}' = 'sent';
  retry := public.mcp_execute_teaching_assignment(alpha,pt150,'{}',preview->>'confirmation','pt150-lr-fixture');
  assert retry->>'reused' = 'true';
  assert retry->>'email_claimed' is null;
  assert retry->>'assignment_id' = out->>'assignment_id';
  assert retry#>>'{notification,email,status}' = 'sent';
  assert (select count(*) from public.homework_assignments) = 1;
  assert (select count(*) from public.homework_sets) = 1;
  assert (select count(*) from public.messages) = 1;
  assert (select count(*) from public.fixture_bell) = 1;

  preview := public.mcp_preview_teaching_assignment(alpha,pt150,'{}');
  assert jsonb_array_length(preview->'duplicates') = 1;
  out := public.mcp_execute_teaching_assignment(alpha,pt150,'{}',preview->>'confirmation','pt150-second-key');
  assert out->>'already_assigned' = 'true';
  assert (select count(*) from public.messages) = 1;

  preview := public.mcp_preview_teaching_assignment(beta,pt150,'{"notify":false}');
  assert preview->>'would_create_set' = 'false';
  assert preview->>'set_id' = first_set::text;
  out := public.mcp_execute_teaching_assignment(beta,pt150,'{"notify":false}',preview->>'confirmation','pt150-other-student');
  assert out->>'set_id' = first_set::text;
  assert (select count(*) from public.homework_sets) = 1;

  update public.homework_assignments set status='completed' where student_id=alpha and set_id=first_set;
  preview := public.mcp_preview_teaching_assignment(alpha,pt150,'{"notify":false}');
  assert jsonb_array_length(preview->'duplicates') = 0;
  out := public.mcp_execute_teaching_assignment(alpha,pt150,'{"notify":false}',preview->>'confirmation','pt150-reissue-fixture');
  assert out->>'set_id' = first_set::text;
  assert (select count(*) from public.homework_assignments where student_id=alpha and set_id=first_set) = 2;

  begin
    perform public.mcp_preview_teaching_assignment(alpha, bootcamp || '{"id":"uncatalogued","route":"/bootcamp/uncatalogued","metadata":{"bootcamp_id":"uncatalogued"}}', '{}');
    raise exception 'uncatalogued bootcamp unexpectedly previewed';
  exception when invalid_parameter_value then null; end;

  settings := '{"notify":true,"scheduled_for":"2099-07-07","due_on":"2099-07-08","time_zone":"America/Toronto","drill_level":"beginner","question_count":5}';
  preview := public.mcp_preview_teaching_assignment(alpha,drill,settings);
  assert preview#>>'{notification,bell}' = 'at_unlock';
  assert preview#>>'{notification,inbox}' = 'none';
  assert (preview->>'unlock_at')::timestamptz = '2099-07-07 04:00+00'::timestamptz;
  assert (preview->>'due_at')::timestamptz = '2099-07-09 03:59:59+00'::timestamptz;
  out := public.mcp_execute_teaching_assignment(alpha,drill,settings,preview->>'confirmation','guided-drill-fixture');
  assert out#>>'{notification,bell,status}' = 'queued';
  assert out#>>'{notification,inbox,status}' = 'omitted_for_scheduled_work';
  assert exists(select from public.guided_drill_assignments d where d.id = (out->>'assignment_id')::uuid
    and d.level='beginner' and d.question_count=5 and d.scheduled_for='2099-07-07'::date);

  settings := '{"notify":false,"allow_repeat":true}';
  preview := public.mcp_preview_teaching_assignment(alpha,drill,settings);
  assert preview->>'allow_repeat' = 'true' and jsonb_array_length(preview->'duplicates') = 1;
  out := public.mcp_execute_teaching_assignment(alpha,drill,settings,preview->>'confirmation','guided-repeat-fixture');
  retry := public.mcp_execute_teaching_assignment(alpha,drill,settings,preview->>'confirmation','guided-repeat-fixture');
  assert retry->>'assignment_id' = out->>'assignment_id' and retry->>'reused' = 'true';
  assert (select count(*) from public.guided_drill_assignments) = 2;
  preview := public.mcp_preview_teaching_assignment(alpha,activity,'{"notify":false}');
  out := public.mcp_execute_teaching_assignment(alpha,activity,'{"notify":false}',preview->>'confirmation','activity-fixture');
  assert out#>>'{notification,email,status}' = 'suppressed';
  update public.activities set items='["edited"]';
  assert exists(select from public.activity_assignments a where a.id = (out->>'assignment_id')::uuid
    and a.items='["original"]' and a.mode='timed' and a.time_goal_minutes=5);

  preview := public.mcp_preview_teaching_assignment(alpha,bootcamp,'{"notify":false}');
  out := public.mcp_execute_teaching_assignment(alpha,bootcamp,'{"notify":false}',preview->>'confirmation','bootcamp-fixture');
  assert exists(select from public.classroom_items c where c.id=(out#>>'{classroom,id}')::uuid
    and c.metadata_json->'assigned_day_ids'='[2,4]' and c.source_table='bootcamps');

  preview := public.mcp_preview_teaching_assignment(alpha,rc,'{"notify":false}');
  out := public.mcp_execute_teaching_assignment(alpha,rc,'{"notify":false}',preview->>'confirmation','rc-section-fixture');
  assert out->>'route' = '/testing/sections/assigned/' || (out->>'assignment_id');
  assert exists(select from public.homework_assignments h where h.id=(out->>'assignment_id')::uuid
    and h.section_kind='rc' and h.section_manifest_sha256=repeat('a',64) and h.question_qids=array['1','2']);

  settings := '{"notify":false,"scheduled_for":"2099-07-07","time_zone":"America/Toronto"}';
  preview := public.mcp_preview_teaching_assignment(beta,rc,settings);
  out := public.mcp_execute_teaching_assignment(beta,rc,settings,preview->>'confirmation','rc-scheduled-fixture');
  begin
    perform public.timed_section_owned_homework_v1(beta,(out->>'assignment_id')::uuid);
    raise exception 'future RC section unexpectedly opened';
  exception when sqlstate 'PT401' then null; end;
  begin
    perform public.mcp_preview_teaching_assignment(auth.uid(),pt150,'{}');
    raise exception 'teacher selected as student';
  exception when invalid_parameter_value then null; end;
end $$;
select 'MCP assignment regression fixture passed' as outcome;

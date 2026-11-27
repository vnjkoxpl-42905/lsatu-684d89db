-- Bind approved RC homework to the existing protected section writer.
begin;

alter table public.timed_section_sittings_v1
  add column homework_assignment_id uuid references public.homework_assignments(id) on delete restrict,
  drop constraint timed_section_sittings_v1_source_kind_check,
  drop constraint timed_section_sittings_v1_check,
  add constraint timed_section_source_identity_v1 check (
    (source_kind = 'manual-canonical' and homework_assignment_id is null
      and source_key = kind || '::pt' || pt::text || '-s' || section::text)
    or
    (source_kind = 'assigned-canonical' and kind = 'rc' and homework_assignment_id is not null
      and source_key = 'assignment::' || homework_assignment_id::text)
  );

-- Keep completed work resumable in results. An intentionally abandoned attempt
-- may be replaced, but an open or completed attempt always wins a retry.
create unique index timed_section_current_homework_sitting_v1
  on public.timed_section_sittings_v1(homework_assignment_id)
  where homework_assignment_id is not null and phase <> 'abandoned';

create function public.timed_section_owned_homework_v1(p_owner uuid, p_assignment uuid)
returns public.homework_assignments
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  homework public.homework_assignments%rowtype;
begin
  select * into homework
  from public.homework_assignments
  where id = p_assignment and student_id = p_owner and section_kind = 'rc';
  if not found then
    raise exception 'Assigned section unavailable' using errcode = 'PT401';
  end if;
  perform 1 from public.profiles
  where class_id = p_owner::text and has_classroom_access and archived_at is null
  for share;
  if not found then
    raise exception 'Assigned section unavailable' using errcode = 'PT401';
  end if;
  return homework;
end $$;

revoke all on function public.timed_section_owned_homework_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.timed_section_owned_homework_v1(uuid, uuid) to timed_section_executor;

-- Lovable Cloud's migration role is not superuser and has the executor's
-- ADMIN option but cannot SET it. Restore the previous membership and ACL.
create temporary table rc_homework_executor_membership_v1 on commit drop as
select current_user::text as migration_role, membership.admin_option, membership.set_option,
  membership.inherit_option,
  has_schema_privilege('timed_section_executor', 'public', 'CREATE') as had_schema_create,
  not pg_has_role(current_user, 'timed_section_executor', 'SET') as needed_set
from (select 1) seed
left join pg_auth_members membership
  on membership.roleid = 'timed_section_executor'::regrole
  and membership.member = current_user::regrole and membership.grantor = current_user::regrole;
grant select on rc_homework_executor_membership_v1 to timed_section_executor;
do $migration$
declare state record;
begin
  select * into state from rc_homework_executor_membership_v1;
  if state.needed_set then
    execute format('grant timed_section_executor to %I with set true', state.migration_role);
  end if;
  if not state.had_schema_create then grant create on schema public to timed_section_executor; end if;
end $migration$;
set local role timed_section_executor;

-- Keep all manual state transitions and clock arithmetic in their sole writer.
-- The installed read and commit functions each have one manual-access gate.
-- Extend that gate for assigned work, failing the migration if it has drifted.
do $migration$
declare
  signature regprocedure;
  definition text;
  original text := 'perform public.timed_section_require_access_v1(actor);';
  extended text := $gate$
    if r.source_kind = 'assigned-canonical' then
      perform public.timed_section_owned_homework_v1(actor, r.homework_assignment_id);
    else
      perform public.timed_section_require_access_v1(actor);
    end if;
  $gate$;
begin
  foreach signature in array array[
    'public.commit_timed_section_v1(jsonb)'::regprocedure,
    'public.read_timed_section_v1(uuid)'::regprocedure
  ] loop
    definition := pg_get_functiondef(signature);
    if length(definition) - length(replace(definition, original, '')) <> length(original) then
      raise exception 'Unexpected protected access gate for %', signature;
    end if;
    execute replace(definition, original, extended);
  end loop;
end $migration$;

create function public.start_assigned_timed_section_v1(
  p_assignment_id uuid, p_client_launch_id uuid, p_device_id text
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor uuid := public.timed_pt_actor_v1();
  homework public.homework_assignments%rowtype;
  sitting public.timed_section_sittings_v1%rowtype;
  receipt public.timed_section_receipts_v1%rowtype;
  configuration public.timed_section_configuration_v1%rowtype;
  definition jsonb;
  pace text;
  budget bigint;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = 'PT401';
  end if;
  if p_assignment_id is null or p_client_launch_id is null
    or coalesce(length(p_device_id), 0) not between 1 and 128 then
    raise exception 'Assignment, launch and device identities are required' using errcode = 'PT422';
  end if;

  -- The unique index is the backstop. Serialize allocation across devices,
  -- including retries with a distinct launch id, before checking for a row.
  perform pg_advisory_xact_lock(hashtextextended('timed-assignment:' || p_assignment_id::text, 0));
  homework := public.timed_section_owned_homework_v1(actor, p_assignment_id);

  select * into sitting from public.timed_section_sittings_v1
  where homework_assignment_id = p_assignment_id and owner_id = actor and phase <> 'abandoned';
  if found then
    select * into receipt from public.timed_section_receipts_v1
    where sitting_id = sitting.id and owner_id = actor and command_id = p_client_launch_id;
    if found and (receipt.result->>'operation' is distinct from 'create-assigned'
      or receipt.canonical_command->>'deviceId' is distinct from p_device_id) then
      raise exception 'Changed command replay' using errcode = 'PT412';
    end if;
    return public.timed_section_response_v1(sitting, receipt, true);
  end if;
  if homework.status = 'completed' then
    raise exception 'Assignment is already complete' using errcode = 'PT409';
  end if;

  select * into configuration from public.timed_section_configuration_v1 where singleton for share;
  if not coalesce(configuration.enabled, false) then
    raise exception 'Protected section writer is unavailable' using errcode = 'PT503';
  end if;
  select manifest.definition into definition from public.timed_section_content_manifests_v1 manifest
  where manifest.manifest_sha256 = homework.section_manifest_sha256
    and manifest.pt = homework.section_preptest and manifest.section = homework.section_number and manifest.kind = 'rc';
  if definition is null or to_jsonb(homework.question_qids) is distinct from definition->'qids' then
    raise exception 'Approved RC section is unavailable' using errcode = 'PT422';
  end if;

  case homework.section_timing_mode
    when '35' then pace := 'standard'; budget := 2100000;
    when '52.5' then pace := 'time-and-a-half'; budget := 3150000;
    when '70' then pace := 'double-time'; budget := 4200000;
    when 'unlimited' then pace := 'untimed'; budget := null;
    else raise exception 'Approved section timing is unavailable' using errcode = 'PT422';
  end case;

  insert into public.timed_section_sittings_v1(
    id, owner_id, kind, source_kind, source_key, homework_assignment_id, pt, section,
    manifest_sha256, frozen_source, frozen_qids, pace, budget_ms, lease_ms, device_id
  ) values (
    gen_random_uuid(), actor, 'rc', 'assigned-canonical', 'assignment::' || homework.id::text,
    homework.id, homework.section_preptest, homework.section_number,
    homework.section_manifest_sha256, definition, homework.question_qids,
    pace, budget, configuration.lease_ms, p_device_id
  ) returning * into sitting;
  insert into public.timed_section_receipts_v1(
    owner_id, sitting_id, command_id, canonical_command, committed_revision, result
  ) values (
    actor, sitting.id, p_client_launch_id,
    jsonb_build_object('workKind', 'standalone-section', 'workId', sitting.id,
      'commandId', p_client_launch_id, 'deviceId', p_device_id, 'expectedRevision', 0,
      'writerEpoch', 0, 'operation', 'create', 'payload', jsonb_build_object(
        'kind', 'rc', 'pt', sitting.pt, 'section', sitting.section, 'pace', pace)),
    sitting.revision, jsonb_build_object('operation', 'create-assigned')
  ) returning * into receipt;
  return public.timed_section_response_v1(sitting, receipt, false);
end $$;

revoke all on function public.start_assigned_timed_section_v1(uuid, uuid, text) from public, anon;
grant execute on function public.start_assigned_timed_section_v1(uuid, uuid, text) to authenticated;

do $migration$
declare state record;
begin
  select * into state from rc_homework_executor_membership_v1;
  execute format('set local role %I', state.migration_role);
end $migration$;
do $migration$
declare state record;
begin
  select * into state from rc_homework_executor_membership_v1;
  if not state.had_schema_create then revoke create on schema public from timed_section_executor; end if;
  if state.needed_set and state.admin_option is null then
    execute format('revoke timed_section_executor from %I', state.migration_role);
  elsif state.needed_set then
    execute format('grant timed_section_executor to %I with set %s', state.migration_role, case when state.set_option then 'true' else 'false' end);
    execute format('grant timed_section_executor to %I with inherit %s', state.migration_role, case when state.inherit_option then 'true' else 'false' end);
  end if;
end $migration$;

create function public.guard_rc_homework_sitting_completion_v1() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare sitting public.timed_section_sittings_v1%rowtype;
begin
  if old.section_kind is distinct from 'rc'
    or (new.status, new.started_at, new.completed_at, new.score)
      is not distinct from (old.status, old.started_at, old.completed_at, old.score) then
    return new;
  end if;
  select * into sitting from public.timed_section_sittings_v1
  where homework_assignment_id = old.id and owner_id = old.student_id and phase <> 'abandoned';
  if found and (
    (old.status = 'assigned' and new.status = 'in_progress' and sitting.phase = 'running'
      and new.started_at is not distinct from coalesce(old.started_at, sitting.updated_at)
      and (new.completed_at, new.score) is not distinct from (old.completed_at, old.score))
    or
    (old.status = 'in_progress' and new.status = 'completed' and sitting.phase = 'complete'
      and new.started_at is not distinct from old.started_at
      and new.completed_at is not distinct from sitting.completed_at
      and new.score is not distinct from
        round(100.0 * (sitting.result->>'correct')::integer / nullif((sitting.result->>'total')::integer, 0), 2))
  ) then
    return new;
  end if;
  raise exception 'Assigned RC progress requires a matching protected section transition' using errcode = '42501';
end $$;
revoke all on function public.guard_rc_homework_sitting_completion_v1() from public, anon, authenticated;
create trigger guard_rc_homework_sitting_completion_v1
  before update of status, started_at, completed_at, score on public.homework_assignments
  for each row execute function public.guard_rc_homework_sitting_completion_v1();

create function public.sync_rc_homework_sitting_completion_v1() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.phase = 'running' and old.phase = 'ready' then
    update public.homework_assignments set
      status = 'in_progress', started_at = coalesce(started_at, new.updated_at)
    where id = new.homework_assignment_id and student_id = new.owner_id and section_kind = 'rc'
      and status in ('assigned', 'in_progress');
    if not found then
      raise exception 'Section assignment can no longer start' using errcode = 'PT409';
    end if;
    update public.classroom_items set status = 'in_progress'
    where source_table = 'homework_assignments' and source_id = new.homework_assignment_id
      and student_id = new.owner_id and status = 'assigned';
  elsif new.phase = 'complete' then
    update public.homework_assignments set
      status = 'completed', completed_at = new.completed_at,
      score = round(100.0 * (new.result->>'correct')::integer / nullif((new.result->>'total')::integer, 0), 2)
    where id = new.homework_assignment_id and student_id = new.owner_id
      and section_kind = 'rc' and status = 'in_progress';
    if not found then
      raise exception 'Section assignment can no longer complete' using errcode = 'PT409';
    end if;
    update public.classroom_items set status = 'completed', completed_at = new.completed_at
    where source_table = 'homework_assignments' and source_id = new.homework_assignment_id
      and student_id = new.owner_id and status in ('assigned', 'in_progress');
  end if;
  return new;
end $$;
revoke all on function public.sync_rc_homework_sitting_completion_v1() from public, anon, authenticated;
create trigger sync_rc_homework_sitting_completion_v1
  after update of phase on public.timed_section_sittings_v1
  for each row when (new.homework_assignment_id is not null and old.phase is distinct from new.phase)
  execute function public.sync_rc_homework_sitting_completion_v1();

commit;

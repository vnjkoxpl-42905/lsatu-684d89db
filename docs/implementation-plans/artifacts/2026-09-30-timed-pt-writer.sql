-- INACTIVE DRAFT. Apply only after the control foundation and complete review.
-- No deployment authorization. Configuration starts disabled with no lease.
begin;
create table public.timed_content_manifests_v1 (
  manifest_sha256 text not null check(manifest_sha256 ~ '^[a-f0-9]{64}$'),
  pt integer not null,
  blueprint jsonb not null check(jsonb_typeof(blueprint)='object'),
  primary key(manifest_sha256,pt)
);
create table public.timed_pt_configuration_v1 (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  manifest_sha256 text,
  lease_ms integer,
  check(not enabled or (manifest_sha256 ~ '^[a-f0-9]{64}$' and lease_ms>0) is true)
);
insert into public.timed_pt_configuration_v1(singleton) values(true);
alter table public.practice_test_runs add column timed_manifest_sha256 text,
  add column timed_manifest jsonb;
alter table public.practice_test_runs add constraint timed_pt_manifest_pair_v1 check(
  (timed_contract_version is null and timed_manifest_sha256 is null and timed_manifest is null)
  or (timed_contract_version=1 and timed_manifest_sha256 ~ '^[a-f0-9]{64}$'
    and jsonb_typeof(timed_manifest)='object'
    and timed_manifest->>'pt'=pt::text
    and timed_frozen_legs=public.timed_pt_leg_definitions_v1(timed_manifest->'legs')) is true
);
-- New protected attempts have stable source attribution; legacy attempts stay null.
alter table public.attempts add column timed_pt_run_id text, add column timed_pt_leg integer;
alter table public.attempts add constraint timed_lr_attempt_pair_v1 check(
  (timed_pt_run_id is null)=(timed_pt_leg is null));
alter table public.attempts add constraint timed_lr_attempt_owner_v1 check(
  timed_pt_run_id is null or user_id is not null);
alter table public.attempts add constraint timed_lr_attempt_parent_v1 foreign key(timed_pt_run_id,user_id)
  references public.practice_test_runs(id,user_id);
create unique index timed_lr_attempt_once_v1 on public.attempts(timed_pt_run_id,timed_pt_leg,qid)
  where timed_pt_run_id is not null;

alter table public.timed_content_manifests_v1 enable row level security;
alter table public.timed_pt_configuration_v1 enable row level security;
revoke all on public.timed_content_manifests_v1,public.timed_pt_configuration_v1 from public,anon,authenticated;
grant select on public.timed_content_manifests_v1 to timed_pt_executor;
-- SELECT FOR SHARE requires UPDATE privilege; no UPDATE RLS policy is granted.
grant select,update on public.timed_pt_configuration_v1 to timed_pt_executor;
create policy manifest_executor_read on public.timed_content_manifests_v1 for select to timed_pt_executor using(true);
create policy configuration_executor_read on public.timed_pt_configuration_v1 for select to timed_pt_executor using(true);
create policy configuration_executor_lock on public.timed_pt_configuration_v1 for update to timed_pt_executor using(true) with check(false);

-- Grant-row share locks conflict with updates/deletes by ordinary revocation
-- paths. Parent -> administrator row -> profile row -> exact assignment order.
create function public.timed_pt_require_access_v1(p_owner uuid,p_pt integer) returns void
language plpgsql set search_path=pg_catalog,public as $$
begin
  perform 1 from public.user_roles where user_id=p_owner and role::text='admin' order by id for share;
  if found then return; end if;
  perform 1 from public.profiles where class_id=p_owner::text and has_practice_access for share;
  if found then return; end if;
  perform 1 from public.practice_test_assignments where student_id=p_owner and pt=p_pt
    and status<>'archived' and (unlock_at is null or unlock_at<=clock_timestamp()) for share;
  if found then return; end if;
  raise exception 'Practice test access unavailable' using errcode='PT401';
end $$;

create function public.timed_pt_check_keys_v1(p_value jsonb,p_keys text[]) returns void
language plpgsql immutable set search_path=pg_catalog as $$
begin
  if jsonb_typeof(p_value) is distinct from 'object' or exists(
    select 1 from jsonb_object_keys(p_value) k where not k=any(p_keys)) then
    raise exception 'Unknown command fields' using errcode='PT422';
  end if;
end $$;

create function public.timed_pt_checkpoint_v1(p_run public.practice_test_runs) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare b public.timed_pt_lr_bindings_v1; s public.rc_drill_sessions;
begin
  select * into b from public.timed_pt_lr_bindings_v1 where run_id=p_run.id and leg_index=p_run.current_leg;
  if found then
    return (select jsonb_build_object('kind','lr','record',data) from public.bootcamp_kv
      where user_id=p_run.user_id and table_name=b.namespace and record_id=b.record_id);
  end if;
  select * into s from public.rc_drill_sessions where practice_test_run_id=p_run.id
    and practice_test_leg=p_run.current_leg and user_id=p_run.user_id;
  if found then return jsonb_build_object('kind','rc','session',to_jsonb(s),'attempts',
    coalesce((select jsonb_agg(to_jsonb(a) order by a.question_id) from public.rc_attempts a
      where a.session_id=s.id and a.user_id=p_run.user_id),'[]'::jsonb)); end if;
  return null;
end $$;

create function public.timed_pt_response_v1(p_run public.practice_test_runs,p_receipt public.timed_pt_receipts_v1,p_replayed boolean)
returns jsonb language sql set search_path=pg_catalog,public as $$
  select jsonb_build_object('receipt',jsonb_build_object('ownerId',p_receipt.owner_id,
    'workKind',p_receipt.work_kind,'workId',p_receipt.work_id,'commandId',p_receipt.command_id,
    'operation',p_receipt.canonical_command->>'operation','command',p_receipt.canonical_command,
    'committedRevision',p_receipt.committed_revision,'result',p_receipt.committed_result),
    'parent',to_jsonb(p_run),'checkpoint',public.timed_pt_checkpoint_v1(p_run),
    'serverTime',clock_timestamp(),'replayed',p_replayed)
$$;

create function public.timed_practice_test_capability_v1() returns jsonb
language sql security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('contractVersion',1,'workKind','practice-test','enabled',
    public.timed_pt_actor_v1() is not null and coalesce((select enabled from public.timed_pt_configuration_v1 where singleton),false),
    'operations',jsonb_build_array('read','create','claim','start-leg','checkpoint','heartbeat','pause','resume','close-leg','start-break','finish-break','abandon'))
$$;

create function public.create_timed_practice_test_v1(p_command jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor uuid:=public.timed_pt_actor_v1(); c public.timed_pt_configuration_v1; r public.practice_test_runs;
  rec public.timed_pt_receipts_v1; manifest jsonb; legs jsonb; payload jsonb:=p_command->'payload';
  cid uuid; work_id text:=p_command->>'workId'; pace text:=payload->>'pace'; seconds integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode='PT401'; end if;
  perform public.timed_pt_check_keys_v1(p_command,array['workKind','workId','commandId','deviceId','expectedRevision','writerEpoch','operation','payload']);
  perform public.timed_pt_check_keys_v1(payload,array['pt','pace','sectionSeconds']);
  if p_command->>'workKind' is distinct from 'practice-test' or p_command->>'operation' is distinct from 'create'
    or jsonb_typeof(p_command->'workId') is distinct from 'string' or jsonb_typeof(p_command->'deviceId') is distinct from 'string'
    or jsonb_typeof(p_command->'commandId') is distinct from 'string'
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number' or jsonb_typeof(p_command->'writerEpoch') is distinct from 'number'
    or jsonb_typeof(payload->'pt') is distinct from 'number' or payload->>'pt' !~ '^[0-9]+$'
    or jsonb_typeof(payload->'pace') is distinct from 'string'
    or not payload ? 'sectionSeconds' or (pace<>'untimed' and (jsonb_typeof(payload->'sectionSeconds') is distinct from 'number' or payload->>'sectionSeconds' !~ '^[0-9]+$'))
    or (pace='untimed' and jsonb_typeof(payload->'sectionSeconds') is distinct from 'null')
    or coalesce(length(work_id),0) not between 1 and 128 or work_id like '%::%'
    or coalesce(length(p_command->>'deviceId'),0) not between 1 and 128
    or p_command->>'expectedRevision' is distinct from '0' or p_command->>'writerEpoch' is distinct from '0'
    or pace is null or pace not in ('standard','time-and-a-half','double-time','untimed') then
    raise exception 'Invalid creation envelope' using errcode='PT422'; end if;
  cid:=(p_command->>'commandId')::uuid;
  if cid is null then raise exception 'Command identity required' using errcode='PT422'; end if;
  -- Serialize missing-row creation as well as subsequent row commands.
  perform pg_advisory_xact_lock(hashtextextended(actor::text||'::'||work_id,0));
  select * into r from public.practice_test_runs where id=work_id and user_id=actor for update;
  if found then
    select * into rec from public.timed_pt_receipts_v1 receipt where receipt.owner_id=actor and receipt.work_kind='practice-test'
      and receipt.work_id=r.id and receipt.command_id=cid;
    if found then
      if rec.canonical_command<>p_command then raise exception 'Changed command replay' using errcode='PT412'; end if;
      return public.timed_pt_response_v1(r,rec,true);
    end if;
    raise exception 'Work identity already exists' using errcode='PT409';
  end if;
  select * into c from public.timed_pt_configuration_v1 where singleton for share;
  if not coalesce(c.enabled,false) then raise exception 'Timed writer inactive' using errcode='PT503'; end if;
  perform public.timed_pt_require_access_v1(actor,(payload->>'pt')::integer);
  select blueprint into manifest from public.timed_content_manifests_v1 where manifest_sha256=c.manifest_sha256
    and pt=(payload->>'pt')::integer;
  if manifest is null or jsonb_array_length(manifest->'legs')<>3 or manifest->>'breakAfterLeg'<>'2'
    or manifest->>'breakSeconds'<>'600' then raise exception 'Supported manifest unavailable' using errcode='PT422'; end if;
  legs:=public.timed_pt_leg_definitions_v1(manifest->'legs');
  seconds:=(payload->>'sectionSeconds')::integer;
  if (pace='untimed' and seconds is not null) or (pace<>'untimed' and coalesce(seconds,0)<=0) then
    raise exception 'Invalid chosen timing' using errcode='PT422'; end if;
  insert into public.practice_test_runs(id,user_id,pt,pace,legs,break_after_leg,status,section_seconds,
    active_device_id,timed_contract_version,timed_writer_epoch,timed_phase,timed_elapsed_ms,timed_lease_ms,
    timed_frozen_legs,timed_manifest_sha256,timed_manifest)
  values(work_id,actor,(payload->>'pt')::integer,pace,legs,2,'in-progress',seconds,
    p_command->>'deviceId',1,1,'ready',0,c.lease_ms,legs,c.manifest_sha256,manifest) returning * into r;
  insert into public.timed_pt_receipts_v1(owner_id,work_kind,work_id,command_id,canonical_command,committed_revision,committed_result)
    values(actor,'practice-test',r.id,cid,p_command,r.revision,jsonb_build_object('operation','create')) returning * into rec;
  return public.timed_pt_response_v1(r,rec,false);
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'Invalid typed creation value' using errcode='PT422';
end $$;

-- Actual child enforcement tests both OLD and NEW attribution. Invoker role is
-- exact, while definer RPCs run as the dedicated executor. SHARE locks serialize
-- legacy child preflights with later parent adoption (which is not exposed yet).
create function public.guard_timed_pt_child_v1() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare item jsonb; run_id text; protected boolean:=false; binding public.timed_pt_lr_bindings_v1;
begin
  for item in select v from (values(case when TG_OP<>'INSERT' then to_jsonb(OLD) end),
      (case when TG_OP<>'DELETE' then to_jsonb(NEW) end)) x(v) where v is not null loop
    run_id:=null;
    if TG_TABLE_NAME='practice_test_runs' then
      if item->>'timed_contract_version' is not null then protected:=true; end if;
    elsif TG_TABLE_NAME in ('section_history','rc_drill_sessions') then
      run_id:=item->>'practice_test_run_id';
      if TG_TABLE_NAME='rc_drill_sessions' and item->'config'->>'practiceTestRunId' is not null then
        protected:=protected or public.timed_pt_parent_protected_v1(item->'config'->>'practiceTestRunId'); end if;
    elsif TG_TABLE_NAME='attempts' then run_id:=item->>'timed_pt_run_id';
    elsif TG_TABLE_NAME='rc_attempts' then
      select practice_test_run_id into run_id from public.rc_drill_sessions where id=(item->>'session_id')::uuid;
    elsif TG_TABLE_NAME='bootcamp_kv' then
      select * into binding from public.timed_pt_lr_bindings_v1 where owner_id=(item->>'user_id')::uuid
        and namespace=item->>'table_name' and record_id=item->>'record_id';
      if found then run_id:=binding.run_id; end if;
      if item->>'table_name'='practice_sessions' then
        if item->'data'->>'pool_slug' like 'drill::practice-test::%' and
          public.timed_pt_parent_protected_v1(split_part(item->'data'->>'pool_slug','::',3)) then protected:=true; end if;
        if item->'data'->>'completion_id' like 'drill::practice-test::%' and
          public.timed_pt_parent_protected_v1(split_part(item->'data'->>'completion_id','::',3)) then protected:=true; end if;
      end if;
    end if;
    if run_id is not null then
      protected:=protected or public.timed_pt_parent_protected_v1(run_id);
    end if;
    if coalesce(protected,false) and current_user<>'timed_pt_executor' then
      raise exception 'Protected child requires the timed writer' using errcode='42501'; end if;
    if coalesce(protected,false) and TG_TABLE_NAME='rc_drill_sessions' and
      (item->'config'->>'practiceTestRunId' is distinct from run_id or item->'config'->>'practiceTestLegIndex' is distinct from item->>'practice_test_leg') then
      raise exception 'Contradictory protected RC attribution' using errcode='PT422'; end if;
    if coalesce(protected,false) and TG_OP='DELETE' then raise exception 'Protected child history retained' using errcode='42501'; end if;
  end loop;
  if TG_TABLE_NAME='practice_test_runs' then
    if TG_OP='UPDATE' and OLD.timed_contract_version is not null and
      (NEW.timed_manifest_sha256 is distinct from OLD.timed_manifest_sha256 or NEW.timed_manifest is distinct from OLD.timed_manifest) then
      raise exception 'Frozen manifest immutable' using errcode='42501'; end if;
  end if;
  if TG_OP='DELETE' then return OLD; end if; return NEW;
end $$;
create trigger timed_manifest_guard before update on public.practice_test_runs for each row execute function public.guard_timed_pt_child_v1();
create trigger timed_kv_guard before insert or update or delete on public.bootcamp_kv for each row execute function public.guard_timed_pt_child_v1();
create trigger timed_lr_attempt_guard before insert or update or delete on public.attempts for each row execute function public.guard_timed_pt_child_v1();
create trigger timed_history_guard before insert or update or delete on public.section_history for each row execute function public.guard_timed_pt_child_v1();
create trigger timed_rc_session_guard before insert or update or delete on public.rc_drill_sessions for each row execute function public.guard_timed_pt_child_v1();
create trigger timed_rc_attempt_guard before insert or update or delete on public.rc_attempts for each row execute function public.guard_timed_pt_child_v1();

create function public.timed_pt_parent_protected_v1(p_id text) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare protected boolean;
begin
  select timed_contract_version is not null into protected from public.practice_test_runs where id=p_id for share;
  return coalesce(protected,false);
end $$;

create function public.timed_pt_save_checkpoint_v1(p_run public.practice_test_runs,p_payload jsonb,p_now timestamptz)
returns void language plpgsql set search_path=pg_catalog,public as $$
<<checkpoint_state>>
declare leg jsonb:=p_run.timed_manifest->'legs'->p_run.current_leg;
  a jsonb; q jsonb; existing jsonb; question_state jsonb; data jsonb; merged jsonb; position integer;
  b public.timed_pt_lr_bindings_v1; s public.rc_drill_sessions; prior public.rc_attempts;
  attempt_id uuid;
begin
  perform public.timed_pt_check_keys_v1(p_payload,array['currentIndex','answers','regulationAnsweredQids','questionStates']);
  position:=(p_payload->>'currentIndex')::integer;
  if jsonb_typeof(p_payload->'currentIndex') is distinct from 'number' or p_payload->>'currentIndex' !~ '^[0-9]+$'
    or position is null or position<0 or position>=(leg->>'questionCount')::integer
    or jsonb_typeof(p_payload->'answers') is distinct from 'array' then
    raise exception 'Invalid checkpoint position or answers' using errcode='PT422'; end if;
  if leg->>'kind'='lr' then
    select * into b from public.timed_pt_lr_bindings_v1 where run_id=p_run.id and leg_index=p_run.current_leg;
    select kv.data into data from public.bootcamp_kv kv where user_id=p_run.user_id and table_name=b.namespace and record_id=b.record_id for update;
    if data is null then raise exception 'Frozen LR child missing' using errcode='PT409'; end if;
    if (select count(*) from jsonb_array_elements(p_payload->'answers'))<>(select count(distinct v->>'qid') from jsonb_array_elements(p_payload->'answers') v) then
      raise exception 'Duplicate LR answer' using errcode='PT422'; end if;
    for a in select v from jsonb_array_elements(p_payload->'answers') v loop
      perform public.timed_pt_check_keys_v1(a,array['qid','selected','correct','timeMs','flagged','switchCount']);
      if jsonb_typeof(a->'qid') is distinct from 'string' or (a->>'qid'=any(b.frozen_qids)) is not true
        or jsonb_typeof(a->'selected') is distinct from 'string' or a->>'selected' not in ('A','B','C','D','E')
        or jsonb_typeof(a->'correct') is distinct from 'boolean' or coalesce((a->>'timeMs')::integer,-1)<0
        or jsonb_typeof(a->'timeMs') is distinct from 'number' or a->>'timeMs' !~ '^[0-9]+$'
        or (a ? 'flagged' and jsonb_typeof(a->'flagged') is distinct from 'boolean')
        or (a ? 'switchCount' and (jsonb_typeof(a->'switchCount') is distinct from 'number' or a->>'switchCount' !~ '^[0-9]+$'))
        or coalesce((a->>'switchCount')::integer,0)<0 then raise exception 'Invalid LR answer' using errcode='PT422'; end if;
      select v into existing from jsonb_array_elements(data->'attempts') v where v->>'qid'=a->>'qid';
      select v into question_state from jsonb_array_elements(coalesce(data->'question_states','[]')) v where v->>'qid'=a->>'qid';
      if coalesce((a->>'timeMs')::integer,0)<greatest(coalesce((existing->>'time_ms')::integer,0),coalesce((question_state->>'timeMs')::integer,0)) then
        raise exception 'Question time cannot decrease' using errcode='PT409'; end if;
      merged:=jsonb_build_object('qid',a->>'qid','selected_answer',a->>'selected','correct',a->'correct',
        'time_ms',(a->>'timeMs')::integer,'flagged',coalesce((a->>'flagged')::boolean,(existing->>'flagged')::boolean,false),
        'switch_count',coalesce((a->>'switchCount')::integer,(existing->>'switch_count')::integer,0));
      data:=jsonb_set(data,'{attempts}',coalesce((select jsonb_agg(v) from jsonb_array_elements(data->'attempts') v
        where v->>'qid'<>a->>'qid'),'[]')||jsonb_build_array(merged));
    end loop;
    if p_payload ? 'questionStates' then
      if jsonb_typeof(p_payload->'questionStates') is distinct from 'array' then
        raise exception 'Question states must be an array' using errcode='PT422'; end if;
      if (select count(*) from jsonb_array_elements(p_payload->'questionStates'))<>(select count(distinct v->>'qid') from jsonb_array_elements(p_payload->'questionStates') v) then
        raise exception 'Duplicate question state' using errcode='PT422'; end if;
      for q in select v from jsonb_array_elements(p_payload->'questionStates') v loop
        perform public.timed_pt_check_keys_v1(q,array['qid','timeMs','flagged','eliminations']);
        if jsonb_typeof(q->'qid') is distinct from 'string' or (q->>'qid'=any(b.frozen_qids)) is not true
          or jsonb_typeof(q->'timeMs') is distinct from 'number' or q->>'timeMs' !~ '^[0-9]+$'
          or jsonb_typeof(q->'flagged') is distinct from 'boolean'
          or jsonb_typeof(q->'eliminations') is distinct from 'array' then
          raise exception 'Invalid question state' using errcode='PT422'; end if;
        if exists(select 1 from jsonb_array_elements(q->'eliminations') v where jsonb_typeof(v)<>'string' or v#>>'{}' not in ('A','B','C','D','E'))
          or (select count(*) from jsonb_array_elements(q->'eliminations'))<>(select count(distinct v) from jsonb_array_elements(q->'eliminations') v) then
          raise exception 'Invalid question state eliminations' using errcode='PT422'; end if;
        select v into existing from jsonb_array_elements(coalesce(data->'question_states','[]')) v where v->>'qid'=q->>'qid';
        select v into a from jsonb_array_elements(data->'attempts') v where v->>'qid'=q->>'qid';
        if (q->>'timeMs')::integer<greatest(coalesce((existing->>'timeMs')::integer,0),coalesce((a->>'time_ms')::integer,0)) then
          raise exception 'Question time cannot decrease' using errcode='PT409'; end if;
        data:=jsonb_set(data,'{question_states}',coalesce((select jsonb_agg(v) from jsonb_array_elements(coalesce(data->'question_states','[]')) v where v->>'qid'<>q->>'qid'),'[]')||jsonb_build_array(q));
      end loop;
    end if;
    if p_payload ? 'regulationAnsweredQids' then
      if jsonb_typeof(p_payload->'regulationAnsweredQids') is distinct from 'array'
        or exists(select 1 from jsonb_array_elements(p_payload->'regulationAnsweredQids') x where jsonb_typeof(x)<>'string')
        or exists(select 1 from jsonb_array_elements_text(p_payload->'regulationAnsweredQids') x where (x=any(b.frozen_qids)) is not true)
        or exists(select 1 from jsonb_array_elements_text(p_payload->'regulationAnsweredQids') x where not exists(
          select 1 from jsonb_array_elements(data->'attempts') answer where answer->>'qid'=x))
        or (select count(*) from jsonb_array_elements(p_payload->'regulationAnsweredQids'))<>(select count(distinct x) from jsonb_array_elements_text(p_payload->'regulationAnsweredQids') x)
        or (data ? 'regulation_answered_qids' and data->'regulation_answered_qids'<>p_payload->'regulationAnsweredQids') then
        raise exception 'Regulation identity cannot change' using errcode='PT409'; end if;
      data:=jsonb_set(data,'{regulation_answered_qids}',p_payload->'regulationAnsweredQids');
    end if;
    data:=data||jsonb_build_object('current_index',position,'elapsed_ms',p_run.timed_elapsed_ms,'updated_at',p_now);
    update public.bootcamp_kv kv set data=checkpoint_state.data,updated_at=p_now where user_id=p_run.user_id and table_name=b.namespace and record_id=b.record_id;
  else
    if p_payload ? 'regulationAnsweredQids' or p_payload ? 'questionStates' then raise exception 'RC has no LR checkpoint fields' using errcode='PT422'; end if;
    select * into s from public.rc_drill_sessions where practice_test_run_id=p_run.id and practice_test_leg=p_run.current_leg and user_id=p_run.user_id for update;
    if not found or s.status<>'in_progress' then raise exception 'Frozen RC child missing' using errcode='PT409'; end if;
    if (select count(*) from jsonb_array_elements(p_payload->'answers'))<>(select count(distinct v->>'questionId') from jsonb_array_elements(p_payload->'answers') v) then
      raise exception 'Duplicate RC question' using errcode='PT422'; end if;
    for a in select v from jsonb_array_elements(p_payload->'answers') v loop
      perform public.timed_pt_check_keys_v1(a,array['attemptId','questionId','passageId','selected','isCorrect','timeMs','flagged','eliminations']);
      select v into q from jsonb_array_elements(leg->'questions') v where v->>'questionId'=a->>'questionId' and v->>'passageId'=a->>'passageId';
      if q is null or jsonb_typeof(a->'questionId') is distinct from 'number' or a->>'questionId' !~ '^[0-9]+$'
        or jsonb_typeof(a->'passageId') is distinct from 'number' or a->>'passageId' !~ '^[0-9]+$'
        or jsonb_typeof(a->'attemptId') is distinct from 'string'
        or not a ? 'selected' or jsonb_typeof(a->'selected') not in ('string','null')
        or (a->>'selected' is not null and a->>'selected' not in ('A','B','C','D','E'))
        or not a ? 'isCorrect' or (jsonb_typeof(a->'isCorrect') not in ('boolean','null'))
        or (a->>'selected' is not null and jsonb_typeof(a->'isCorrect') is distinct from 'boolean')
        or (a->>'selected' is null and a->>'isCorrect' is not null and a->>'isCorrect'<>'false')
        or jsonb_typeof(a->'timeMs') is distinct from 'number' or a->>'timeMs' !~ '^[0-9]+$'
        or (a ? 'flagged' and jsonb_typeof(a->'flagged') is distinct from 'boolean')
        or coalesce((a->>'timeMs')::integer,-1)<0 then raise exception 'Invalid RC answer' using errcode='PT422'; end if;
      if a ? 'eliminations' and (jsonb_typeof(a->'eliminations') is distinct from 'array'
        or exists(select 1 from jsonb_array_elements(a->'eliminations') x where jsonb_typeof(x)<>'string')
        or exists(select 1 from jsonb_array_elements_text(a->'eliminations') x where x not in ('A','B','C','D','E'))) then
        raise exception 'Invalid eliminated choices' using errcode='PT422'; end if;
      attempt_id:=(a->>'attemptId')::uuid;
      if attempt_id is null then raise exception 'Attempt identity required' using errcode='PT422'; end if;
      select * into prior from public.rc_attempts where id=attempt_id;
      if found then
        if prior.user_id<>p_run.user_id or prior.session_id<>s.id or prior.question_id<>(a->>'questionId')::integer
          or prior.passage_id<>(a->>'passageId')::integer or not prior.is_first_attempt then
          raise exception 'Changed attempt replay' using errcode='PT409'; end if;
        -- Stable sitting/question identity survives revisits. Immutable command
        -- receipts retain each acknowledged answer; this row holds final choice.
        update public.rc_attempts set selected=a->>'selected',is_correct=(a->>'isCorrect')::boolean,
          time_ms=(a->>'timeMs')::integer,
          flagged=case when a ? 'flagged' then (a->>'flagged')::boolean else prior.flagged end,
          eliminations=case when a ? 'eliminations' then array(select jsonb_array_elements_text(a->'eliminations')) else prior.eliminations end
          where id=prior.id;
      else
        if exists(select 1 from public.rc_attempts where session_id=s.id and question_id=(a->>'questionId')::integer and is_first_attempt) then
          raise exception 'First answer already acknowledged' using errcode='PT409'; end if;
        insert into public.rc_attempts(id,session_id,user_id,question_id,passage_id,selected,is_correct,time_ms,flagged,eliminations,is_first_attempt)
          values(attempt_id,s.id,p_run.user_id,(a->>'questionId')::integer,(a->>'passageId')::integer,a->>'selected',
            (a->>'isCorrect')::boolean,(a->>'timeMs')::integer,coalesce((a->>'flagged')::boolean,false),
            array(select jsonb_array_elements_text(coalesce(a->'eliminations','[]'))),true);
      end if;
    end loop;
    update public.rc_drill_sessions set config=config||jsonb_build_object('currentQuestionIndex',position,
      'clockElapsedSeconds',floor(p_run.timed_elapsed_ms/1000.0),'lastActiveAt',p_now) where id=s.id;
  end if;
end $$;

create function public.timed_pt_close_leg_v1(p_run public.practice_test_runs,p_payload jsonb,p_now timestamptz)
returns jsonb language plpgsql set search_path=pg_catalog,public as $$
<<close_state>>
declare leg jsonb:=p_run.timed_manifest->'legs'->p_run.current_leg;
  b public.timed_pt_lr_bindings_v1; s public.rc_drill_sessions; data jsonb; q jsonb; a jsonb; question_state jsonb; key jsonb;
  stats jsonb:='[]'; correct integer:=0; answered integer:=0; total integer:=(leg->>'questionCount')::integer;
  question_time bigint:=0; initial_answer text; is_correct boolean; history_id uuid; actor_class text;
begin
  if leg->>'kind'='lr' then
    perform public.timed_pt_check_keys_v1(p_payload,array['answerKeys','analysis']);
    if jsonb_typeof(p_payload->'answerKeys') is distinct from 'array' or jsonb_array_length(p_payload->'answerKeys')<>total
      or (select count(distinct v->>'qid') from jsonb_array_elements(p_payload->'answerKeys') v)<>total
      or (p_payload ? 'analysis' and jsonb_typeof(p_payload->'analysis') not in ('object','null')) then
      raise exception 'Complete LR answer keys required' using errcode='PT422'; end if;
    select * into b from public.timed_pt_lr_bindings_v1 where run_id=p_run.id and leg_index=p_run.current_leg;
    select kv.data into data from public.bootcamp_kv kv where user_id=p_run.user_id and table_name=b.namespace and record_id=b.record_id for update;
    if data is null then raise exception 'Frozen LR child missing' using errcode='PT409'; end if;
    select p.class_id into actor_class from public.profiles p where p.class_id=p_run.user_id::text for share;
    if actor_class is null then raise exception 'Account class identity unavailable' using errcode='PT401'; end if;
    for q in select v||jsonb_build_object('servedQnum',ordinality) from jsonb_array_elements(leg->'questions') with ordinality as item(v,ordinality) loop
      select v into key from jsonb_array_elements(p_payload->'answerKeys') v where v->>'qid'=q->>'qid';
      perform public.timed_pt_check_keys_v1(key,array['qid','correctAnswer']);
      if key->>'correctAnswer' is null or key->>'correctAnswer' not in ('A','B','C','D','E') then
        raise exception 'Invalid answer key structure' using errcode='PT422'; end if;
      select v into a from jsonb_array_elements(data->'attempts') v where v->>'qid'=q->>'qid';
      select v into question_state from jsonb_array_elements(coalesce(data->'question_states','[]')) v where v->>'qid'=q->>'qid';
      if a is not null then
        a:=a||jsonb_build_object('time_ms',greatest(coalesce((a->>'time_ms')::integer,0),coalesce((question_state->>'timeMs')::integer,0)),
          'flagged',coalesce((question_state->>'flagged')::boolean,(a->>'flagged')::boolean,false));
      end if;
      initial_answer:=coalesce(a->>'selected_answer',U&'\2014'); is_correct:=coalesce((a->>'correct')::boolean,false);
      correct:=correct+case when is_correct then 1 else 0 end;
      answered:=answered+case when a is not null then 1 else 0 end;
      question_time:=question_time+coalesce((a->>'time_ms')::integer,(question_state->>'timeMs')::integer,0);
      stats:=stats||jsonb_build_array(jsonb_build_object('qid',q->>'qid','qnum',(q->>'servedQnum')::integer,
        'qtype',q->>'qtype','difficulty',(q->>'level')::integer,'initialAnswer',initial_answer,
        'correctAnswer',key->>'correctAnswer','initialCorrect',is_correct,'timeMs',coalesce((a->>'time_ms')::integer,(question_state->>'timeMs')::integer,0),
        'switchCount',coalesce((a->>'switch_count')::integer,0),'flagged',coalesce((question_state->>'flagged')::boolean,(a->>'flagged')::boolean,false),
        'eliminations',coalesce(question_state->'eliminations','[]'),
        'answeredInOvertime',case when data ? 'regulation_answered_qids' then not data->'regulation_answered_qids' ? (q->>'qid') else null end));
      if a is not null then
        insert into public.attempts(user_id,class_id,qid,pt,section,qnum,qtype,level,correct,time_ms,mode,selected_answer,timestamp_iso,timed_pt_run_id,timed_pt_leg)
          values(p_run.user_id,actor_class,q->>'qid',p_run.pt,(leg->>'section')::integer,(q->>'qnum')::integer,
            q->>'qtype',(q->>'level')::integer,is_correct,(a->>'time_ms')::integer,'full-section',a->>'selected_answer',p_now,p_run.id,p_run.current_leg);
      end if;
      if not is_correct then
        insert into public.wrong_answer_journal(class_id,qid,pt,section,qnum,qtype,level,last_status,revisit_count,history_json)
          values(actor_class,q->>'qid',p_run.pt,(leg->>'section')::integer,(q->>'qnum')::integer,q->>'qtype',(q->>'level')::integer,
          'wrong',0,jsonb_build_array(jsonb_build_object('attempt_at_iso',p_now,'result',0,
          'chosen_answer',initial_answer,'correct_answer',key->>'correctAnswer','time_ms',coalesce((a->>'time_ms')::integer,(question_state->>'timeMs')::integer,0),
          'confidence_1_5',null,'review',jsonb_build_object('q1','','q2','','q3',''))))
          on conflict(class_id,qid) do update set
            history_json=public.wrong_answer_journal.history_json||excluded.history_json,
            last_status='wrong',revisit_count=jsonb_array_length(public.wrong_answer_journal.history_json),updated_at=p_now;
      end if;
    end loop;
    insert into public.section_history(user_id,class_id,pt,section,mode,practice_test_run_id,practice_test_leg,
      initial_score,initial_total,initial_percent,total_time_ms,avg_time_ms,unanswered_count,br_used,
      total_questions,time_taken_ms,questions_json,analysis_json,by_qtype_json,by_difficulty_json,completed_at)
      values(p_run.user_id,actor_class,p_run.pt,(leg->>'section')::integer,'full-section',p_run.id,p_run.current_leg,
        correct,total,round(correct*100.0/total),question_time,round(question_time::numeric/total),total-answered,false,
        total,question_time,stats,p_payload->'analysis',
        (select jsonb_object_agg(label,jsonb_build_object('total',n,'correct',c)) from
          (select v->>'qtype' label,count(*) n,count(*) filter(where (v->>'initialCorrect')::boolean) c from jsonb_array_elements(stats) v group by v->>'qtype') tally),
        (select jsonb_object_agg(label,jsonb_build_object('total',n,'correct',c)) from
          (select v->>'difficulty' label,count(*) n,count(*) filter(where (v->>'initialCorrect')::boolean) c from jsonb_array_elements(stats) v group by v->>'difficulty') tally),
        p_now) returning id into history_id;
    update public.bootcamp_kv set data=close_state.data||jsonb_build_object('status','completed','elapsed_ms',p_run.timed_elapsed_ms,'updated_at',p_now),updated_at=p_now
      where user_id=p_run.user_id and table_name=b.namespace and record_id=b.record_id;
  else
    perform public.timed_pt_check_keys_v1(p_payload,array['analysis']);
    if p_payload ? 'analysis' and jsonb_typeof(p_payload->'analysis') not in ('object','null') then
      raise exception 'Invalid RC analysis' using errcode='PT422'; end if;
    select * into s from public.rc_drill_sessions where practice_test_run_id=p_run.id and practice_test_leg=p_run.current_leg and user_id=p_run.user_id for update;
    if not found or s.status<>'in_progress' then raise exception 'Frozen RC child missing' using errcode='PT409'; end if;
    for q in select v from jsonb_array_elements(leg->'questions') v loop
      insert into public.rc_attempts(session_id,user_id,question_id,passage_id,selected,is_correct,time_ms,is_first_attempt)
        select s.id,p_run.user_id,(q->>'questionId')::integer,(q->>'passageId')::integer,null,false,0,true
        where not exists(select 1 from public.rc_attempts where session_id=s.id and question_id=(q->>'questionId')::integer and is_first_attempt);
    end loop;
    select count(*) filter(where attempt.is_correct),count(*) filter(where attempt.selected is not null)
      into correct,answered from public.rc_attempts attempt where attempt.session_id=s.id and attempt.is_first_attempt;
    update public.rc_drill_sessions set status='completed',completed_at=p_now,
      config=config||jsonb_build_object('clockElapsedSeconds',floor(p_run.timed_elapsed_ms/1000.0),'lastActiveAt',p_now)
        ||case when p_payload ? 'analysis' then jsonb_build_object('analysis',p_payload->'analysis') else '{}'::jsonb end where id=s.id;
  end if;
  return jsonb_build_object('correct',correct,'answered',answered,'total',total,'timeMs',p_run.timed_elapsed_ms,'historyId',history_id);
end $$;

-- Exact existing estimateScaledScore anchors, normalized to a 75-question test.
create function public.timed_pt_estimated_score_v1(p_raw integer,p_total integer) returns integer
language plpgsql immutable set search_path=pg_catalog as $$
declare raw_anchors integer[]:=array[0,6,11,17,23,29,36,43,50,57,63,68,72,75];
  score_anchors integer[]:=array[120,120,125,130,135,140,145,150,155,160,165,170,175,180];
  normalized numeric; i integer;
begin
  if p_total<=0 then return 120; end if;
  normalized:=greatest(0,least(1,p_raw::numeric/p_total))*75;
  for i in 2..array_length(raw_anchors,1) loop
    if normalized<=raw_anchors[i] then
      return floor(score_anchors[i-1]+(normalized-raw_anchors[i-1])/(raw_anchors[i]-raw_anchors[i-1])*(score_anchors[i]-score_anchors[i-1])+0.5)::integer;
    end if;
  end loop;
  return 180;
end $$;

create function public.commit_timed_work_v1(p_command jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor uuid:=public.timed_pt_actor_v1(); r public.practice_test_runs; rec public.timed_pt_receipts_v1;
  cid uuid; op text:=p_command->>'operation'; payload jsonb:=p_command->'payload';
  at_time timestamptz; settled bigint; leg jsonb; source_key text; record_id text;
  rc_id uuid; result jsonb; running boolean; config public.timed_pt_configuration_v1;
  old_leg integer; next_leg integer; raw_correct integer; raw_total integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode='PT401'; end if;
  perform public.timed_pt_check_keys_v1(p_command,array['workKind','workId','commandId','deviceId','expectedRevision','writerEpoch','operation','payload']);
  if p_command->>'workKind' is distinct from 'practice-test' or op is null
    or jsonb_typeof(p_command->'workId') is distinct from 'string' or jsonb_typeof(p_command->'deviceId') is distinct from 'string'
    or jsonb_typeof(p_command->'commandId') is distinct from 'string'
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number' or p_command->>'expectedRevision' !~ '^[0-9]+$'
    or jsonb_typeof(p_command->'writerEpoch') is distinct from 'number' or p_command->>'writerEpoch' !~ '^[0-9]+$'
    or op not in ('claim','start-leg','checkpoint','heartbeat','pause','resume','close-leg','start-break','finish-break','abandon')
    or coalesce(length(p_command->>'deviceId'),0) not between 1 and 128
    or jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid command envelope' using errcode='PT422'; end if;
  cid:=(p_command->>'commandId')::uuid;
  if cid is null then raise exception 'Command identity required' using errcode='PT422'; end if;
  select * into r from public.practice_test_runs where id=p_command->>'workId' and user_id=actor for update;
  if not found then raise exception 'Owned practice test unavailable' using errcode='PT401'; end if;
  -- A prior acknowledgement wins over current access, revision, epoch or lease.
  select * into rec from public.timed_pt_receipts_v1 where owner_id=actor and work_kind='practice-test'
    and work_id=r.id and command_id=cid;
  if found then
    if rec.canonical_command<>p_command then raise exception 'Changed command replay' using errcode='PT412'; end if;
    return public.timed_pt_response_v1(r,rec,true);
  end if;
  select * into config from public.timed_pt_configuration_v1 where singleton for share;
  if not coalesce(config.enabled,false) then raise exception 'Timed writer inactive' using errcode='PT503'; end if;
  if r.timed_contract_version is distinct from 1 then raise exception 'Legacy adoption unsupported' using errcode='PT409'; end if;
  if (p_command->>'expectedRevision')::integer is distinct from r.revision
    or (p_command->>'writerEpoch')::bigint is distinct from r.timed_writer_epoch then
    raise exception 'Writer revision or epoch conflict' using errcode='PT409',detail=jsonb_build_object('parent',to_jsonb(r))::text; end if;
  if r.status<>'in-progress' then raise exception 'Terminal work retained' using errcode='PT409'; end if;
  perform public.timed_pt_require_access_v1(actor,r.pt);
  at_time:=clock_timestamp();
  running:=r.timed_phase in ('leg-running','break-running');
  settled:=r.timed_elapsed_ms;
  if running then settled:=settled+greatest(0,floor(extract(epoch from (least(at_time,r.timed_lease_expires_at)-r.timed_running_anchor))*1000))::bigint; end if;
  if op<>'claim' and (r.active_device_id is distinct from p_command->>'deviceId') then
    raise exception 'Writer device conflict' using errcode='PT409',detail=jsonb_build_object('parent',to_jsonb(r))::text; end if;
  if op<>'claim' and running and at_time>r.timed_lease_expires_at then
    raise exception 'Writer lease expired; claim required' using errcode='PT410',detail=jsonb_build_object('parent',to_jsonb(r))::text; end if;
  r.timed_elapsed_ms:=settled;
  if op not in ('checkpoint','close-leg') then perform public.timed_pt_check_keys_v1(payload,array[]::text[]); end if;
  result:=jsonb_build_object('operation',op);
  if op='claim' then
    if r.active_device_id is distinct from p_command->>'deviceId' and running and at_time<r.timed_lease_expires_at then
      raise exception 'Another live writer owns this lease' using errcode='PT409',detail=jsonb_build_object('parent',to_jsonb(r))::text; end if;
    r.active_device_id:=p_command->>'deviceId'; r.timed_writer_epoch:=r.timed_writer_epoch+1;
    if r.timed_phase='leg-running' then r.timed_phase:='leg-paused';
    elsif r.timed_phase='break-running' then r.timed_phase:='break-paused'; end if;
  elsif op='start-leg' then
    if r.timed_phase<>'ready' or r.current_leg>=jsonb_array_length(r.timed_frozen_legs)
      or (r.current_leg=r.break_after_leg and not r.break_taken) then raise exception 'Leg cannot start' using errcode='PT409'; end if;
    leg:=r.timed_manifest->'legs'->r.current_leg;
    r.timed_elapsed_ms:=0; r.timed_clock_leg:=r.current_leg; r.timed_phase:='leg-running';
    r.legs:=jsonb_set(r.legs,array[r.current_leg::text],r.legs->r.current_leg||jsonb_build_object('startedAt',at_time));
    if leg->>'kind'='lr' then
      source_key:='drill::practice-test::'||r.id||'::leg-'||r.current_leg::text;
      record_id:=gen_random_uuid()::text;
      insert into public.timed_pt_lr_bindings_v1(owner_id,run_id,leg_index,namespace,record_id,source_key,frozen_qids)
        values(actor,r.id,r.current_leg,'practice_sessions',record_id,source_key,array(select jsonb_array_elements_text(leg->'qids')));
      insert into public.bootcamp_kv(user_id,table_name,record_id,data)
        values(actor,'practice_sessions',record_id,jsonb_build_object('id',record_id,'user_id',actor,
          'pool_slug',source_key,'completion_id',source_key,'data_version',2,'question_queue',leg->'qids',
          'current_index',0,'attempts','[]'::jsonb,'status','in_progress','elapsed_ms',0,
          'timer_mode',case when r.section_seconds is null then 'unlimited' else 'custom' end,
          'timer_custom_minutes',case when r.section_seconds is null then null else r.section_seconds/60.0 end,
          'started_at',at_time,'updated_at',at_time));
    elsif leg->>'kind'='rc' then
      insert into public.rc_drill_sessions(user_id,config,passage_ids,practice_test_run_id,practice_test_leg)
        values(actor,jsonb_build_object('practiceTestRunId',r.id,'practiceTestLegIndex',r.current_leg,
          'clockElapsedSeconds',0,'currentQuestionIndex',0,'lastActiveAt',at_time,
          'timerSeconds',r.section_seconds,'mode','section'),array(select jsonb_array_elements_text(leg->'passageIds')::integer),r.id,r.current_leg)
        returning id into rc_id;
    else raise exception 'Unsupported manifest leg' using errcode='PT422'; end if;
  elsif op='checkpoint' then
    if r.timed_phase<>'leg-running' then raise exception 'Checkpoint requires running leg' using errcode='PT409'; end if;
    perform public.timed_pt_save_checkpoint_v1(r,payload,at_time);
  elsif op='heartbeat' then
    if not running then raise exception 'Heartbeat requires running clock' using errcode='PT409'; end if;
  elsif op='pause' then
    if r.timed_phase='leg-running' then r.timed_phase:='leg-paused';
    elsif r.timed_phase='break-running' then r.timed_phase:='break-paused';
    else raise exception 'Clock is not running' using errcode='PT409'; end if;
  elsif op='resume' then
    if r.timed_phase='leg-paused' then r.timed_phase:='leg-running';
    elsif r.timed_phase='break-paused' then r.timed_phase:='break-running';
    else raise exception 'Clock is not paused' using errcode='PT409'; end if;
  elsif op='close-leg' then
    if r.timed_phase not in ('leg-running','leg-paused') then raise exception 'Leg cannot close' using errcode='PT409'; end if;
    result:=result||public.timed_pt_close_leg_v1(r,payload,at_time);
    old_leg:=r.current_leg; next_leg:=old_leg+1;
    r.legs:=jsonb_set(r.legs,array[old_leg::text],r.legs->old_leg||jsonb_build_object('completedAt',at_time,
      'correct',result->'correct','answered',result->'answered','timeMs',result->'timeMs'));
    r.current_leg:=next_leg; r.timed_clock_leg:=null;
    if next_leg=jsonb_array_length(r.legs) then
      select sum((v->>'correct')::integer),sum((v->>'questionCount')::integer) into raw_correct,raw_total from jsonb_array_elements(r.legs) v;
      r.raw_correct:=raw_correct; r.raw_total:=raw_total;
      r.scaled_score:=public.timed_pt_estimated_score_v1(raw_correct,raw_total); r.score_source:='estimate';
      r.status:='complete'; r.completed_at:=at_time; r.timed_phase:='complete';
    else r.timed_phase:='ready'; r.timed_elapsed_ms:=0; end if;
  elsif op='start-break' then
    if r.timed_phase<>'ready' or r.current_leg<>r.break_after_leg or r.break_taken then raise exception 'Break cannot start' using errcode='PT409'; end if;
    r.timed_phase:='break-running'; r.timed_elapsed_ms:=0; r.break_started_at:=at_time;
  elsif op='finish-break' then
    if r.timed_phase not in ('break-running','break-paused') then raise exception 'Break not active' using errcode='PT409'; end if;
    -- Existing UI permits ending the break early; preserve that choice.
    r.break_taken:=true; r.break_started_at:=null; r.timed_phase:='ready'; r.timed_elapsed_ms:=0;
  elsif op='abandon' then
    r.status:='abandoned'; r.timed_phase:='abandoned'; r.timed_clock_leg:=null;
    update public.rc_drill_sessions set status='abandoned' where practice_test_run_id=r.id and user_id=actor and status='in_progress';
  end if;
  if r.timed_phase in ('leg-running','break-running') then
    r.timed_running_anchor:=at_time; r.timed_lease_expires_at:=at_time+r.timed_lease_ms*interval '1 millisecond';
  else r.timed_running_anchor:=null; r.timed_lease_expires_at:=null; end if;
  -- Every acknowledgement carries the same settled parent/child clock, even
  -- heartbeat, claim and pause without an answer payload.
  if r.timed_clock_leg is not null then
    update public.bootcamp_kv kv set data=kv.data||jsonb_build_object('elapsed_ms',r.timed_elapsed_ms,'updated_at',at_time),updated_at=at_time
      from public.timed_pt_lr_bindings_v1 binding where binding.run_id=r.id and binding.leg_index=r.current_leg
        and kv.user_id=actor and kv.table_name=binding.namespace and kv.record_id=binding.record_id;
    update public.rc_drill_sessions set config=rc_drill_sessions.config||jsonb_build_object('clockElapsedSeconds',floor(r.timed_elapsed_ms/1000.0),'lastActiveAt',at_time)
      where practice_test_run_id=r.id and practice_test_leg=r.current_leg and user_id=actor;
  end if;
  update public.practice_test_runs set legs=r.legs,current_leg=r.current_leg,break_taken=r.break_taken,
    break_started_at=r.break_started_at,status=r.status,completed_at=r.completed_at,raw_correct=r.raw_correct,
    raw_total=r.raw_total,scaled_score=r.scaled_score,score_source=r.score_source,
    active_device_id=r.active_device_id,timed_writer_epoch=r.timed_writer_epoch,timed_phase=r.timed_phase,
    timed_elapsed_ms=r.timed_elapsed_ms,timed_running_anchor=r.timed_running_anchor,
    timed_lease_expires_at=r.timed_lease_expires_at,timed_clock_leg=r.timed_clock_leg,revision=r.revision+1 where id=r.id returning * into r;
  insert into public.timed_pt_receipts_v1(owner_id,work_kind,work_id,command_id,canonical_command,committed_revision,committed_result)
    values(actor,'practice-test',r.id,cid,p_command,r.revision,result) returning * into rec;
  return public.timed_pt_response_v1(r,rec,false);
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'Invalid typed command value' using errcode='PT422';
end $$;

create function public.read_timed_practice_test_v1(p_work_id text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.practice_test_runs; actor uuid:=public.timed_pt_actor_v1();
begin
  if actor is null then raise exception 'Authentication required' using errcode='PT401'; end if;
  select * into r from public.practice_test_runs where id=p_work_id and user_id=actor for share;
  if not found or r.timed_contract_version is distinct from 1 then raise exception 'Protected owned work unavailable' using errcode='PT401'; end if;
  return jsonb_build_object('parent',to_jsonb(r),'checkpoint',public.timed_pt_checkpoint_v1(r),'serverTime',clock_timestamp());
end $$;

-- Exact role ownership is necessary for invoker guards. Managed CREATE ROLE,
-- ALTER OWNER and narrow grant support must be confirmed before deployment.
-- PostgreSQL 16+ creators can receive ADMIN membership without SET permission.
-- Preserve any preexisting direct membership options; restore them afterwards.
create temporary table timed_pt_bootstrap_membership_v1 on commit drop as
  select current_user::text as migration_role,m.admin_option,m.inherit_option,m.set_option
  from (select 1) seed left join pg_auth_members m on m.roleid=(select oid from pg_roles where rolname='timed_pt_executor')
    and m.member=(select oid from pg_roles where rolname=current_user);
do $$ declare state record; begin
  select * into state from timed_pt_bootstrap_membership_v1;
  if not pg_has_role(current_user,'timed_pt_executor','SET') then
    execute format('grant timed_pt_executor to %I with set true',state.migration_role);
  end if;
end $$;
grant create on schema public to timed_pt_executor;
alter function public.timed_pt_require_access_v1(uuid,integer) owner to timed_pt_executor;
alter function public.timed_pt_check_keys_v1(jsonb,text[]) owner to timed_pt_executor;
alter function public.timed_pt_checkpoint_v1(public.practice_test_runs) owner to timed_pt_executor;
alter function public.timed_pt_response_v1(public.practice_test_runs,public.timed_pt_receipts_v1,boolean) owner to timed_pt_executor;
alter function public.timed_practice_test_capability_v1() owner to timed_pt_executor;
alter function public.create_timed_practice_test_v1(jsonb) owner to timed_pt_executor;
alter function public.timed_pt_parent_protected_v1(text) owner to timed_pt_executor;
alter function public.timed_pt_save_checkpoint_v1(public.practice_test_runs,jsonb,timestamptz) owner to timed_pt_executor;
alter function public.timed_pt_close_leg_v1(public.practice_test_runs,jsonb,timestamptz) owner to timed_pt_executor;
alter function public.commit_timed_work_v1(jsonb) owner to timed_pt_executor;
alter function public.timed_pt_estimated_score_v1(integer,integer) owner to timed_pt_executor;
alter function public.read_timed_practice_test_v1(text) owner to timed_pt_executor;
revoke create on schema public from timed_pt_executor;
do $$ declare state record; begin
  select * into state from timed_pt_bootstrap_membership_v1;
  if state.admin_option is null then
    execute format('revoke timed_pt_executor from %I',state.migration_role);
  else
    execute format('grant timed_pt_executor to %I with set %s',state.migration_role,case when state.set_option then 'true' else 'false' end);
    execute format('grant timed_pt_executor to %I with inherit %s',state.migration_role,case when state.inherit_option then 'true' else 'false' end);
  end if;
end $$;
revoke all on function public.timed_pt_require_access_v1(uuid,integer),public.timed_pt_check_keys_v1(jsonb,text[]),
  public.timed_pt_checkpoint_v1(public.practice_test_runs),
  public.timed_pt_response_v1(public.practice_test_runs,public.timed_pt_receipts_v1,boolean),
  public.timed_pt_save_checkpoint_v1(public.practice_test_runs,jsonb,timestamptz),
  public.timed_pt_close_leg_v1(public.practice_test_runs,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.timed_pt_parent_protected_v1(text) from public,anon;
grant execute on function public.timed_pt_parent_protected_v1(text) to authenticated;
revoke all on function public.timed_practice_test_capability_v1(),public.create_timed_practice_test_v1(jsonb),
  public.commit_timed_work_v1(jsonb),public.read_timed_practice_test_v1(text) from public,anon;
grant execute on function public.timed_practice_test_capability_v1(),public.create_timed_practice_test_v1(jsonb),
  public.commit_timed_work_v1(jsonb),public.read_timed_practice_test_v1(text) to authenticated;
grant select,update on public.user_roles,public.profiles,public.practice_test_assignments to timed_pt_executor;
grant select,insert,update on public.bootcamp_kv,public.rc_drill_sessions,public.rc_attempts,public.section_history,public.attempts to timed_pt_executor;
grant select,insert,update on public.wrong_answer_journal to timed_pt_executor;
create policy timed_user_roles_executor on public.user_roles for select to timed_pt_executor using(true);
create policy timed_profiles_executor on public.profiles for select to timed_pt_executor using(true);
create policy timed_assignments_executor on public.practice_test_assignments for select to timed_pt_executor using(true);
create policy timed_user_roles_executor_lock on public.user_roles for update to timed_pt_executor using(true) with check(false);
create policy timed_profiles_executor_lock on public.profiles for update to timed_pt_executor using(true) with check(false);
create policy timed_assignments_executor_lock on public.practice_test_assignments for update to timed_pt_executor using(true) with check(false);
create policy timed_kv_executor on public.bootcamp_kv for all to timed_pt_executor using(true) with check(true);
create policy timed_rc_session_executor on public.rc_drill_sessions for all to timed_pt_executor using(true) with check(true);
create policy timed_rc_attempt_executor on public.rc_attempts for all to timed_pt_executor using(true) with check(true);
create policy timed_history_executor on public.section_history for all to timed_pt_executor using(true) with check(true);
create policy timed_lr_attempt_executor on public.attempts for all to timed_pt_executor using(true) with check(true);
create policy timed_waj_executor on public.wrong_answer_journal for all to timed_pt_executor using(true) with check(true);
commit;

-- UNAPPLIED. Apply only after standalone control foundation and review.
-- Configuration remains disabled; complete writer exposes no fake PT parent.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';

alter table public.attempts add column timed_section_sitting_id uuid;
alter table public.attempts add constraint timed_section_attempt_owner_v1 foreign key(timed_section_sitting_id,user_id) references public.timed_section_sittings_v1(id,owner_id);
create unique index timed_section_lr_attempt_once_v1 on public.attempts(timed_section_sitting_id,qid) where timed_section_sitting_id is not null;
alter table public.section_history add column timed_section_sitting_id uuid;
alter table public.section_history add constraint timed_section_history_owner_v1 foreign key(timed_section_sitting_id,user_id) references public.timed_section_sittings_v1(id,owner_id);
create unique index timed_section_history_once_v1 on public.section_history(timed_section_sitting_id) where timed_section_sitting_id is not null;
alter table public.rc_drill_sessions add column timed_section_sitting_id uuid;
alter table public.rc_drill_sessions add constraint timed_section_rc_owner_v1 foreign key(timed_section_sitting_id,user_id) references public.timed_section_sittings_v1(id,owner_id);
create unique index timed_section_rc_once_v1 on public.rc_drill_sessions(timed_section_sitting_id) where timed_section_sitting_id is not null;
alter table public.timed_section_source_bindings_v1 add constraint section_rc_binding_owner_v1 foreign key(rc_session_id,owner_id) references public.rc_drill_sessions(id,user_id);
alter table public.timed_section_source_bindings_v1 add constraint section_lr_binding_owner_v1 foreign key(owner_id,namespace,record_id)
  references public.bootcamp_kv(user_id,table_name,record_id) deferrable initially deferred;

grant execute on function public.timed_pt_actor_v1() to timed_section_executor;
grant execute on function public.timed_pt_check_keys_v1(jsonb,text[]) to timed_section_executor;
grant execute on function public.timed_pt_parent_protected_v1(text) to timed_section_executor;
-- Both invoker source guards inspect the other contract's immutable bindings.
-- Read-only metadata grants keep either guard operational without granting mutation.
grant select on public.timed_pt_lr_bindings_v1 to timed_section_executor;
create policy section_existing_pt_binding_read_v1 on public.timed_pt_lr_bindings_v1 for select to timed_section_executor using(true);
grant select on public.timed_section_source_bindings_v1 to timed_pt_executor;
create policy pt_existing_section_binding_read_v1 on public.timed_section_source_bindings_v1 for select to timed_pt_executor using(true);
grant select,update on public.timed_section_configuration_v1 to timed_section_executor;
create policy section_configuration_read_v1 on public.timed_section_configuration_v1 for select to timed_section_executor using(true);
create policy section_configuration_lock_v1 on public.timed_section_configuration_v1 for update to timed_section_executor using(true) with check(false);
grant select,update on public.profiles,public.user_roles to timed_section_executor;
create policy section_profiles_read_v1 on public.profiles for select to timed_section_executor using(true);
create policy section_profiles_lock_v1 on public.profiles for update to timed_section_executor using(true) with check(false);
create policy section_roles_read_v1 on public.user_roles for select to timed_section_executor using(true);
create policy section_roles_lock_v1 on public.user_roles for update to timed_section_executor using(true) with check(false);
grant select,insert,update on public.bootcamp_kv,public.attempts,public.section_history,public.wrong_answer_journal,public.rc_drill_sessions,public.rc_attempts to timed_section_executor;
create policy section_kv_executor_v1 on public.bootcamp_kv for all to timed_section_executor using(true) with check(true);
create policy section_attempt_executor_v1 on public.attempts for all to timed_section_executor using(true) with check(true);
create policy section_history_executor_v1 on public.section_history for all to timed_section_executor using(true) with check(true);
create policy section_waj_executor_v1 on public.wrong_answer_journal for all to timed_section_executor using(true) with check(true);
create policy section_rc_session_executor_v1 on public.rc_drill_sessions for all to timed_section_executor using(true) with check(true);
create policy section_rc_attempt_executor_v1 on public.rc_attempts for all to timed_section_executor using(true) with check(true);

create function public.timed_section_require_access_v1(p_owner uuid) returns void
language plpgsql set search_path=pg_catalog,public as $$
begin
  perform 1 from public.user_roles where user_id=p_owner and role::text='admin' order by id for share;
  if found then return; end if;
  perform 1 from public.profiles where class_id=p_owner::text and has_drill_access for share;
  if found then return; end if;
  raise exception 'Manual section access unavailable' using errcode='PT401';
end $$;

create function public.timed_section_protected_v1(p_id uuid) returns boolean
language sql security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.timed_section_sittings_v1 where id=p_id);
$$;
create function public.guard_timed_section_source_v1() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare prior jsonb; next_row jsonb; item jsonb; section_id uuid; protected boolean:=false;
begin
  if TG_OP<>'INSERT' then prior:=to_jsonb(OLD); end if;
  if TG_OP<>'DELETE' then next_row:=to_jsonb(NEW); end if;
  foreach item in array array[prior,next_row] loop
    if item is null then continue; end if;
    -- Reserved identity markers are protected even when a forged row clears
    -- the normalized FK or moves a source into another legacy namespace.
    protected:=protected or coalesce(item->>'pool_slug' like 'drill::timed-section::%',false)
      or coalesce(item->>'completion_id' like 'drill::timed-section::%',false)
      or coalesce(item->>'source_key' like 'drill::timed-section::%',false)
      or coalesce(item->>'section_key' like 'drill::timed-section::%',false)
      or coalesce(item->'config' ? 'timedSectionSittingId',false);
    if TG_TABLE_NAME in ('attempts','section_history','rc_drill_sessions') then
      section_id:=nullif(item->>'timed_section_sitting_id','')::uuid;
      protected:=protected or section_id is not null;
    elsif TG_TABLE_NAME='rc_attempts' then
      select s.timed_section_sitting_id into section_id from public.rc_drill_sessions s where s.id=(item->>'session_id')::uuid;
      protected:=protected or section_id is not null;
    elsif TG_TABLE_NAME='bootcamp_kv' then
      protected:=protected or coalesce(item->>'record_id' like 'timed-section::%',false)
        or coalesce(item->'data'->>'pool_slug' like 'drill::timed-section::%',false)
        or coalesce(item->'data'->>'completion_id' like 'drill::timed-section::%',false);
      if not protected then
        select exists(select 1 from public.timed_section_source_bindings_v1 b where b.owner_id=(item->>'user_id')::uuid
          and b.namespace=item->>'table_name' and b.record_id=item->>'record_id') into protected;
      end if;
    end if;
  end loop;
  if protected and current_user<>'timed_section_executor' then
    raise exception 'Protected standalone section source requires its writer' using errcode='42501';
  end if;
  if TG_OP='DELETE' then return OLD; end if;
  return NEW;
end $$;
create trigger section_kv_guard_v1 before insert or update or delete on public.bootcamp_kv for each row execute function public.guard_timed_section_source_v1();
create trigger section_lr_attempt_guard_v1 before insert or update or delete on public.attempts for each row execute function public.guard_timed_section_source_v1();
create trigger section_history_guard_v1 before insert or update or delete on public.section_history for each row execute function public.guard_timed_section_source_v1();
create trigger section_rc_session_guard_v1 before insert or update or delete on public.rc_drill_sessions for each row execute function public.guard_timed_section_source_v1();
create trigger section_rc_attempt_guard_v1 before insert or update or delete on public.rc_attempts for each row execute function public.guard_timed_section_source_v1();

-- Ordinary source triggers need owner-visible binding lookup and RC session reads.
-- Trigger does not grant write privileges and examines OLD and NEW attribution.

create function public.timed_section_response_v1(p_sitting public.timed_section_sittings_v1,p_receipt public.timed_section_receipts_v1,p_replayed boolean) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare child jsonb; binding public.timed_section_source_bindings_v1; session_row public.rc_drill_sessions;
begin
  select * into binding from public.timed_section_source_bindings_v1 where sitting_id=p_sitting.id;
  if p_sitting.kind='lr' then
    select jsonb_build_object('kind','lr','record',data) into child from public.bootcamp_kv
      where user_id=p_sitting.owner_id and table_name=binding.namespace and record_id=binding.record_id;
  else
    select * into session_row from public.rc_drill_sessions where id=binding.rc_session_id and user_id=p_sitting.owner_id;
    if found then child:=jsonb_build_object('kind','rc','session',to_jsonb(session_row),'attempts',
      coalesce((select jsonb_agg(to_jsonb(a) order by a.question_id) from public.rc_attempts a where a.session_id=session_row.id),'[]'::jsonb)); end if;
  end if;
  return jsonb_build_object('contractVersion',1,'workKind','standalone-section','serverTime',clock_timestamp(),'sitting',to_jsonb(p_sitting),'child',child,'replayed',p_replayed,
    'receipt',case when p_receipt.command_id is null then null else jsonb_build_object('ownerId',p_receipt.owner_id,'workId',p_receipt.sitting_id,
      'commandId',p_receipt.command_id,'command',p_receipt.canonical_command,'committedRevision',p_receipt.committed_revision,'result',p_receipt.result) end);
end $$;

-- CHECKPOINT_AND_CLOSE_HELPERS
create function public.timed_section_save_checkpoint_v1(p_run public.timed_section_sittings_v1,p_payload jsonb,p_now timestamptz)
returns void language plpgsql set search_path=pg_catalog,public as $$
<<checkpoint_state>>
declare leg jsonb:=p_run.frozen_source;
  a jsonb; q jsonb; existing jsonb; question_state jsonb; data jsonb; merged jsonb; position integer;
  b public.timed_section_source_bindings_v1; s public.rc_drill_sessions; prior public.rc_attempts;
  attempt_id uuid;
begin
  perform public.timed_pt_check_keys_v1(p_payload,array['currentIndex','answers','regulationAnsweredQids','questionStates']);
  position:=(p_payload->>'currentIndex')::integer;
  if jsonb_typeof(p_payload->'currentIndex') is distinct from 'number' or p_payload->>'currentIndex' !~ '^[0-9]+$'
    or position is null or position<0 or position>=(leg->>'questionCount')::integer
    or jsonb_typeof(p_payload->'answers') is distinct from 'array' then
    raise exception 'Invalid checkpoint position or answers' using errcode='PT422'; end if;
  if leg->>'kind'='lr' then
    select * into b from public.timed_section_source_bindings_v1 where sitting_id=p_run.id;
    select kv.data into data from public.bootcamp_kv kv where user_id=p_run.owner_id and table_name=b.namespace and record_id=b.record_id for update;
    if data is null then raise exception 'Frozen LR child missing' using errcode='PT409'; end if;
    if (select count(*) from jsonb_array_elements(p_payload->'answers'))<>(select count(distinct v->>'qid') from jsonb_array_elements(p_payload->'answers') v) then
      raise exception 'Duplicate LR answer' using errcode='PT422'; end if;
    for a in select v from jsonb_array_elements(p_payload->'answers') v loop
      perform public.timed_pt_check_keys_v1(a,array['qid','selected','correct','timeMs','flagged','switchCount']);
      if jsonb_typeof(a->'qid') is distinct from 'string' or (a->>'qid'=any(p_run.frozen_qids)) is not true
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
        if jsonb_typeof(q->'qid') is distinct from 'string' or (q->>'qid'=any(p_run.frozen_qids)) is not true
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
        or exists(select 1 from jsonb_array_elements_text(p_payload->'regulationAnsweredQids') x where (x=any(p_run.frozen_qids)) is not true)
        or exists(select 1 from jsonb_array_elements_text(p_payload->'regulationAnsweredQids') x where not exists(
          select 1 from jsonb_array_elements(data->'attempts') answer where answer->>'qid'=x))
        or (select count(*) from jsonb_array_elements(p_payload->'regulationAnsweredQids'))<>(select count(distinct x) from jsonb_array_elements_text(p_payload->'regulationAnsweredQids') x)
        or (data ? 'regulation_answered_qids' and data->'regulation_answered_qids'<>p_payload->'regulationAnsweredQids') then
        raise exception 'Regulation identity cannot change' using errcode='PT409'; end if;
      data:=jsonb_set(data,'{regulation_answered_qids}',p_payload->'regulationAnsweredQids');
    end if;
    data:=data||jsonb_build_object('current_index',position,'elapsed_ms',p_run.elapsed_ms,'updated_at',p_now);
    update public.bootcamp_kv kv set data=checkpoint_state.data,updated_at=p_now where user_id=p_run.owner_id and table_name=b.namespace and record_id=b.record_id;
  else
    if p_payload ? 'regulationAnsweredQids' or p_payload ? 'questionStates' then raise exception 'RC has no LR checkpoint fields' using errcode='PT422'; end if;
    select * into s from public.rc_drill_sessions where timed_section_sitting_id=p_run.id and user_id=p_run.owner_id for update;
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
        if prior.user_id<>p_run.owner_id or prior.session_id<>s.id or prior.question_id<>(a->>'questionId')::integer
          or prior.passage_id<>(a->>'passageId')::integer or not prior.is_first_attempt then
          raise exception 'Changed attempt replay' using errcode='PT409'; end if;
        if (a->>'timeMs')::integer < prior.time_ms then raise exception 'Question time cannot decrease' using errcode='PT409'; end if;
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
          values(attempt_id,s.id,p_run.owner_id,(a->>'questionId')::integer,(a->>'passageId')::integer,a->>'selected',
            (a->>'isCorrect')::boolean,(a->>'timeMs')::integer,coalesce((a->>'flagged')::boolean,false),
            array(select jsonb_array_elements_text(coalesce(a->'eliminations','[]'))),true);
      end if;
    end loop;
    update public.rc_drill_sessions set config=config||jsonb_build_object('currentQuestionIndex',position,
      'clockElapsedSeconds',floor(p_run.elapsed_ms/1000.0),'lastActiveAt',p_now) where id=s.id;
  end if;
end $$;
create function public.timed_section_close_v1(p_run public.timed_section_sittings_v1,p_payload jsonb,p_now timestamptz)
returns jsonb language plpgsql set search_path=pg_catalog,public as $$
<<close_state>>
declare leg jsonb:=p_run.frozen_source;
  b public.timed_section_source_bindings_v1; s public.rc_drill_sessions; data jsonb; q jsonb; a jsonb; question_state jsonb; key jsonb;
  stats jsonb:='[]'; correct integer:=0; answered integer:=0; total integer:=(leg->>'questionCount')::integer;
  question_time bigint:=0; initial_answer text; is_correct boolean; history_id uuid; actor_class text;
begin
  if leg->>'kind'='lr' then
    perform public.timed_pt_check_keys_v1(p_payload,array['answerKeys','analysis']);
    if jsonb_typeof(p_payload->'answerKeys') is distinct from 'array' or jsonb_array_length(p_payload->'answerKeys')<>total
      or (select count(distinct v->>'qid') from jsonb_array_elements(p_payload->'answerKeys') v)<>total
      or (p_payload ? 'analysis' and jsonb_typeof(p_payload->'analysis') not in ('object','null')) then
      raise exception 'Complete LR answer keys required' using errcode='PT422'; end if;
    select * into b from public.timed_section_source_bindings_v1 where sitting_id=p_run.id;
    select kv.data into data from public.bootcamp_kv kv where user_id=p_run.owner_id and table_name=b.namespace and record_id=b.record_id for update;
    if data is null then raise exception 'Frozen LR child missing' using errcode='PT409'; end if;
    select p.class_id into actor_class from public.profiles p where p.class_id=p_run.owner_id::text for share;
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
        insert into public.attempts(user_id,class_id,qid,pt,section,qnum,qtype,level,correct,time_ms,mode,selected_answer,timestamp_iso,timed_section_sitting_id)
          values(p_run.owner_id,actor_class,q->>'qid',p_run.pt,(leg->>'section')::integer,(q->>'qnum')::integer,
            q->>'qtype',(q->>'level')::integer,is_correct,(a->>'time_ms')::integer,'full-section',a->>'selected_answer',p_now,p_run.id);
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
    insert into public.section_history(user_id,class_id,pt,section,mode,timed_section_sitting_id,
      initial_score,initial_total,initial_percent,total_time_ms,avg_time_ms,unanswered_count,br_used,
      total_questions,time_taken_ms,questions_json,analysis_json,by_qtype_json,by_difficulty_json,completed_at)
      values(p_run.owner_id,actor_class,p_run.pt,(leg->>'section')::integer,'full-section',p_run.id,
        correct,total,round(correct*100.0/total),question_time,round(question_time::numeric/total),total-answered,false,
        total,question_time,stats,p_payload->'analysis',
        (select jsonb_object_agg(label,jsonb_build_object('total',n,'correct',c)) from
          (select v->>'qtype' label,count(*) n,count(*) filter(where (v->>'initialCorrect')::boolean) c from jsonb_array_elements(stats) v group by v->>'qtype') tally),
        (select jsonb_object_agg(label,jsonb_build_object('total',n,'correct',c)) from
          (select v->>'difficulty' label,count(*) n,count(*) filter(where (v->>'initialCorrect')::boolean) c from jsonb_array_elements(stats) v group by v->>'difficulty') tally),
        p_now) returning id into history_id;
    update public.bootcamp_kv set data=close_state.data||jsonb_build_object('status','completed','elapsed_ms',p_run.elapsed_ms,'updated_at',p_now),updated_at=p_now
      where user_id=p_run.owner_id and table_name=b.namespace and record_id=b.record_id;
  else
    perform public.timed_pt_check_keys_v1(p_payload,array['analysis']);
    if p_payload ? 'analysis' and jsonb_typeof(p_payload->'analysis') not in ('object','null') then
      raise exception 'Invalid RC analysis' using errcode='PT422'; end if;
    select * into s from public.rc_drill_sessions where timed_section_sitting_id=p_run.id and user_id=p_run.owner_id for update;
    if not found or s.status<>'in_progress' then raise exception 'Frozen RC child missing' using errcode='PT409'; end if;
    for q in select v from jsonb_array_elements(leg->'questions') v loop
      insert into public.rc_attempts(session_id,user_id,question_id,passage_id,selected,is_correct,time_ms,is_first_attempt)
        select s.id,p_run.owner_id,(q->>'questionId')::integer,(q->>'passageId')::integer,null,false,0,true
        where not exists(select 1 from public.rc_attempts where session_id=s.id and question_id=(q->>'questionId')::integer and is_first_attempt);
    end loop;
    select count(*) filter(where attempt.is_correct),count(*) filter(where attempt.selected is not null)
      into correct,answered from public.rc_attempts attempt where attempt.session_id=s.id and attempt.is_first_attempt;
    update public.rc_drill_sessions set status='completed',completed_at=p_now,
      config=config||jsonb_build_object('clockElapsedSeconds',floor(p_run.elapsed_ms/1000.0),'lastActiveAt',p_now)
        ||case when p_payload ? 'analysis' then jsonb_build_object('analysis',p_payload->'analysis') else '{}'::jsonb end where id=s.id;
  end if;
  return jsonb_build_object('correct',correct,'answered',answered,'total',total,'timeMs',p_run.elapsed_ms,'historyId',history_id);
end $$;
-- PUBLIC_COMMAND_HANDLERS
create function public.timed_section_validate_command_v1(p_command jsonb,p_creation boolean) returns void
language plpgsql set search_path=pg_catalog,public as $$
begin
  perform public.timed_pt_check_keys_v1(p_command,array['workKind','workId','commandId','deviceId','expectedRevision','writerEpoch','operation','payload']);
  if p_command->>'workKind' is distinct from 'standalone-section'
    or jsonb_typeof(p_command->'workId') is distinct from 'string'
    or jsonb_typeof(p_command->'commandId') is distinct from 'string'
    or jsonb_typeof(p_command->'deviceId') is distinct from 'string'
    or coalesce(length(p_command->>'deviceId'),0) not between 1 and 128
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number' or p_command->>'expectedRevision' !~ '^[0-9]+$'
    or jsonb_typeof(p_command->'writerEpoch') is distinct from 'number' or p_command->>'writerEpoch' !~ '^[0-9]+$'
    or jsonb_typeof(p_command->'payload') is distinct from 'object'
    or (p_creation and (p_command->>'operation' is distinct from 'create' or p_command->>'expectedRevision'<>'0' or p_command->>'writerEpoch'<>'0'))
    or (not p_creation and coalesce(p_command->>'operation','') not in ('claim','start','checkpoint','heartbeat','pause','resume','close','abandon')) then
    raise exception 'Invalid standalone command envelope' using errcode='PT422'; end if;
  if (p_command->>'workId')::uuid is null or (p_command->>'commandId')::uuid is null then
    raise exception 'Sitting and command UUIDs required' using errcode='PT422'; end if;
end $$;

create or replace function public.timed_section_capability_v1() returns jsonb
language sql security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('contractVersion',1,'workKind','standalone-section','enabled',
    coalesce((select enabled from public.timed_section_configuration_v1 where singleton),false),
    'operations',jsonb_build_array('read','create','claim','start','checkpoint','heartbeat','pause','resume','close','abandon'),
    'sources',jsonb_build_array('manual-canonical'),'stage','writer-installed');
$$;

create function public.create_timed_section_v1(p_command jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
<<create_section>>
declare actor uuid:=public.timed_pt_actor_v1(); r public.timed_section_sittings_v1; rec public.timed_section_receipts_v1;
  c public.timed_section_configuration_v1; payload jsonb:=p_command->'payload'; frozen jsonb; id uuid; cid uuid;
  source_kind text; pt integer; section integer; pace text; seconds integer; at_time timestamptz;
begin
  if actor is null then raise exception 'Authentication required' using errcode='PT401'; end if;
  perform public.timed_section_validate_command_v1(p_command,true);
  perform public.timed_pt_check_keys_v1(payload,array['kind','pt','section','pace']);
  id:=(p_command->>'workId')::uuid; cid:=(p_command->>'commandId')::uuid;
  -- Serialize a missing sitting and exact creation receipt before row existence.
  perform pg_advisory_xact_lock(hashtextextended('timed-section-create:'||actor::text||':'||id::text,0));
  select * into r from public.timed_section_sittings_v1 where timed_section_sittings_v1.id=create_section.id and owner_id=actor for update;
  if found then
    select * into rec from public.timed_section_receipts_v1 where sitting_id=r.id and owner_id=actor and command_id=cid;
    if found and rec.canonical_command=p_command then return public.timed_section_response_v1(r,rec,true); end if;
    if found then raise exception 'Changed command replay' using errcode='PT412'; end if;
    raise exception 'Sitting identity already exists' using errcode='PT409';
  end if;
  select * into c from public.timed_section_configuration_v1 where singleton for share;
  if not coalesce(c.enabled,false) then raise exception 'Standalone timed writer inactive' using errcode='PT503'; end if;
  perform public.timed_section_require_access_v1(actor);
  if jsonb_typeof(payload->'kind') is distinct from 'string' or payload->>'kind' not in ('lr','rc')
    or jsonb_typeof(payload->'pt') is distinct from 'number' or payload->>'pt' !~ '^[1-9][0-9]*$'
    or jsonb_typeof(payload->'section') is distinct from 'number' or payload->>'section' !~ '^[1-9][0-9]*$'
    or jsonb_typeof(payload->'pace') is distinct from 'string' or payload->>'pace' not in ('standard','time-and-a-half','double-time','untimed') then
    raise exception 'Canonical section and pace required' using errcode='PT422'; end if;
  pt:=(payload->>'pt')::integer; section:=(payload->>'section')::integer; pace:=payload->>'pace';
  source_kind:=payload->>'kind';
  select leg into frozen from public.timed_content_manifests_v1 m,lateral jsonb_array_elements(m.blueprint->'legs') leg
    where m.manifest_sha256=c.manifest_sha256 and m.pt=create_section.pt
      and leg->>'kind'=source_kind and (leg->>'section')::integer=create_section.section;
  if frozen is null then raise exception 'Canonical section unavailable in selected catalog' using errcode='PT422'; end if;
  seconds:=case pace when 'standard' then 2100 when 'time-and-a-half' then 3150 when 'double-time' then 4200 else null end;
  at_time:=clock_timestamp();
  insert into public.timed_section_sittings_v1(id,owner_id,kind,source_kind,source_key,pt,section,manifest_sha256,frozen_source,frozen_qids,
    pace,budget_ms,lease_ms,device_id,created_at,updated_at)
    values(id,actor,source_kind,'manual-canonical',source_kind||'::pt'||pt::text||'-s'||section::text,pt,section,c.manifest_sha256,frozen,
      array(select jsonb_array_elements_text(frozen->'qids')),pace,seconds::bigint*1000,c.lease_ms,p_command->>'deviceId',at_time,at_time) returning * into r;
  insert into public.timed_section_receipts_v1(owner_id,sitting_id,command_id,canonical_command,committed_revision,result)
    values(actor,r.id,cid,p_command,r.revision,jsonb_build_object('operation','create')) returning * into rec;
  return public.timed_section_response_v1(r,rec,false);
exception when unique_violation then raise exception 'An active sitting already owns this canonical source' using errcode='PT409';
end $$;

create function public.commit_timed_section_v1(p_command jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor uuid:=public.timed_pt_actor_v1(); r public.timed_section_sittings_v1; rec public.timed_section_receipts_v1;
  cid uuid; op text:=p_command->>'operation'; payload jsonb:=p_command->'payload'; config public.timed_section_configuration_v1;
  at_time timestamptz; settled bigint; record_id text; source_key text; rc_id uuid; outcome jsonb;
begin
  if actor is null then raise exception 'Authentication required' using errcode='PT401'; end if;
  perform public.timed_section_validate_command_v1(p_command,false);
  cid:=(p_command->>'commandId')::uuid;
  select * into r from public.timed_section_sittings_v1 where id=(p_command->>'workId')::uuid and owner_id=actor for update;
  if not found then raise exception 'Owned standalone sitting unavailable' using errcode='PT401'; end if;
  select * into rec from public.timed_section_receipts_v1 where owner_id=actor and sitting_id=r.id and command_id=cid;
  if found then
    if rec.canonical_command<>p_command then raise exception 'Changed command replay' using errcode='PT412'; end if;
    return public.timed_section_response_v1(r,rec,true);
  end if;
  select * into config from public.timed_section_configuration_v1 where singleton for share;
  if not coalesce(config.enabled,false) then raise exception 'Standalone timed writer inactive' using errcode='PT503'; end if;
  if r.revision <> (p_command->>'expectedRevision')::bigint or r.writer_epoch <> (p_command->>'writerEpoch')::bigint then
    raise exception 'Standalone revision or epoch conflict' using errcode='PT409',detail=jsonb_build_object('sitting',to_jsonb(r))::text; end if;
  if r.phase in ('complete','abandoned') then raise exception 'Terminal section retained' using errcode='PT409'; end if;
  perform public.timed_section_require_access_v1(actor);
  at_time:=clock_timestamp(); settled:=r.elapsed_ms;
  if r.phase='running' then settled:=settled+greatest(0,floor(extract(epoch from(least(at_time,r.lease_expires_at)-r.clock_anchor_at))*1000))::bigint; end if;
  if op<>'claim' and r.device_id<>p_command->>'deviceId' then
    raise exception 'Another device owns this section' using errcode='PT409',detail=jsonb_build_object('sitting',to_jsonb(r))::text; end if;
  if op<>'claim' and r.phase='running' and at_time>r.lease_expires_at then
    raise exception 'Section lease expired; explicit claim required' using errcode='PT410',detail=jsonb_build_object('sitting',to_jsonb(r))::text; end if;
  r.elapsed_ms:=settled; outcome:=jsonb_build_object('operation',op);
  if op not in ('checkpoint','close') then perform public.timed_pt_check_keys_v1(payload,array[]::text[]); end if;
  if op='claim' then
    if r.device_id<>p_command->>'deviceId' and r.phase='running' and at_time<r.lease_expires_at then
      raise exception 'A live section lease belongs to another device' using errcode='PT409'; end if;
    r.device_id:=p_command->>'deviceId'; r.writer_epoch:=r.writer_epoch+1;
    if r.phase='running' then r.phase:='paused'; end if;
  elsif op='start' then
    if r.phase<>'ready' then raise exception 'Section already started' using errcode='PT409'; end if;
    source_key:='drill::timed-section::'||r.id::text; record_id:='timed-section::'||r.id::text;
    if r.kind='lr' then
      insert into public.timed_section_source_bindings_v1(sitting_id,owner_id,kind,namespace,record_id) values(r.id,actor,'lr','practice_sessions',record_id);
      insert into public.bootcamp_kv(user_id,table_name,record_id,data) values(actor,'practice_sessions',record_id,
        jsonb_build_object('id',record_id,'user_id',actor,'pool_slug',source_key,'completion_id',source_key,'data_version',2,'question_queue',to_jsonb(r.frozen_qids),
        'current_index',0,'attempts','[]'::jsonb,'status','in_progress','elapsed_ms',0,'timer_mode',case when r.budget_ms is null then 'unlimited' else 'custom' end,
        'timer_custom_minutes',r.budget_ms/60000.0,'started_at',at_time,'updated_at',at_time));
    else
      insert into public.rc_drill_sessions(user_id,config,passage_ids,timed_section_sitting_id)
        values(actor,jsonb_build_object('timedSectionSittingId',r.id,'clockElapsedSeconds',0,'currentQuestionIndex',0,'lastActiveAt',at_time,
          'timerSeconds',r.budget_ms/1000,'mode','section','source','manual','reveal','end_of_set'),
          array(select jsonb_array_elements_text(r.frozen_source->'passageIds')::integer),r.id) returning id into rc_id;
      insert into public.timed_section_source_bindings_v1(sitting_id,owner_id,kind,rc_session_id) values(r.id,actor,'rc',rc_id);
    end if;
    r.phase:='running';
  elsif op='checkpoint' then
    if r.phase<>'running' then raise exception 'Checkpoint requires running section' using errcode='PT409'; end if;
    perform public.timed_section_save_checkpoint_v1(r,payload,at_time);
    r.current_index:=(payload->>'currentIndex')::integer;
    r.snapshot:=payload;
  elsif op='heartbeat' then
    if r.phase<>'running' then raise exception 'Heartbeat requires running section' using errcode='PT409'; end if;
  elsif op='pause' then
    if r.phase<>'running' then raise exception 'Section clock is not running' using errcode='PT409'; end if;
    r.phase:='paused';
  elsif op='resume' then
    if r.phase<>'paused' then raise exception 'Section clock is not paused' using errcode='PT409'; end if;
    r.phase:='running';
  elsif op='close' then
    if r.phase not in ('running','paused') then raise exception 'Section cannot close before starting' using errcode='PT409'; end if;
    r.result:=public.timed_section_close_v1(r,payload,at_time); outcome:=outcome||r.result;
    r.phase:='complete'; r.completed_at:=at_time;
  elsif op='abandon' then
    r.phase:='abandoned';
    update public.rc_drill_sessions set status='abandoned' where timed_section_sitting_id=r.id and user_id=actor and status='in_progress';
  end if;
  r.clock_anchor_at:=case when r.phase='running' then at_time else null end;
  r.lease_expires_at:=case when r.phase='running' then at_time+r.lease_ms*interval '1 millisecond' else null end;
  r.revision:=r.revision+1; r.updated_at:=at_time;
  update public.timed_section_sittings_v1 set phase=r.phase,revision=r.revision,writer_epoch=r.writer_epoch,device_id=r.device_id,elapsed_ms=r.elapsed_ms,
    clock_anchor_at=r.clock_anchor_at,lease_expires_at=r.lease_expires_at,current_index=r.current_index,snapshot=r.snapshot,result=r.result,
    completed_at=r.completed_at,updated_at=r.updated_at where id=r.id returning * into r;
  insert into public.timed_section_receipts_v1(owner_id,sitting_id,command_id,canonical_command,committed_revision,result)
    values(actor,r.id,cid,p_command,r.revision,outcome) returning * into rec;
  return public.timed_section_response_v1(r,rec,false);
end $$;

create function public.read_timed_section_v1(p_work_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor uuid:=public.timed_pt_actor_v1(); r public.timed_section_sittings_v1; rec public.timed_section_receipts_v1;
begin
  if actor is null then raise exception 'Authentication required' using errcode='PT401'; end if;
  select * into r from public.timed_section_sittings_v1 where id=p_work_id and owner_id=actor for share;
  if not found then raise exception 'Owned section unavailable' using errcode='PT401'; end if;
  if r.phase not in ('complete','abandoned') then perform public.timed_section_require_access_v1(actor); end if;
  return public.timed_section_response_v1(r,rec,false);
end $$;

create temporary table timed_section_bootstrap_membership_v1 on commit drop as
  select current_user::text migration_role,m.admin_option,m.set_option,m.inherit_option
  from(select 1) seed left join pg_auth_members m on m.roleid=(select oid from pg_roles where rolname='timed_section_executor')
    and m.member=(select oid from pg_roles where rolname=current_user);
do $$ declare state record; begin
  select * into state from timed_section_bootstrap_membership_v1;
  if not pg_has_role(current_user,'timed_section_executor','SET') then execute format('grant timed_section_executor to %I with set true',state.migration_role); end if;
end $$;
grant create on schema public to timed_section_executor;
alter function public.timed_section_require_access_v1(uuid) owner to timed_section_executor;
alter function public.timed_section_protected_v1(uuid) owner to timed_section_executor;
alter function public.timed_section_response_v1(public.timed_section_sittings_v1,public.timed_section_receipts_v1,boolean) owner to timed_section_executor;
alter function public.timed_section_save_checkpoint_v1(public.timed_section_sittings_v1,jsonb,timestamptz) owner to timed_section_executor;
alter function public.timed_section_close_v1(public.timed_section_sittings_v1,jsonb,timestamptz) owner to timed_section_executor;
alter function public.timed_section_validate_command_v1(jsonb,boolean) owner to timed_section_executor;
alter function public.timed_section_capability_v1() owner to timed_section_executor;
alter function public.create_timed_section_v1(jsonb) owner to timed_section_executor;
alter function public.commit_timed_section_v1(jsonb) owner to timed_section_executor;
alter function public.read_timed_section_v1(uuid) owner to timed_section_executor;
revoke create on schema public from timed_section_executor;
revoke all on function public.timed_section_require_access_v1(uuid),public.timed_section_protected_v1(uuid),
  public.timed_section_response_v1(public.timed_section_sittings_v1,public.timed_section_receipts_v1,boolean),
  public.timed_section_save_checkpoint_v1(public.timed_section_sittings_v1,jsonb,timestamptz),
  public.timed_section_close_v1(public.timed_section_sittings_v1,jsonb,timestamptz),public.timed_section_validate_command_v1(jsonb,boolean),
  public.guard_timed_section_source_v1() from public,authenticated,anon;
revoke all on function public.timed_section_capability_v1(),public.create_timed_section_v1(jsonb),public.commit_timed_section_v1(jsonb),public.read_timed_section_v1(uuid) from public,anon;
grant execute on function public.timed_section_capability_v1(),public.create_timed_section_v1(jsonb),public.commit_timed_section_v1(jsonb),public.read_timed_section_v1(uuid) to authenticated;
do $$ declare state record; begin
  select * into state from timed_section_bootstrap_membership_v1;
  if state.admin_option is null then execute format('revoke timed_section_executor from %I',state.migration_role);
  else
    execute format('grant timed_section_executor to %I with set %s',state.migration_role,case when state.set_option then 'true' else 'false' end);
    execute format('grant timed_section_executor to %I with inherit %s',state.migration_role,case when state.inherit_option then 'true' else 'false' end);
  end if;
end $$;
commit;

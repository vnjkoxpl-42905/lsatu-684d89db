-- Inactive incremental upgrade after installed writer fcd04f352b715b185847985ed6f334a75bdecd145ca4710b51cf57e3bc874eeb.
begin;
DO $$ begin if (select enabled from public.timed_pt_configuration_v1 where singleton) is distinct from false then raise exception 'Timed writer must remain disabled during upgrade'; end if; end $$;
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
set local role timed_pt_executor;
create or replace function public.timed_pt_save_checkpoint_v1(p_run public.practice_test_runs,p_payload jsonb,p_now timestamptz)
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
create or replace function public.timed_pt_close_leg_v1(p_run public.practice_test_runs,p_payload jsonb,p_now timestamptz)
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
reset role;
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
commit;

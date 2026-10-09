// Synthetic local-only substrate, shared by isolated and multi-connection tests.
export const owner = '10000000-0000-4000-8000-000000000001';
export const other = '10000000-0000-4000-8000-000000000002';
export const manifestHash = 'a'.repeat(64);
export const blueprint = {
  pt: 140, questionCount: 6, rcFullLength: true, breakAfterLeg: 2, breakSeconds: 600,
  legs: [
    { kind: 'lr', section: 1, questionCount: 2, qids: ['PT140-S1-Q1','PT140-S1-Q2'], questions: [
      { qid:'PT140-S1-Q1',qnum:1,qtype:'Flaw',level:3 }, { qid:'PT140-S1-Q2',qnum:2,qtype:'Strengthen',level:2 },
    ] },
    { kind:'rc',section:2,questionCount:2,qids:['1001','1002'],passageIds:[101],questions:[
      {qid:'1001',questionId:1001,passageId:101,qnum:1}, {qid:'1002',questionId:1002,passageId:101,qnum:2},
    ] },
    { kind:'lr',section:3,questionCount:2,qids:['PT140-S3-Q1','PT140-S3-Q2'],questions:[
      {qid:'PT140-S3-Q1',qnum:1,qtype:'Flaw',level:3}, {qid:'PT140-S3-Q2',qnum:2,qtype:'Strengthen',level:2},
    ] },
  ],
};
export const setupSql = `
create role authenticated; create role anon;
create schema auth; create table auth.users(id uuid primary key);
insert into auth.users values('${owner}'),('${other}');
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.profiles(class_id text primary key,has_practice_access boolean not null default false);
create table public.user_roles(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),role text);
create table public.practice_test_assignments(id uuid primary key default gen_random_uuid(),student_id uuid references auth.users(id),pt integer,status text,unlock_at timestamptz,unique(student_id,pt));
insert into public.profiles(class_id,has_practice_access) values('${owner}',true),('${other}',false);
create table public.practice_test_runs(
 id text primary key,user_id uuid not null references auth.users(id),pt integer not null,pace text not null,
 legs jsonb not null,current_leg integer not null default 0,break_after_leg integer not null,
 break_taken boolean not null default false,break_started_at timestamptz,status text not null,
 revision integer not null default 0,section_seconds integer,active_device_id text,completed_at timestamptz,
 raw_correct integer,raw_total integer,scaled_score integer,score_source text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,user_id)
);
create function public.touch_practice_test_runs() returns trigger language plpgsql as
$$ begin NEW.updated_at=now(); return NEW; end $$;
create trigger practice_test_runs_touch before update on public.practice_test_runs for each row execute function public.touch_practice_test_runs();
create table public.bootcamp_kv(user_id uuid not null references auth.users(id),table_name text not null,record_id text not null,
 data jsonb not null,updated_at timestamptz not null default now(),primary key(user_id,table_name,record_id));
create table public.rc_drill_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 config jsonb not null,passage_ids integer[] not null,status text not null default 'in_progress',excluded_from_analytics boolean not null default false,
 started_at timestamptz not null default now(),completed_at timestamptz,practice_test_run_id text,practice_test_leg integer,
 unique(id,user_id),foreign key(practice_test_run_id,user_id) references public.practice_test_runs(id,user_id));
create unique index rc_sessions_pt_leg_once on public.rc_drill_sessions(practice_test_run_id,practice_test_leg) where practice_test_run_id is not null;
create table public.rc_attempts(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.rc_drill_sessions(id),
 user_id uuid not null references auth.users(id),question_id integer not null,passage_id integer not null,selected text,is_correct boolean,
 time_ms integer not null default 0,flagged boolean not null default false,eliminations text[] not null default '{}',
 is_first_attempt boolean not null default true,created_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.rc_drill_sessions(id,user_id));
create unique index rc_attempts_first_once on public.rc_attempts(session_id,question_id) where is_first_attempt;
create table public.section_history(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),class_id text not null,
 pt integer not null,section integer not null,mode text,practice_test_run_id text,practice_test_leg integer,
 initial_score integer not null default 0,initial_total integer,initial_percent integer,total_time_ms bigint,avg_time_ms integer,
 unanswered_count integer,br_used boolean,total_questions integer not null default 0,time_taken_ms bigint not null default 0,
 questions_json jsonb,analysis_json jsonb,by_qtype_json jsonb,by_difficulty_json jsonb,completed_at timestamptz default now(),created_at timestamptz default now(),
 foreign key(practice_test_run_id,user_id) references public.practice_test_runs(id,user_id));
create unique index section_history_pt_leg_once on public.section_history(practice_test_run_id,practice_test_leg) where practice_test_run_id is not null;
create table public.attempts(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),class_id text not null,
 qid text not null,pt integer not null,section integer not null,qnum integer not null,qtype text not null,level integer not null,
 correct boolean not null,time_ms integer not null,mode text not null,selected_answer text,timestamp_iso timestamptz);
create table public.wrong_answer_journal(id uuid primary key default gen_random_uuid(),class_id text not null,qid text not null,
 pt integer,section integer,qnum integer,qtype text,level integer,last_status text,revisit_count integer not null default 0,
 history_json jsonb not null default '[]',updated_at timestamptz default now(),unique(class_id,qid));
create function public.append_waj_wrong(p_class_id text,p_qid text,p_item jsonb,p_pt integer default null,p_section integer default null,
 p_qnum integer default null,p_qtype text default null,p_level integer default null) returns void language sql security invoker as $$
 insert into public.wrong_answer_journal(class_id,qid,pt,section,qnum,qtype,level,last_status,revisit_count,history_json)
 values(p_class_id,p_qid,p_pt,p_section,p_qnum,p_qtype,p_level,'wrong',0,jsonb_build_array(p_item))
 on conflict(class_id,qid) do update set history_json=wrong_answer_journal.history_json||p_item,last_status='wrong',
 revisit_count=jsonb_array_length(wrong_answer_journal.history_json),updated_at=now(); $$;
do $$ declare t text; begin
 foreach t in array array['practice_test_runs','bootcamp_kv','rc_drill_sessions','rc_attempts','section_history','attempts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy fixture_owner on public.%I for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',t);
 end loop;
 foreach t in array array['profiles','user_roles','practice_test_assignments','wrong_answer_journal'] loop
 execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;
`;
export const createCommand = (workId, commandId) => ({workKind:'practice-test',workId,commandId,deviceId:'device-a',expectedRevision:0,writerEpoch:0,operation:'create',payload:{pt:140,pace:'standard',sectionSeconds:2100}});
export const commandFor = (parent, operation, payload, commandId, deviceId = 'device-a') => ({workKind:'practice-test',workId:parent.id,commandId,deviceId,expectedRevision:parent.revision,writerEpoch:parent.timed_writer_epoch,operation,payload});

-- Sections post-section rebuild: Phase 1 and Phase 2 schema and functions.
-- Plan: plans/sections-post-section-rebuild.md (approved, SHA256 4f39f6a1...).
-- Additive only. No existing row is updated or deleted. No existing function,
-- policy or trigger is changed. Safe to re-run (every object is IF NOT EXISTS
-- or CREATE OR REPLACE).
--
-- Identity is server-owned throughout: user_id = auth.uid() and
-- class_id = auth.uid()::text (the rule every existing class_id policy uses).

begin;

-- ---------------------------------------------------------------------------
-- 1. section_history: new nullable columns (adding a column is not a row
--    write, so neither guard trigger fires).
-- ---------------------------------------------------------------------------
alter table public.section_history add column if not exists client_sitting_id uuid;
alter table public.section_history add column if not exists assignment_id text;
alter table public.section_history add column if not exists release_requires_br boolean;
create unique index if not exists section_history_client_sitting_once
  on public.section_history(client_sitting_id);
create unique index if not exists section_history_id_user
  on public.section_history(id, user_id);

-- ---------------------------------------------------------------------------
-- 2. standalone_section_sittings: one server-owned identity per sitting.
-- ---------------------------------------------------------------------------
create table if not exists public.standalone_section_sittings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pool_key text not null check (pool_key ~ '^drill::(section::pt[0-9]+-s[0-9]+|assignment::[A-Za-z0-9-]+)$'),
  state text not null default 'open' check (state in ('open','closed','abandoned')),
  generation integer not null check (generation >= 1),
  history_id uuid,
  adopted_from_record_id text,
  adopted_revision timestamptz,
  initialized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (user_id, pool_key, generation)
);
create unique index if not exists standalone_section_one_open
  on public.standalone_section_sittings(user_id, pool_key) where state = 'open';

alter table public.standalone_section_sittings enable row level security;
revoke all on public.standalone_section_sittings from public, anon, authenticated;
grant select on public.standalone_section_sittings to authenticated;
drop policy if exists standalone_sittings_owner_read on public.standalone_section_sittings;
create policy standalone_sittings_owner_read on public.standalone_section_sittings
  for select to authenticated using (user_id = auth.uid());
drop policy if exists standalone_sittings_admin_read on public.standalone_section_sittings;
create policy standalone_sittings_admin_read on public.standalone_section_sittings
  for select to authenticated using (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 3. section_review_records: prediction and blind review, written later.
-- ---------------------------------------------------------------------------
create table if not exists public.section_review_records (
  history_id uuid not null unique,
  user_id uuid not null,
  predicted_score integer check (predicted_score between 0 and 200),
  predicted_at timestamptz,
  br_results jsonb,
  br_score integer,
  br_total integer,
  br_percent integer,
  br_delta integer,
  br_analysis_json jsonb,
  br_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (history_id, user_id) references public.section_history(id, user_id) on delete cascade
);
alter table public.section_review_records enable row level security;
revoke all on public.section_review_records from public, anon, authenticated;
grant select on public.section_review_records to authenticated;
drop policy if exists review_records_owner_read on public.section_review_records;
create policy review_records_owner_read on public.section_review_records
  for select to authenticated using (user_id = auth.uid());
drop policy if exists review_records_admin_read on public.section_review_records;
create policy review_records_admin_read on public.section_review_records
  for select to authenticated using (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 4. open_section_sitting_v1
--    p_legacy_record_id / p_sitting_record_id: the bootcamp_kv record ids the
--    client derives (practiceSessionIdFor). Both are scoped to auth.uid(), so a
--    caller can only copy its own record. The old record is never modified.
-- ---------------------------------------------------------------------------
create or replace function public.open_section_sitting_v1(
  p_pool_key text,
  p_known_sitting_id uuid default null,
  p_restart boolean default false,
  p_expected_generation integer default null,
  p_legacy_record_id text default null,
  p_sitting_record_id text default null
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  latest public.standalone_section_sittings;
  known public.standalone_section_sittings;
  created public.standalone_section_sittings;
  legacy public.bootcamp_kv;
  next_gen integer;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_pool_key is null or p_pool_key !~ '^drill::(section::pt[0-9]+-s[0-9]+|assignment::[A-Za-z0-9-]+)$' then
    raise exception 'bad pool key' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || '|' || p_pool_key, 0));

  select * into latest from public.standalone_section_sittings
   where user_id = uid and pool_key = p_pool_key order by generation desc limit 1;

  if p_restart then
    if p_expected_generation is null then raise exception 'restart needs a generation' using errcode = '22023'; end if;
    if latest.id is not null and p_expected_generation < latest.generation then
      return jsonb_build_object('status', case when latest.state = 'closed' then 'closed' else 'open' end,
        'sitting_id', latest.id, 'generation', latest.generation, 'history_id', latest.history_id);
    end if;
    if latest.id is not null and latest.state = 'open' then
      update public.standalone_section_sittings set state = 'abandoned' where id = latest.id and state = 'open';
    end if;
  else
    if p_known_sitting_id is not null then
      select * into known from public.standalone_section_sittings where id = p_known_sitting_id and user_id = uid;
      if known.id is not null and known.id = latest.id then
        return jsonb_build_object('status', known.state, 'sitting_id', known.id,
          'generation', known.generation, 'history_id', known.history_id);
      end if;
      if latest.id is not null then
        return jsonb_build_object('status', 'stale', 'latest_state', latest.state, 'sitting_id', latest.id,
          'generation', latest.generation, 'history_id', latest.history_id);
      end if;
      -- Known id that is not ours, or no sitting at all: fall through and create.
    elsif latest.id is not null and latest.state = 'open' then
      return jsonb_build_object('status', 'open', 'sitting_id', latest.id,
        'generation', latest.generation, 'history_id', null);
    end if;
  end if;

  next_gen := coalesce(latest.generation, 0) + 1;
  insert into public.standalone_section_sittings(user_id, pool_key, generation)
    values (uid, p_pool_key, next_gen) returning * into created;

  -- Adopt an in-flight section's existing resume record (first generation only,
  -- never on a restart, which starts fresh by design).
  if not p_restart and next_gen = 1 and p_legacy_record_id is not null and p_sitting_record_id is not null then
    select * into legacy from public.bootcamp_kv
     where user_id = uid and table_name = 'practice_sessions' and record_id = p_legacy_record_id;
    if legacy.record_id is not null and coalesce(legacy.data->>'status', '') <> 'completed' then
      insert into public.bootcamp_kv(user_id, table_name, record_id, data, updated_at)
        values (uid, 'practice_sessions', p_sitting_record_id,
                legacy.data || jsonb_build_object('id', p_sitting_record_id), legacy.updated_at)
        on conflict do nothing;
      update public.standalone_section_sittings
         set adopted_from_record_id = p_legacy_record_id, adopted_revision = legacy.updated_at
       where id = created.id returning * into created;
    end if;
  end if;

  return jsonb_build_object('status', 'open', 'sitting_id', created.id, 'generation', created.generation,
    'history_id', null, 'adopted', created.adopted_from_record_id is not null,
    'adopted_revision', created.adopted_revision);
end $$;

-- ---------------------------------------------------------------------------
-- 5. close_standalone_section_v1
--    Payload: { pt, section, assignment_id?, history: {...section_history
--    totals...}, questions: [SectionQuestionStat], analysis: {...},
--    attempts: [{qid,pt,section,qnum,qtype,level,correct,time_ms,selected_answer}],
--    journal: [{qid,pt,section,qnum,qtype,level,item}] }
-- ---------------------------------------------------------------------------
create or replace function public.close_standalone_section_v1(p_sitting_id uuid, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  cls text;
  s public.standalone_section_sittings;
  h jsonb := p_payload->'history';
  qs jsonb := p_payload->'questions';
  existing record;
  new_id uuid;
  a jsonb; j jsonb;
  assignment text := nullif(p_payload->>'assignment_id', '');
  qcount integer;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  cls := uid::text;

  select * into s from public.standalone_section_sittings where id = p_sitting_id and user_id = uid;
  if s.id is null then return jsonb_build_object('status', 'stale'); end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || '|' || s.pool_key, 0));
  select * into s from public.standalone_section_sittings where id = p_sitting_id and user_id = uid;

  if s.state = 'closed' then
    select id, questions_json into existing from public.section_history
     where client_sitting_id = s.id and user_id = uid;
    return jsonb_build_object('status', 'replayed', 'history_id', existing.id,
      'conflict', existing.questions_json is distinct from qs);
  end if;
  if s.state <> 'open' then return jsonb_build_object('status', 'stale'); end if;

  -- Shape and marker checks.
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(qs) <> 'array' or jsonb_typeof(h) <> 'object' then
    raise exception 'bad payload' using errcode = '22023'; end if;
  if p_payload ?| array['practice_test_run_id','practice_test_leg','timed_section_sitting_id','user_id','class_id']
     or h ?| array['practice_test_run_id','practice_test_leg','timed_section_sitting_id','user_id','class_id'] then
    raise exception 'forbidden field' using errcode = '42501'; end if;
  qcount := jsonb_array_length(qs);
  if qcount < 1 or qcount > 40 or pg_column_size(p_payload) > 1000000 then
    raise exception 'payload size' using errcode = '22023'; end if;
  if (select count(distinct e->>'qid') from jsonb_array_elements(qs) e) <> qcount
     or exists (select 1 from jsonb_array_elements(qs) e where coalesce(e->>'qid','') = ''
                or jsonb_typeof(e->'initialCorrect') <> 'boolean' or e->>'correctAnswer' is null) then
    raise exception 'bad questions' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_payload->'attempts','[]')) e
             where not exists (select 1 from jsonb_array_elements(qs) q where q->>'qid' = e->>'qid'))
     or exists (select 1 from jsonb_array_elements(coalesce(p_payload->'journal','[]')) e
             where not exists (select 1 from jsonb_array_elements(qs) q where q->>'qid' = e->>'qid')) then
    raise exception 'attempt or journal qid outside section' using errcode = '22023'; end if;

  if assignment is not null then
    if s.pool_key <> 'drill::assignment::' || assignment then
      raise exception 'assignment does not match sitting' using errcode = '42501'; end if;
    if not exists (select 1 from public.homework_assignments ha where ha.id::text = assignment and ha.student_id = uid
                   and (select bool_and(q->>'qid' = any(ha.question_qids)) from jsonb_array_elements(qs) q)) then
      raise exception 'assignment not owned' using errcode = '42501'; end if;
  elsif s.pool_key like 'drill::assignment::%' then
    raise exception 'assignment missing' using errcode = '22023';
  end if;

  insert into public.section_history(
    class_id, user_id, client_sitting_id, assignment_id, release_requires_br,
    pt, section, mode, initial_score, initial_total, initial_percent,
    br_score, br_total, br_percent, br_delta, br_used,
    total_time_ms, avg_time_ms, unanswered_count, by_qtype_json, by_difficulty_json,
    questions_json, analysis_json, total_questions, time_taken_ms)
  values (cls, uid, s.id, assignment, assignment is not null,
    (p_payload->>'pt')::int, (p_payload->>'section')::int, 'full-section',
    (h->>'initial_score')::int, qcount, (h->>'initial_percent')::numeric,
    null, null, null, null, false,
    (h->>'total_time_ms')::int, (h->>'avg_time_ms')::int, (h->>'unanswered_count')::int,
    h->'by_qtype_json', h->'by_difficulty_json', qs, p_payload->'analysis', qcount, (h->>'total_time_ms')::int)
  on conflict (client_sitting_id) do nothing
  returning id into new_id;

  if new_id is null then
    select id, questions_json into existing from public.section_history where client_sitting_id = s.id and user_id = uid;
    return jsonb_build_object('status', 'replayed', 'history_id', existing.id,
      'conflict', existing.questions_json is distinct from qs);
  end if;

  for a in select * from jsonb_array_elements(coalesce(p_payload->'attempts','[]')) loop
    insert into public.attempts(id, class_id, user_id, qid, pt, section, qnum, qtype, level, correct, time_ms, mode, selected_answer, timestamp_iso)
    values (md5(s.id::text || (a->>'qid'))::uuid, cls, uid, a->>'qid', (a->>'pt')::int, (a->>'section')::int,
            (a->>'qnum')::int, a->>'qtype', (a->>'level')::int, (a->>'correct')::boolean,
            greatest(0, coalesce((a->>'time_ms')::int, 0)), 'full-section', a->>'selected_answer', now())
    on conflict (id) do nothing;
  end loop;

  for j in select * from jsonb_array_elements(coalesce(p_payload->'journal','[]')) loop
    perform public.append_waj_wrong(cls, j->>'qid',
      coalesce(j->'item','{}'::jsonb) || jsonb_build_object('sitting_id', s.id),
      (j->>'pt')::int, (j->>'section')::int, (j->>'qnum')::int, j->>'qtype', (j->>'level')::int);
  end loop;

  update public.standalone_section_sittings set state = 'closed', closed_at = now(), history_id = new_id
   where id = s.id and state = 'open';

  return jsonb_build_object('status', 'created', 'history_id', new_id, 'conflict', false);
end $$;

-- ---------------------------------------------------------------------------
-- 6. save_section_prediction_v1 and save_section_blind_review_v1
-- ---------------------------------------------------------------------------
create or replace function public.save_section_prediction_v1(p_history_id uuid, p_score integer)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_score is null or p_score < 0 or p_score > 200 then raise exception 'bad score' using errcode = '22023'; end if;
  if not exists (select 1 from public.section_history where id = p_history_id and user_id = uid and practice_test_run_id is null) then
    raise exception 'not found' using errcode = '42501'; end if;
  insert into public.section_review_records(history_id, user_id, predicted_score, predicted_at)
    values (p_history_id, uid, p_score, now())
  on conflict (history_id) do update set predicted_score = excluded.predicted_score,
    predicted_at = excluded.predicted_at, updated_at = now();
  return jsonb_build_object('status', 'saved');
end $$;

-- p_answers: [{qid, brAnswer, brTimeMs, brRationale?}]. Correctness is derived
-- here from the saved first answers and credited answers, never from the client.
-- A question with no BR answer keeps its first-pass result.
create or replace function public.save_section_blind_review_v1(p_history_id uuid, p_answers jsonb, p_analysis jsonb)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  row_ public.section_history;
  graded jsonb;
  score integer; total integer; existing timestamptz;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into row_ from public.section_history where id = p_history_id and user_id = uid;
  if row_.id is null then raise exception 'not found' using errcode = '42501'; end if;
  if row_.practice_test_run_id is not null then raise exception 'practice test rows are not reviewed here' using errcode = '42501'; end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) > 40 then raise exception 'bad answers' using errcode = '22023'; end if;
  if p_analysis is not null and jsonb_typeof(p_analysis) <> 'object' then raise exception 'bad analysis' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_answers) a
             where not exists (select 1 from jsonb_array_elements(row_.questions_json) q where q->>'qid' = a->>'qid')) then
    raise exception 'answer outside section' using errcode = '22023'; end if;

  select br_completed_at into existing from public.section_review_records where history_id = p_history_id;
  if existing is not null then
    return jsonb_build_object('status', 'already_saved');
  end if;

  select jsonb_agg(jsonb_build_object(
      'qid', q->>'qid',
      'preAnswer', q->>'initialAnswer',
      'brAnswer', a->>'brAnswer',
      'brRationale', coalesce(a->>'brRationale',''),
      'brTimeMs', greatest(0, coalesce((a->>'brTimeMs')::int, 0)),
      'brChanged', (a->>'brAnswer') is distinct from (q->>'initialAnswer'),
      'correct', (a->>'brAnswer') = (q->>'correctAnswer'))
      order by ord),
    count(*) filter (where case when a is null then (q->>'initialCorrect')::boolean
                                else (a->>'brAnswer') = (q->>'correctAnswer') end),
    count(*)
    into graded, score, total
  from jsonb_array_elements(row_.questions_json) with ordinality as x(q, ord)
  left join lateral (select e from jsonb_array_elements(p_answers) e where e->>'qid' = q->>'qid' limit 1) b(a) on true;

  graded := coalesce((select jsonb_agg(g) from jsonb_array_elements(graded) g where g->>'brAnswer' is not null), '[]'::jsonb);

  insert into public.section_review_records(history_id, user_id, br_results, br_score, br_total, br_percent, br_delta,
    br_analysis_json, br_completed_at)
  values (p_history_id, uid, graded, score, total,
    case when total > 0 then round(score * 100.0 / total)::int else 0 end,
    score - row_.initial_score, p_analysis, now())
  on conflict (history_id) do update set br_results = excluded.br_results, br_score = excluded.br_score,
    br_total = excluded.br_total, br_percent = excluded.br_percent, br_delta = excluded.br_delta,
    br_analysis_json = excluded.br_analysis_json, br_completed_at = excluded.br_completed_at, updated_at = now()
  where public.section_review_records.br_completed_at is null;

  return jsonb_build_object('status', 'saved', 'br_score', score, 'br_total', total, 'br_results', graded);
end $$;

-- ---------------------------------------------------------------------------
-- 7. Grants: authenticated only.
-- ---------------------------------------------------------------------------
revoke all on function public.open_section_sitting_v1(text, uuid, boolean, integer, text, text) from public, anon;
revoke all on function public.close_standalone_section_v1(uuid, jsonb) from public, anon;
revoke all on function public.save_section_prediction_v1(uuid, integer) from public, anon;
revoke all on function public.save_section_blind_review_v1(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.open_section_sitting_v1(text, uuid, boolean, integer, text, text) to authenticated;
grant execute on function public.close_standalone_section_v1(uuid, jsonb) to authenticated;
grant execute on function public.save_section_prediction_v1(uuid, integer) to authenticated;
grant execute on function public.save_section_blind_review_v1(uuid, jsonb, jsonb) to authenticated;

commit;

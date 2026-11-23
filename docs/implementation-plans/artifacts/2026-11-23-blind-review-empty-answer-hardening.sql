-- PROPOSAL ONLY (DO NOT RUN WITHOUT JOSHUA'S APPROVAL)
-- Finding F4 (optional server hardening):
-- 1. Treat empty or whitespace-only `brAnswer` entries in `save_section_blind_review_v1`
--    as untouched so even a legacy or direct client cannot accidentally grade an
--    untouched blank `''` string as wrong.
-- 2. Optional helper `save_section_blind_review_analysis_v1` if a sealed section's
--    blind review was launched later on `/review/section/:historyId` (where the client
--    rightly did not download `questions_json` prior to BR completion): once BR is
--    saved and released, the client can attach the `br_analysis_json` computed from
--    the released `questions_json` + `br_results` if `br_analysis_json` is still null.
--
-- Tradeoff: Adding `nullif(trim(e->>'brAnswer'), '') is not null` in `save_section_blind_review_v1`
-- is strictly additive hardening and matches the client filter.

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
  left join lateral (
    select e from jsonb_array_elements(p_answers) e
    where e->>'qid' = q->>'qid'
      and nullif(trim(e->>'brAnswer'), '') is not null
    limit 1
  ) b(a) on true;

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

create or replace function public.save_section_blind_review_analysis_v1(p_history_id uuid, p_analysis jsonb)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_analysis is null or jsonb_typeof(p_analysis) <> 'object' then raise exception 'bad analysis' using errcode = '22023'; end if;
  update public.section_review_records
     set br_analysis_json = p_analysis,
         updated_at = now()
   where history_id = p_history_id
     and user_id = uid
     and br_completed_at is not null
     and br_analysis_json is null;
  if not found then
    return jsonb_build_object('status', 'skipped');
  end if;
  return jsonb_build_object('status', 'saved');
end $$;

revoke all on function public.save_section_blind_review_analysis_v1(uuid, jsonb) from public, anon;
grant execute on function public.save_section_blind_review_analysis_v1(uuid, jsonb) to authenticated;

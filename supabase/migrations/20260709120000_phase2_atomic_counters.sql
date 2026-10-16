-- Phase 2 (COMPREHENSIVEAUDIT): atomic counter RPCs.
-- Replaces read-modify-write increments that lose updates under concurrent drill
-- usage with single-statement upserts. All functions are SECURITY INVOKER so the
-- existing RLS policies on each table still govern who may read/write; the only
-- change is that the increment is now atomic instead of a client-side round trip.
-- search_path is pinned to public to keep resolution deterministic.

-- 1. daily_stats: questions_answered / correct_answers / xp_earned / time_spent_ms
create or replace function public.increment_daily_stats(
  p_class_id text,
  p_date date,
  p_xp integer,
  p_time_ms bigint,
  p_correct boolean
) returns void
language sql
security invoker
set search_path = public
as $$
  insert into daily_stats (class_id, date, questions_answered, correct_answers, xp_earned, time_spent_ms)
  values (p_class_id, p_date, 1, case when p_correct then 1 else 0 end, coalesce(p_xp, 0), coalesce(p_time_ms, 0))
  on conflict (class_id, date) do update set
    questions_answered = daily_stats.questions_answered + 1,
    correct_answers    = daily_stats.correct_answers + (case when p_correct then 1 else 0 end),
    xp_earned          = daily_stats.xp_earned + coalesce(p_xp, 0),
    time_spent_ms      = daily_stats.time_spent_ms + coalesce(p_time_ms, 0);
$$;

-- 2. profiles.xp_total (row always exists for an active student; no-op if missing)
create or replace function public.increment_xp_total(
  p_class_id text,
  p_xp integer
) returns void
language sql
security invoker
set search_path = public
as $$
  update profiles
     set xp_total = coalesce(xp_total, 0) + coalesce(p_xp, 0)
   where class_id = p_class_id;
$$;

-- 3. question_usage.times_seen
create or replace function public.increment_question_seen(
  p_class_id text,
  p_qid text,
  p_mode text
) returns void
language sql
security invoker
set search_path = public
as $$
  insert into question_usage (class_id, qid, mode, times_seen, last_seen_at)
  values (p_class_id, p_qid, p_mode, 1, now())
  on conflict (class_id, qid, mode) do update set
    times_seen   = question_usage.times_seen + 1,
    last_seen_at = now();
$$;

-- 4a. wrong_answer_journal append on a wrong attempt (insert-or-append).
-- On append, the old array length equals (new length - 1), which is exactly the
-- revisit_count the client computed (newHistory.length - 1).
create or replace function public.append_waj_wrong(
  p_class_id text,
  p_qid text,
  p_item jsonb,
  p_pt integer default null,
  p_section integer default null,
  p_qnum integer default null,
  p_qtype text default null,
  p_level integer default null
) returns void
language sql
security invoker
set search_path = public
as $$
  insert into wrong_answer_journal
    (class_id, qid, pt, section, qnum, qtype, level, last_status, revisit_count, history_json)
  values
    (p_class_id, p_qid, p_pt, p_section, p_qnum, p_qtype, p_level, 'wrong', 0, jsonb_build_array(p_item))
  on conflict (class_id, qid) do update set
    history_json  = wrong_answer_journal.history_json || p_item,
    last_status   = 'wrong',
    revisit_count = jsonb_array_length(wrong_answer_journal.history_json),
    updated_at    = now();
$$;

-- 4b. wrong_answer_journal append on a correct attempt (update-only; no row is
-- created if the student never missed the question, matching current behavior).
create or replace function public.append_waj_correct(
  p_class_id text,
  p_qid text,
  p_item jsonb
) returns void
language sql
security invoker
set search_path = public
as $$
  update wrong_answer_journal set
    history_json  = history_json || p_item,
    last_status   = 'right',
    revisit_count = jsonb_array_length(history_json),
    updated_at    = now()
  where class_id = p_class_id and qid = p_qid;
$$;

-- 5. chapter_progress.view_count. user_id is taken from auth.uid() (not a param)
-- so the row can only ever belong to the calling user, satisfying RLS WITH CHECK.
create or replace function public.increment_chapter_view(
  p_topic_tag text,
  p_section_id text
) returns void
language sql
security invoker
set search_path = public
as $$
  insert into chapter_progress (user_id, topic_tag, section_id, view_count, first_viewed_at, last_viewed_at)
  values (auth.uid(), p_topic_tag, p_section_id, 1, now(), now())
  on conflict (user_id, topic_tag, section_id) do update set
    view_count     = chapter_progress.view_count + 1,
    last_viewed_at = now();
$$;

grant execute on function public.increment_daily_stats(text, date, integer, bigint, boolean) to authenticated, anon;
grant execute on function public.increment_xp_total(text, integer) to authenticated, anon;
grant execute on function public.increment_question_seen(text, text, text) to authenticated, anon;
grant execute on function public.append_waj_wrong(text, text, jsonb, integer, integer, integer, text, integer) to authenticated, anon;
grant execute on function public.append_waj_correct(text, text, jsonb) to authenticated, anon;
grant execute on function public.increment_chapter_view(text, text) to authenticated, anon;

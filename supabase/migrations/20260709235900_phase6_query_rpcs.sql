-- Phase 6 (COMPREHENSIVEAUDIT): server-side aggregate + latest-row RPCs.
-- Replaces three client-side fetch-all-rows queries whose row count was unbounded:
--   * inbox last-message-per-conversation (was a bounded .limit() stopgap)
--   * Practice total/accuracy (was: pull every attempt for the class)
--   * Analytics qtype x level x window rollup (was: pull every attempt for the class)
-- All functions are SECURITY INVOKER so the existing RLS policies on messages,
-- message_attachments, and attempts still govern who may read which rows; the only
-- change is that the rollup/limit happens in Postgres instead of after a full
-- download. search_path is pinned to public for deterministic resolution.

-- 1. Latest message per conversation (H22 proper fix).
-- DISTINCT ON returns exactly one row per conversation_id: the most recent message.
-- Shape matches the client's prior `{ id, conversation_id, body, created_at, sender_id }`
-- so the inbox enrichment code is unchanged.
create or replace function public.get_latest_messages(conv_ids uuid[])
returns table (
  conversation_id uuid,
  id uuid,
  body text,
  created_at timestamptz,
  sender_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct on (m.conversation_id)
         m.conversation_id, m.id, m.body, m.created_at, m.sender_id
  from messages m
  where m.conversation_id = any(conv_ids)
  order by m.conversation_id, m.created_at desc
$$;

-- 2. Conversations that have at least one attachment on ANY message.
-- Replaces the stopgap paperclip check that only inspected the bounded set of
-- recently-fetched messages (so an attachment older than the cutoff lost its
-- indicator). This makes the indicator exact again while staying a single query.
create or replace function public.get_conversations_with_attachments(conv_ids uuid[])
returns table (conversation_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct m.conversation_id
  from messages m
  join message_attachments a on a.message_id = m.id
  where m.conversation_id = any(conv_ids)
$$;

-- 3. Practice: light total/accuracy aggregate for a class.
-- Practice only needs totalAttempted + avgAccuracy, so return the two counts and
-- let the client divide. class_id is text (matches attempts.class_id).
create or replace function public.attempt_totals(p_class_id text)
returns table (total bigint, correct bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::bigint,
         count(*) filter (where correct)::bigint
  from attempts
  where class_id = p_class_id
$$;

-- 4. Analytics: qtype x level x time-window rollup for a class.
-- One grouped result reconstructs everything Analytics derived client-side:
--   typeStats      = sum over levels + buckets, grouped by qtype
--   levelStats     = sum over qtypes + buckets, grouped by level
--   typeLevelStats = sum over buckets, grouped by (qtype, level)
--   type7d         = rows where bucket = 'current7d'
--   typePrev7d     = rows where bucket = 'prev7d'
--   recentMissShare= (total - correct) per (qtype, level) across all buckets
-- The bucket CASE mirrors the JS window test exactly: current7d = last 7 days,
-- prev7d = the 7 days before that, older = everything else (incl. null timestamps,
-- which fall through to 'older' just as `new Date(null)` did client-side).
create or replace function public.attempt_accuracy_rollup(p_class_id text)
returns table (
  qtype text,
  level integer,
  bucket text,
  total bigint,
  correct bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select qtype,
         level,
         case
           when timestamp_iso >= now() - interval '7 days'  then 'current7d'
           when timestamp_iso >= now() - interval '14 days' then 'prev7d'
           else 'older'
         end as bucket,
         count(*)::bigint,
         count(*) filter (where correct)::bigint
  from attempts
  where class_id = p_class_id
  group by qtype, level, bucket
$$;

grant execute on function public.get_latest_messages(uuid[]) to authenticated, anon;
grant execute on function public.get_conversations_with_attachments(uuid[]) to authenticated, anon;
grant execute on function public.attempt_totals(text) to authenticated, anon;
grant execute on function public.attempt_accuracy_rollup(text) to authenticated, anon;

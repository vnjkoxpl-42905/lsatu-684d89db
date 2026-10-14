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
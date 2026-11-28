-- The UI's broad admin RLS policies are left in place for existing app flows.
-- Each connector RPC independently narrows access to the actor's own threads.
create or replace function public.mcp_list_inbox(
  p_unread_only boolean default false,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  actor uuid := public.mcp_require_admin();
  page_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  page_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  return (
    with threads as materialized (
      select c.id, c.subject, c.last_message_at, cp.last_read_at,
        (select count(*) from public.messages m
           where m.conversation_id = c.id and m.sender_id <> actor
             and m.created_at > coalesce(cp.last_read_at, '-infinity'::timestamptz)) as unread_count
      from public.conversation_participants cp
      join public.conversations c on c.id = cp.conversation_id
      where cp.user_id = actor
    ), page as materialized (
      select * from threads t
      where not coalesce(p_unread_only, false) or t.unread_count > 0
      order by t.last_message_at desc, t.id desc
      limit page_limit offset page_offset
    )
    select jsonb_build_object(
      'unread_conversations', (select count(*) from threads where unread_count > 0),
      'unread_messages', (select coalesce(sum(unread_count), 0) from threads),
      'conversations', coalesce((
        select jsonb_agg(jsonb_build_object(
          'thread_id', t.id,
          'subject', t.subject,
          'last_message_at', t.last_message_at,
          'last_read_at', t.last_read_at,
          'unread_messages', t.unread_count,
          'participants', coalesce((
            select jsonb_agg(jsonb_build_object('user_id', cp.user_id, 'display_name', p.display_name) order by cp.user_id)
            from public.conversation_participants cp
            left join public.profiles p on p.class_id::text = cp.user_id::text
            where cp.conversation_id = t.id
          ), '[]'::jsonb)
        ) order by t.last_message_at desc, t.id desc)
        from page t
      ), '[]'::jsonb),
      'next_offset', case when (
        select count(*) from threads t where not coalesce(p_unread_only, false) or t.unread_count > 0
      ) > page_offset::bigint + page_limit then page_offset::bigint + page_limit end
    )
  );
end;
$$;

create or replace function public.mcp_read_inbox_thread(
  p_thread_id uuid,
  p_message_id uuid default null,
  p_before_message_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  actor uuid := public.mcp_require_admin();
  cursor_time timestamptz;
  page_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if not public.is_conversation_participant(p_thread_id, actor) then
    raise exception using errcode = '42501', message = 'Inbox thread not available';
  end if;
  if p_message_id is not null and p_before_message_id is not null then
    raise exception using errcode = '22023', message = 'Choose either message_id or before_message_id';
  end if;
  if coalesce(p_message_id, p_before_message_id) is not null then
    select m.created_at into cursor_time from public.messages m
    where m.conversation_id = p_thread_id and m.id = coalesce(p_message_id, p_before_message_id);
    if not found then
      raise exception using errcode = '22023', message = 'Message not found in this Inbox thread';
    end if;
  end if;

  return (
    with candidate_messages as materialized (
      select m.id, m.sender_id, m.body, m.created_at, m.reply_to_message_id
      from public.messages m
      where m.conversation_id = p_thread_id
        and (p_message_id is null or m.id = p_message_id)
        and (p_before_message_id is null or (m.created_at, m.id) < (cursor_time, p_before_message_id))
      order by m.created_at desc, m.id desc
      limit page_limit + 1
    ), page as materialized (
      select * from candidate_messages order by created_at desc, id desc limit page_limit
    )
    select jsonb_build_object(
      'thread_id', c.id,
      'subject', c.subject,
      'last_read_at', me.last_read_at,
      'messages', coalesce((
        select jsonb_agg(to_jsonb(m) || jsonb_build_object(
          'sender_display_name', p.display_name,
          'attachments', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', a.id, 'file_name', a.file_name, 'file_size', a.file_size,
              'mime_type', a.mime_type, 'kind', a.kind
            ) order by a.id)
            from public.message_attachments a where a.message_id = m.id
          ), '[]'::jsonb)
        ) order by m.created_at desc, m.id desc)
        from page m left join public.profiles p on p.class_id::text = m.sender_id::text
      ), '[]'::jsonb),
      'next_before_message_id', case when (select count(*) from candidate_messages) > page_limit
        then (select m.id from page m order by m.created_at asc, m.id asc limit 1) end
    )
    from public.conversations c
    join public.conversation_participants me on me.conversation_id = c.id and me.user_id = actor
    where c.id = p_thread_id
  );
end;
$$;

create or replace function public.mcp_reply_inbox_thread(
  p_thread_id uuid,
  p_body text,
  p_reply_to_message_id uuid,
  p_idempotency_key text,
  p_confirm_send boolean
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := public.mcp_require_admin();
  body_text text := regexp_replace(coalesce(p_body, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  retry_key text := btrim(coalesce(p_idempotency_key, ''));
  request_hash text;
  prior jsonb;
  inserted public.messages%rowtype;
  receipt jsonb;
begin
  if p_confirm_send is distinct from true then
    raise exception using errcode = '22023', message = 'Explicit approval to send is required';
  end if;
  if length(body_text) not between 1 and 20000 or length(retry_key) not between 8 and 128 then
    raise exception using errcode = '22023', message = 'Invalid reply text or idempotency key';
  end if;
  perform 1 from public.conversation_participants cp
    where cp.conversation_id = p_thread_id and cp.user_id = actor for key share;
  if not found then
    raise exception using errcode = '42501', message = 'Inbox thread not available';
  end if;

  request_hash := encode(sha256(convert_to(
    jsonb_build_array(p_thread_id, p_reply_to_message_id, body_text)::text, 'UTF8'
  )), 'hex');
  perform pg_advisory_xact_lock(hashtextextended('mcp_inbox_reply:' || actor || ':' || retry_key, 0));
  select result into prior
  from public.mcp_write_audit
  where actor_id = actor and tool_name = 'reply_inbox_thread' and idempotency_key = retry_key;
  if found then
    if prior->>'request_hash' is distinct from request_hash then
      raise exception using errcode = '22023', message = 'Idempotency key belongs to a different reply';
    end if;
    return (prior - 'request_hash') || jsonb_build_object(
      'reused', true,
      'message_available', exists (
        select 1 from public.messages m
        where m.id = (prior->>'message_id')::uuid and m.conversation_id = p_thread_id
      )
    );
  end if;

  if p_reply_to_message_id is not null then
    perform 1 from public.messages m
      where m.id = p_reply_to_message_id and m.conversation_id = p_thread_id for key share;
    if not found then
      raise exception using errcode = '22023', message = 'Quoted message not found in this Inbox thread';
    end if;
  end if;

  -- Same insert and Realtime delivery as MessageComposer's text-only send.
  insert into public.messages (conversation_id, sender_id, body, reply_to_message_id)
  values (p_thread_id, actor, body_text, p_reply_to_message_id)
  returning * into inserted;

  receipt := jsonb_build_object(
    'thread_id', p_thread_id, 'message_id', inserted.id,
    'created_at', inserted.created_at, 'message_available', true,
    'delivery', jsonb_build_object('inbox', 'persisted', 'email', 'not_requested', 'bell', 'not_requested')
  );
  insert into public.mcp_write_audit (actor_id, tool_name, idempotency_key, result)
  values (actor, 'reply_inbox_thread', retry_key, receipt || jsonb_build_object('request_hash', request_hash));
  return receipt || jsonb_build_object('reused', false);
end;
$$;

revoke all on function public.mcp_list_inbox(boolean, integer, integer) from public, anon;
revoke all on function public.mcp_read_inbox_thread(uuid, uuid, uuid, integer) from public, anon;
revoke all on function public.mcp_reply_inbox_thread(uuid, text, uuid, text, boolean) from public, anon;
grant execute on function public.mcp_list_inbox(boolean, integer, integer) to authenticated;
grant execute on function public.mcp_read_inbox_thread(uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.mcp_reply_inbox_thread(uuid, text, uuid, text, boolean) to authenticated;
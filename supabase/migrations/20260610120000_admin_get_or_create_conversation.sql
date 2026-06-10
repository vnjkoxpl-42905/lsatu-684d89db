-- Atomic admin → student 1:1 conversation bootstrap.
--
-- Background: the admin "New conversation" dialog previously did a
-- check-then-insert in the client (look for an existing shared thread, and if
-- none, create one). Two near-simultaneous opens — or a double-click — could
-- both miss the existing thread and create duplicate 1:1 conversations with the
-- same student. This RPC moves the reuse-or-create into a single SECURITY
-- DEFINER call so the decision is atomic.
--
-- It also seeds the student's last_read_at in the past so the admin's very
-- first message reliably renders as unread on the student's side (mirrors the
-- recipient semantics the student→admin `get_or_create_joshua_conversation`
-- already relies on).

create or replace function public.admin_get_or_create_conversation(
  _student uuid,
  _subject text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  conv_id uuid;
begin
  if caller is null then
    raise exception 'unauthenticated';
  end if;

  if not public.has_role(caller, 'admin') then
    raise exception 'only admins may start conversations with students';
  end if;

  if _student is null or _student = caller then
    raise exception 'invalid student';
  end if;

  -- Reuse the existing 1:1 thread between this admin and the student, if any.
  select cp1.conversation_id into conv_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = caller
    and cp2.user_id = _student
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (subject, created_by, last_message_at)
  values (nullif(btrim(coalesce(_subject, '')), ''), caller, now())
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id, last_read_at)
  values
    (conv_id, caller, now()),
    -- Seed the recipient in the past so the first inbound message is unread.
    (conv_id, _student, 'epoch'::timestamptz);

  return conv_id;
end
$$;

grant execute on function public.admin_get_or_create_conversation(uuid, text) to authenticated;

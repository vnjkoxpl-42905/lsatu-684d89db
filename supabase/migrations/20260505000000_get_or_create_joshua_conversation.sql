-- Allows a non-admin student to bootstrap (or fetch) the canonical 1:1
-- conversation with the admin (Joshua). Required because the standard
-- conversations.INSERT RLS policy demands has_role(auth.uid(), 'admin'),
-- which a student cannot satisfy. Runs SECURITY DEFINER so the function
-- itself bypasses that policy in a controlled way: caller must be a real
-- non-admin authenticated user, and the only admin used is whichever
-- user_role row currently maps role='admin'. Idempotent — repeated calls
-- return the same conversation id.

create or replace function public.get_or_create_joshua_conversation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  admin_id uuid;
  conv_id uuid;
begin
  if caller is null then
    raise exception 'unauthenticated';
  end if;

  if exists (select 1 from public.user_roles where user_id = caller and role = 'admin') then
    raise exception 'admins must use the new conversation dialog';
  end if;

  select user_id into admin_id
  from public.user_roles
  where role = 'admin'
  order by created_at asc
  limit 1;
  if admin_id is null then
    raise exception 'no admin configured';
  end if;

  -- Reuse the existing 1:1 if one already exists.
  select cp1.conversation_id into conv_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = caller
    and cp2.user_id = admin_id
  limit 1;
  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (created_by, last_message_at)
  values (admin_id, now())
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id, last_read_at)
  values
    (conv_id, admin_id, now()),
    (conv_id, caller, now());

  return conv_id;
end
$$;

grant execute on function public.get_or_create_joshua_conversation() to authenticated;

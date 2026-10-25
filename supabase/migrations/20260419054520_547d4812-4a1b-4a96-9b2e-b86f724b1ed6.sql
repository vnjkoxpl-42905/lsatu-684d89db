create or replace function public.get_conversation_participant_names(_user_ids uuid[])
returns table(user_id uuid, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.class_id::uuid as user_id, p.display_name
  from public.profiles p
  where p.class_id::uuid = any(_user_ids)
    and (
      p.class_id::uuid = auth.uid()
      or exists (
        select 1
        from public.conversation_participants cp_self
        join public.conversation_participants cp_other
          on cp_other.conversation_id = cp_self.conversation_id
        where cp_self.user_id = auth.uid()
          and cp_other.user_id = p.class_id::uuid
      )
    );
$$;

grant execute on function public.get_conversation_participant_names(uuid[]) to authenticated;
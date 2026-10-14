-- Match the reader's tag editor: changing a color keeps the tag name;
-- renaming cannot merge or overwrite an existing tag.
begin;
create or replace function public.reading_center_rename_tag(p_old_name text,p_new_name text,p_color int)
returns void language plpgsql security invoker set search_path=public
as $$
declare v_name text := trim(p_new_name);
begin
  if not public.has_reading_center_access() then
    raise exception 'Reading Center is not assigned' using errcode='42501';
  end if;
  if v_name is null or length(v_name) not between 1 and 100 then
    raise exception 'Choose a tag name between 1 and 100 characters' using errcode='22023';
  end if;
  if p_color is null or p_color not between 0 and 24 then
    raise exception 'Choose a valid tag color' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('reading-center-tags:' || auth.uid()::text,0));
  if not exists(select 1 from public.reading_center_tags where user_id=auth.uid() and name=p_old_name) then
    raise exception 'Tag not found' using errcode='22023';
  end if;
  if v_name=p_old_name then
    update public.reading_center_tags set color=p_color where user_id=auth.uid() and name=p_old_name;
    return;
  end if;
  if exists(select 1 from public.reading_center_tags where user_id=auth.uid() and name=v_name) then
    raise exception 'A tag with that name already exists' using errcode='23505';
  end if;
  -- A direct concurrent tag creation is also protected by the unique key.
  -- No conflict overwrite is allowed, so a collision rolls back the rename.
  insert into public.reading_center_tags(user_id,name,color) values(auth.uid(),v_name,p_color);
  update public.reading_center_passage_metadata set tags=array(
    select distinct x from unnest(array_replace(tags,p_old_name,v_name)) as x
  ) where user_id=auth.uid() and p_old_name=any(tags);
  delete from public.reading_center_tags where user_id=auth.uid() and name=p_old_name;
end;
$$;
revoke all on function public.reading_center_rename_tag(text,text,int) from public,anon;
grant execute on function public.reading_center_rename_tag(text,text,int) to authenticated;
commit;

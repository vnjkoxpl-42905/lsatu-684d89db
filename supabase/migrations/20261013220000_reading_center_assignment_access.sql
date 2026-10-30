-- Whole-tool access is issued through immutable Classroom source fields.
-- Re-runnable; no existing student reading data is removed.
begin;

create or replace function public.has_reading_center_access()
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and (
    public.has_role(auth.uid(), 'admin') or exists (
      select 1 from public.classroom_items ci
      where ci.student_id = auth.uid() and ci.type = 'activity'
        and ci.source_table = 'reading_center' and ci.source_id = 'library'
        and ci.visible_to_student and ci.status in ('assigned','in_progress','completed')
        and (ci.unlock_at is null or ci.unlock_at <= now())
    )
  );
$$;
revoke all on function public.has_reading_center_access() from public, anon;
grant execute on function public.has_reading_center_access() to authenticated;

-- Classroom allows students to advance status. A draft or archived grant must
-- never become an entitlement through that ordinary progress update path.
create or replace function public.guard_reading_center_assignment_update()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') and
    (old.source_table='reading_center' or new.source_table='reading_center') then
    if new.source_table is distinct from old.source_table or new.source_id is distinct from old.source_id
      or new.student_id is distinct from old.student_id or new.created_by is distinct from old.created_by
      or new.type is distinct from old.type or new.visible_to_student is distinct from old.visible_to_student
      or new.unlock_at is distinct from old.unlock_at
      or old.status not in ('assigned','in_progress','completed')
      or new.status not in ('assigned','in_progress','completed') then
      raise exception 'Only an administrator may change Reading Center access' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_reading_center_assignment_update() from public,anon,authenticated;
drop trigger if exists reading_center_assignment_update_guard on public.classroom_items;
create trigger reading_center_assignment_update_guard before update on public.classroom_items
for each row execute function public.guard_reading_center_assignment_update();

-- This partial unique index plus an advisory transaction lock prevents double
-- assignments from two tabs. Revocation preserves the previous item as history.
create unique index if not exists reading_center_one_active_assignment
on public.classroom_items (student_id)
where source_table = 'reading_center' and source_id = 'library'
  and visible_to_student and status in ('assigned','in_progress','completed');

create or replace function public.assign_reading_center(
  p_student_id uuid, p_unlock_at timestamptz default null,
  p_title text default 'Reading Center',
  p_description text default 'Practice reading articles with five reading modes, bookmarks and reading goals.'
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_item public.classroom_items%rowtype;
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then
    raise exception 'Only an administrator may assign Reading Center' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = p_student_id) then
    raise exception 'Student account not found' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('reading-center:' || p_student_id::text, 0));
  select * into v_item from public.classroom_items
    where student_id = p_student_id and type = 'activity'
      and source_table = 'reading_center' and source_id = 'library'
      and visible_to_student and status in ('assigned','in_progress','completed')
    limit 1;
  if found then return jsonb_build_object('item',to_jsonb(v_item),'reused',true); end if;
  insert into public.classroom_items (
    student_id,class_id,created_by,type,title,description,source_table,source_id,
    status,visible_to_student,unlock_at,metadata_json
  ) values (
    p_student_id,p_student_id,auth.uid(),'activity',coalesce(nullif(trim(p_title),''),'Reading Center'),
    p_description,'reading_center','library','assigned',true,p_unlock_at,
    jsonb_build_object('assigned_route','/reading-center')
  ) returning * into v_item;
  return jsonb_build_object('item',to_jsonb(v_item),'reused',false);
end;
$$;
revoke all on function public.assign_reading_center(uuid,timestamptz,text,text) from public,anon;
grant execute on function public.assign_reading_center(uuid,timestamptz,text,text) to authenticated;

create or replace function public.revoke_reading_center(p_student_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then
    raise exception 'Only an administrator may remove Reading Center access' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('reading-center:' || p_student_id::text, 0));
  update public.classroom_items set visible_to_student=false,status='archived'
    where student_id=p_student_id and source_table='reading_center' and source_id='library'
      and (visible_to_student or status <> 'archived');
end;
$$;
revoke all on function public.revoke_reading_center(uuid) from public,anon;
grant execute on function public.revoke_reading_center(uuid) to authenticated;

alter table public.reading_center_passages add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.reading_center_passages add column if not exists genre text;
alter table public.reading_center_bookmarks add column if not exists note text;

create table if not exists public.reading_center_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  color int not null default 0 check (color between 0 and 24),
  primary key (user_id,name)
);
create table if not exists public.reading_center_passage_metadata (
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_id uuid not null references public.reading_center_passages(id) on delete cascade,
  tags text[] not null default '{}', hidden boolean not null default false,
  title_override text, body_override text, author_override text, genre_override text, cover_url_override text,
  primary key (user_id,passage_id)
);
create table if not exists public.reading_center_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default ''
);

-- Remove v1's broad signed-in read policy. Owners need an active grant too.
drop policy if exists "rc passages read published" on public.reading_center_passages;
drop policy if exists "rc passages assigned read" on public.reading_center_passages;
create policy "rc passages assigned read" on public.reading_center_passages for select to authenticated
using (public.has_role(auth.uid(),'admin') or (public.has_reading_center_access() and
  (owner_id=auth.uid() or (owner_id is null and is_published))));
drop policy if exists "rc passages owner insert" on public.reading_center_passages;
create policy "rc passages owner insert" on public.reading_center_passages for insert to authenticated
with check (owner_id=auth.uid() and public.has_reading_center_access());
drop policy if exists "rc passages owner update" on public.reading_center_passages;
create policy "rc passages owner update" on public.reading_center_passages for update to authenticated
using (owner_id=auth.uid() and public.has_reading_center_access())
with check (owner_id=auth.uid() and public.has_reading_center_access());
drop policy if exists "rc passages owner delete" on public.reading_center_passages;
create policy "rc passages owner delete" on public.reading_center_passages for delete to authenticated
using (owner_id=auth.uid() and public.has_reading_center_access());

-- Ensure unassigned users cannot write their own progress via direct API.
do $$
declare t text; n text;
begin
  foreach t in array array['preferences','progress','bookmarks','sessions','tags','passage_metadata','profile'] loop
    execute format('alter table public.%I enable row level security', 'reading_center_' || t);
    n := case t when 'preferences' then 'prefs' when 'passage_metadata' then 'metadata' else t end;
    execute format('drop policy if exists %I on public.%I', 'rc ' || n || ' own', 'reading_center_' || t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id=auth.uid() and public.has_reading_center_access()) with check (user_id=auth.uid() and public.has_reading_center_access())', 'rc ' || n || ' own','reading_center_' || t);
    execute format('drop policy if exists %I on public.%I','rc ' || n || ' admin read','reading_center_' || t);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_role(auth.uid(),''admin''))','rc ' || n || ' admin read','reading_center_' || t);
    execute format('grant select,insert,update,delete on public.%I to authenticated','reading_center_' || t);
  end loop;
end;
$$;
grant select,insert,update,delete on public.reading_center_passages to authenticated;

-- Per-user metadata must reference a passage that this user may actually read.
drop policy if exists "rc metadata own" on public.reading_center_passage_metadata;
create policy "rc metadata own" on public.reading_center_passage_metadata for all to authenticated
using (user_id=auth.uid() and public.has_reading_center_access() and exists (
  select 1 from public.reading_center_passages p where p.id=passage_id
))
with check (user_id=auth.uid() and public.has_reading_center_access() and exists (
  select 1 from public.reading_center_passages p where p.id=passage_id
));

do $$
declare t text;
begin
  foreach t in array array['progress','bookmarks','sessions'] loop
    execute format('drop policy if exists %I on public.%I', 'rc ' || t || ' own', 'reading_center_' || t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id=auth.uid() and public.has_reading_center_access() and exists(select 1 from public.reading_center_passages p where p.id=passage_id)) with check (user_id=auth.uid() and public.has_reading_center_access() and exists(select 1 from public.reading_center_passages p where p.id=passage_id))','rc ' || t || ' own','reading_center_' || t);
  end loop;
end;
$$;

create or replace function public.reading_center_rename_tag(p_old_name text,p_new_name text,p_color int)
returns void language plpgsql security invoker set search_path=public
as $$
begin
  if not public.has_reading_center_access() then raise exception 'Reading Center is not assigned' using errcode='42501'; end if;
  if not exists(select 1 from public.reading_center_tags where user_id=auth.uid() and name=p_old_name) then
    raise exception 'Tag not found' using errcode='22023';
  end if;
  insert into public.reading_center_tags(user_id,name,color) values(auth.uid(),trim(p_new_name),p_color)
    on conflict(user_id,name) do update set color=excluded.color;
  update public.reading_center_passage_metadata set tags=array(
    select distinct x from unnest(array_replace(tags,p_old_name,trim(p_new_name))) as x
  ) where user_id=auth.uid() and p_old_name=any(tags);
  if p_old_name<>trim(p_new_name) then
    delete from public.reading_center_tags where user_id=auth.uid() and name=p_old_name;
  end if;
end;
$$;
create or replace function public.reading_center_delete_tag(p_name text)
returns void language plpgsql security invoker set search_path=public
as $$
begin
  if not public.has_reading_center_access() then raise exception 'Reading Center is not assigned' using errcode='42501'; end if;
  update public.reading_center_passage_metadata set tags=array_remove(tags,p_name)
    where user_id=auth.uid() and p_name=any(tags);
  delete from public.reading_center_tags where user_id=auth.uid() and name=p_name;
end;
$$;
revoke all on function public.reading_center_rename_tag(text,text,int), public.reading_center_delete_tag(text) from public,anon;
grant execute on function public.reading_center_rename_tag(text,text,int), public.reading_center_delete_tag(text) to authenticated;

commit;

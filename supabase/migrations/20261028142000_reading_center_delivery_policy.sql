begin;
-- The existing four-argument RPC remains a compatibility wrapper. After
-- activation its legacy policy fails at the insert guard before work exists.
create or replace function public.assign_reading_center(
 p_student_id uuid,p_unlock_at timestamptz,p_title text,p_description text,
 p_notification_policy text,p_notification_group_id uuid
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_item public.classroom_items%rowtype;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Only an administrator may assign Reading Center' using errcode='42501'; end if;
 if not exists(select 1 from auth.users where id=p_student_id) then raise exception 'Student account not found' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('reading-center:'||p_student_id::text,0));
 select * into v_item from public.classroom_items where student_id=p_student_id and type='activity'
 and source_table='reading_center' and source_id='library' and visible_to_student and status in ('assigned','in_progress','completed') limit 1;
 if found then return jsonb_build_object('item',to_jsonb(v_item),'reused',true); end if;
 insert into public.classroom_items(student_id,class_id,created_by,type,title,description,source_table,source_id,status,visible_to_student,unlock_at,metadata_json,notification_policy,notification_group_id)
 values(p_student_id,p_student_id,auth.uid(),'activity',coalesce(nullif(trim(p_title),''),'Reading Center'),p_description,'reading_center','library','assigned',true,p_unlock_at,
 jsonb_build_object('assigned_route','/reading-center'),p_notification_policy,p_notification_group_id) returning * into v_item;
 return jsonb_build_object('item',to_jsonb(v_item),'reused',false);
end $$;
create or replace function public.assign_reading_center(
 p_student_id uuid,p_unlock_at timestamptz default null,p_title text default 'Reading Center',
 p_description text default 'Practice reading articles with five reading modes, bookmarks and reading goals.'
) returns jsonb language sql security definer set search_path=public as $$
 select public.assign_reading_center(p_student_id,p_unlock_at,p_title,p_description,'legacy_client',null)
$$;
revoke all on function public.assign_reading_center(uuid,timestamptz,text,text,text,uuid),public.assign_reading_center(uuid,timestamptz,text,text) from public,anon;
grant execute on function public.assign_reading_center(uuid,timestamptz,text,text,text,uuid),public.assign_reading_center(uuid,timestamptz,text,text) to authenticated;
commit;

-- Account ownership, not an administrator role, controls read receipts.
-- An administrator may read their own assigned work, never another student's.
begin;
create or replace function public.acknowledge_student_work(p_source_table text,p_source_id uuid,p_issuance integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();s jsonb;r public.student_work_receipts%rowtype; stamp timestamptz:=now();
begin
 if actor is null then raise exception 'Only the assigned account may acknowledge work' using errcode='42501'; end if;
 if not public.student_work_native_table(p_source_table) and p_source_table<>'classroom_items' then raise exception 'Unknown work identity' using errcode='42501'; end if;
 execute format('select 1 from public.%I where id=$1 and student_id=$2 for update',p_source_table) using p_source_id,actor;
 perform 1 from public.classroom_items where student_id=actor and source_table=p_source_table for share;
 s:=public.student_work_state(p_source_table,p_source_id,actor);
 if s is null or not (s->>'available')::boolean or (s->>'issuance')::integer<>p_issuance then
   raise exception 'This assignment is unavailable or has been reassigned' using errcode='42501';
 end if;
 p_source_table:=s->>'source_table';p_source_id:=(s->>'source_id')::uuid;
 insert into public.student_work_receipts(student_id,source_table,source_id,issuance,first_opened_at,last_opened_at,read_at)
 values(actor,p_source_table,p_source_id,p_issuance,stamp,stamp,stamp)
 on conflict(student_id,source_table,source_id,issuance) do update set last_opened_at=excluded.last_opened_at
 returning * into r;
 if p_source_table='classroom_items' then
   update public.classroom_items set metadata_json=coalesce(metadata_json,'{}')||jsonb_build_object('read_at',r.read_at,'first_opened_at',r.first_opened_at,'last_opened_at',r.last_opened_at)
    where id=p_source_id and student_id=actor;
 elsif p_source_table='ta_assignments' then
   update public.ta_assignments set viewed_at=coalesce(viewed_at,stamp) where id=p_source_id and student_id=actor;
 elsif p_source_table='guided_drill_assignments' then
   update public.guided_drill_assignments set read_card_at=coalesce(read_card_at,stamp) where id=p_source_id and student_id=actor;
 end if;
 update public.notifications n set read=true where n.user_id=actor and not n.read and (
   exists(select 1 from public.assignment_delivery_events e where e.id=n.assignment_event_id and e.student_id=actor and e.source_table=p_source_table and e.source_id=p_source_id and e.issuance=p_issuance)
   or exists(select 1 from public.assignment_notification_legacy_links l where l.notification_id=n.id and l.student_id=actor and l.source_table=p_source_table and l.source_id=p_source_id and l.issuance=p_issuance));
 update public.notifications n set read=true where n.user_id=actor and not n.read and n.assignment_group_id is not null
   and exists(select 1 from public.assignment_notification_groups g where g.id=n.assignment_group_id and g.student_id=actor and g.kind='assignments')
   and exists(select 1 from public.assignment_delivery_events member where member.group_id=n.assignment_group_id and member.student_id=actor
    and member.source_table=p_source_table and member.source_id=p_source_id and member.issuance=p_issuance
    and member.delivered_at is not null and member.cancelled_at is null)
   and not exists(select 1 from public.assignment_delivery_events e where e.group_id=n.assignment_group_id and e.delivered_at is not null and e.cancelled_at is null
    and (public.student_work_state(e.source_table,e.source_id,actor)->>'issuance')::integer=e.issuance
    and coalesce((public.student_work_state(e.source_table,e.source_id,actor)->>'available')::boolean,false)
    and not exists(select 1 from public.student_work_receipts rr where rr.student_id=actor and rr.source_table=e.source_table and rr.source_id=e.source_id and rr.issuance=e.issuance));
 return to_jsonb(r)-'student_id'||jsonb_build_object('acknowledged',true);
end $$;

revoke all on function public.acknowledge_student_work(text,uuid,integer) from public,anon;
grant execute on function public.acknowledge_student_work(text,uuid,integer) to authenticated;
commit;

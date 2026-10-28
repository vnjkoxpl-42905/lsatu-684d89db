-- Phase one only. Delivery and cron stay off until the exact frontend is verified.
begin;

create table if not exists public.assignment_delivery_control (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  verified_frontend_sha text,
  activated_at timestamptz
);
insert into public.assignment_delivery_control(singleton) values(true) on conflict do nothing;
alter table public.assignment_delivery_control enable row level security;
revoke all on public.assignment_delivery_control from public, anon, authenticated;
grant all on public.assignment_delivery_control to service_role;

do $$ declare t text; begin
  foreach t in array array['homework_assignments','ta_assignments','guided_drill_assignments','activity_assignments','practice_test_assignments','classroom_items'] loop
    execute format('alter table public.%I add column if not exists issuance integer not null default 1 check(issuance>0)',t);
    execute format('alter table public.%I add column if not exists notification_policy text not null default ''legacy_client'' check(notification_policy in (''auto'',''managed'',''suppressed'',''legacy_client''))',t);
    execute format('alter table public.%I add column if not exists notification_group_id uuid',t);
    execute format('alter table public.%I add column if not exists unlock_at timestamptz',t);
  end loop;
end $$;
alter table public.practice_test_assignments alter column notification_policy set default 'auto';
alter table public.classroom_items drop constraint if exists classroom_items_type_check;
alter table public.classroom_items add constraint classroom_items_type_check check(type=any(array[
 'drill','homework','bootcamp_module','note','session_recap','announcement','upload_summary','weekly_plan_task','smartboard_recap','activity','practice_test','link'
]));

create table if not exists public.student_work_receipts (
  student_id uuid not null references auth.users(id),
  source_table text not null,
  source_id uuid not null,
  issuance integer not null check(issuance>0),
  first_opened_at timestamptz not null,
  last_opened_at timestamptz not null,
  read_at timestamptz not null,
  primary key(student_id,source_table,source_id,issuance)
);
create table if not exists public.assignment_notification_groups (
  id uuid primary key,
  student_id uuid not null references auth.users(id),
  kind text not null default 'assignments' check(kind in ('assignments','plan_publication')),
  title text not null default 'New assignments',
  message text,
  link text not null default '/my-work/to-do',
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  collection_opened_at timestamptz
);
create table if not exists public.assignment_delivery_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  source_table text not null,
  source_id uuid not null,
  issuance integer not null check(issuance>0),
  policy text not null check(policy in ('auto','managed')),
  group_id uuid references public.assignment_notification_groups(id),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  cancelled_at timestamptz,
  unique(student_id,source_table,source_id,issuance)
);
-- A cohort gets one durable notification identity. Different unlock instants
-- deliberately get separate deliveries, without leaking future members.
create table if not exists public.assignment_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.assignment_notification_groups(id),
  event_id uuid references public.assignment_delivery_events(id),
  cohort_key text not null,
  student_id uuid not null references auth.users(id),
  delivered_at timestamptz not null default now(),
  unique(cohort_key)
);
alter table public.notifications add column if not exists assignment_event_id uuid;
alter table public.notifications add column if not exists assignment_group_id uuid;
alter table public.notifications add column if not exists assignment_delivery_id uuid;
alter table public.notifications add column if not exists assignment_superseded_at timestamptz;
alter table public.notifications add column if not exists assignment_superseded_by_issuance integer;
create unique index if not exists notifications_assignment_delivery_unique on public.notifications(assignment_delivery_id) where assignment_delivery_id is not null;
drop index if exists public.notifications_unique_unread_assignment;

create table if not exists public.assignment_notification_legacy_links (
  notification_id uuid primary key references public.notifications(id) on delete cascade,
  student_id uuid not null,
  source_table text not null,
  source_id uuid not null,
  issuance integer not null
);
do $$ declare t text; begin
  foreach t in array array['student_work_receipts','assignment_notification_groups','assignment_delivery_events','assignment_notification_deliveries','assignment_notification_legacy_links'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('drop policy if exists %I on public.%I',t||'_owner_read',t);
    execute format('create policy %I on public.%I for select to authenticated using(student_id=auth.uid())',t||'_owner_read',t);
  end loop;
end $$;

create or replace function public.student_work_native_table(p_table text)
returns boolean language sql immutable set search_path=public as $$
  select p_table=any(array['homework_assignments','ta_assignments','guided_drill_assignments','activity_assignments','practice_test_assignments'])
$$;

-- All optional publication fields are read from jsonb so existing source
-- schemas retain their own status/progress contract.
create or replace function public.student_work_row_active(p_row jsonb)
returns boolean language sql stable set search_path=public as $$
 select coalesce(p_row->>'status','assigned') not in ('archived','draft','revoked','hidden','cancelled','inactive','abandoned')
   and coalesce((p_row->>'visible_to_student')::boolean,true)
   and coalesce(p_row->'metadata_json'->>'publication_status','published') not in ('draft','hidden','archived','revoked')
   and coalesce(p_row->'metadata_json'->>'visibility','visible') not in ('hidden','private','draft')
$$;

create or replace function public.student_work_native_row(p_table text,p_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r jsonb;
begin
 if p_table is null or p_id is null then return null;end if;
 if not public.student_work_native_table(p_table) and p_table<>'classroom_items' then return null; end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1',p_table) into r using p_id;
 return r;
end $$;

-- Resolve only supported native aliases, never title/substrings. An unknown
-- external source (Reading Center, bootcamp) remains a standalone item.
create or replace function public.student_work_mirror_identity(p_item jsonb)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare t text:=p_item->>'source_table'; raw_id text:=p_item->>'source_id'; r jsonb;
begin
 if public.student_work_native_table(t) then
   if raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
     r:=public.student_work_native_row(t,raw_id::uuid);
   elsif t='practice_test_assignments' and raw_id ~ '^practice_test:[0-9]+$' then
     select to_jsonb(a) into r from public.practice_test_assignments a
      where a.student_id=(p_item->>'student_id')::uuid and a.pt=split_part(raw_id,':',2)::integer;
   end if;
   if r is not null and r->>'student_id'=p_item->>'student_id' then
     return jsonb_build_object('source_table',t,'source_id',r->>'id','issuance',(r->>'issuance')::integer);
   end if;
   -- Dangling native mirrors cannot turn into standalone deliverables.
   return null;
 end if;
 return jsonb_build_object('source_table','classroom_items','source_id',p_item->>'id','issuance',(p_item->>'issuance')::integer);
end $$;

create or replace function public.student_work_assigned_route(p_item jsonb)
returns text language sql immutable set search_path=public as $$
 select coalesce(nullif(p_item->'metadata_json'->>'assigned_route',''),case
  when p_item->>'source_table'='bootcamps' and p_item->>'source_id' ~ '^/(bootcamp/[a-zA-Z0-9/_-]+|conditional-indicators-refresher|quick-drills/unless-drill|topics/abstract)(\?[^#]*)?(#.*)?$'
  then p_item->>'source_id' end)
$$;

create or replace function public.student_work_state(p_table text,p_id uuid,p_student uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r jsonb; m jsonb; ident jsonb; chosen jsonb; unlock_time timestamptz; route text; title text; active boolean;
begin
 r:=public.student_work_native_row(p_table,p_id);
 if r is null or r->>'student_id' is distinct from p_student::text then return null; end if;
 if p_table='classroom_items' then
   ident:=public.student_work_mirror_identity(r);
   if ident is null then return null; end if;
   if ident->>'source_table'<>'classroom_items' then
     return public.student_work_state(ident->>'source_table',(ident->>'source_id')::uuid,p_student);
   end if;
   chosen:=r;
 else
   -- Newest stable mirror controls source publication, including a hidden or
   -- locked mirror. Do not fall through to an older visible mirror.
   for m in select to_jsonb(c) from public.classroom_items c where c.student_id=p_student
      and c.source_table=p_table order by c.created_at desc,c.id desc loop
     ident:=public.student_work_mirror_identity(m);
     if ident->>'source_id'=p_id::text then chosen:=m; exit; end if;
   end loop;
 end if;
 active:=public.student_work_row_active(r) and (chosen is null or public.student_work_row_active(chosen));
 unlock_time:=greatest(nullif(r->>'unlock_at','')::timestamptz,nullif(chosen->>'unlock_at','')::timestamptz);
 title:=coalesce(chosen->>'title',r->>'title',r->>'set_title',case when p_table='practice_test_assignments' then 'PrepTest '||(r->>'pt') else 'New assignment' end);
 route:=coalesce(public.student_work_assigned_route(chosen),public.student_work_assigned_route(r),case p_table
   when 'classroom_items' then '/classroom/item/'||p_id::text
   when 'ta_assignments' then '/classroom/ta/'||p_id::text
   when 'homework_assignments' then '/classroom/'||p_id::text
   when 'guided_drill_assignments' then '/guided/'||p_id::text
   when 'activity_assignments' then '/activities/'||p_id::text
   when 'practice_test_assignments' then '/testing?pt='||(r->>'pt') end);
 return jsonb_build_object('source_table',p_table,'source_id',p_id,'student_id',p_student,
  'issuance',(r->>'issuance')::integer,'active',active,'available',active and (unlock_time is null or unlock_time<=now()),
  'unlock_at',unlock_time,'title',title,'link',route,'policy',r->>'notification_policy','group_id',r->>'notification_group_id');
end $$;

create or replace function public.get_student_work_access()
returns table(source_table text,source_id uuid,issuance integer,available boolean)
language plpgsql stable security definer set search_path=public as $$
declare t text; r record; s jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to read assigned work' using errcode='42501'; end if;
 foreach t in array array['homework_assignments','ta_assignments','guided_drill_assignments','activity_assignments','practice_test_assignments','classroom_items'] loop
   for r in execute format('select id from public.%I where student_id=$1',t) using auth.uid() loop
     s:=public.student_work_state(t,r.id,auth.uid());
     if s is not null then
       source_table:=s->>'source_table';source_id:=(s->>'source_id')::uuid;issuance:=(s->>'issuance')::integer;available:=(s->>'available')::boolean;return next;
     end if;
   end loop;
 end loop;
end $$;

create or replace function public.guard_student_work_identity()
returns trigger language plpgsql security definer set search_path=public as $$
declare oldj jsonb; newj jsonb:=to_jsonb(new); source jsonb; ident jsonb; is_admin boolean:=auth.uid() is null or public.has_role(auth.uid(),'admin'); reissue boolean:=false; enabled boolean; k text;
begin
 select c.enabled into enabled from public.assignment_delivery_control c where singleton;
 if tg_op='UPDATE' then
   oldj:=to_jsonb(old);
   reissue:=not public.student_work_row_active(oldj) and public.student_work_row_active(newj);
   -- The unchanged deployed edge upsert supplies NULL for an omitted unlock.
   -- An active auto/legacy replay must not silently unschedule future work.
   -- Explicit managed/suppressed teacher writers and genuine reissuance retain
   -- their ordinary schedule mutation semantics.
   if tg_table_name='practice_test_assignments' and not reissue and public.student_work_row_active(oldj)
     and new.notification_policy in ('auto','legacy_client') and new.unlock_at is null and old.unlock_at>now() then
     new.unlock_at:=old.unlock_at;
   end if;
   if not is_admin and (new.issuance is distinct from old.issuance
     or newj->'student_id' is distinct from oldj->'student_id'
     or newj->'unlock_at' is distinct from oldj->'unlock_at'
     or new.notification_policy is distinct from old.notification_policy or new.notification_group_id is distinct from old.notification_group_id
     or reissue) then
     raise exception 'Assignment delivery identity and publication are teacher-controlled' using errcode='42501';
   end if;
   if not is_admin then
     foreach k in array array['notification_policy','notification_group_id','issuance','assignment_event_id','assignment_group_id','publication_status','visibility','assigned_route'] loop
       if newj->'metadata_json'->k is distinct from oldj->'metadata_json'->k then
         raise exception 'Assignment delivery metadata is teacher-controlled' using errcode='42501';
       end if;
     end loop;
   end if;
   -- Never accept a caller-supplied generation, even from a teacher.
   new.issuance:=old.issuance + case when is_admin and (reissue or (pg_trigger_depth()>1 and new.issuance=old.issuance+1)) then 1 else 0 end;
   if tg_table_name='practice_test_assignments' and reissue and is_admin and new.notification_policy='legacy_client' then
     new.notification_policy:='auto';
   end if;
 else
   new.issuance:=1;
 end if;
 if tg_table_name='classroom_items' then
   ident:=public.student_work_mirror_identity(to_jsonb(new));
   if ident is not null and ident->>'source_table'<>'classroom_items' then
     if tg_op='UPDATE' and reissue and is_admin and (ident->>'issuance')::integer=old.issuance then
       if enabled and new.notification_policy='legacy_client' and ident->>'source_table'<>'practice_test_assignments' then
         raise exception 'Refresh LSAT U before assigning new work. This tab uses an older assignment writer.';
       end if;
       execute format('update public.%I set issuance=issuance+1,notification_policy=$3,notification_group_id=$4 where id=$1 and student_id=$2',ident->>'source_table')
         using (ident->>'source_id')::uuid,new.student_id,
         case when new.notification_policy='legacy_client' and ident->>'source_table'='practice_test_assignments' then 'auto' else new.notification_policy end,new.notification_group_id;
     end if;
     source:=public.student_work_native_row(ident->>'source_table',(ident->>'source_id')::uuid);
     new.issuance:=(source->>'issuance')::integer;
     new.notification_policy:=source->>'notification_policy';
     new.notification_group_id:=(source->>'notification_group_id')::uuid;
     return new; -- Existing PT edge mirror retries are harmless.
   end if;
   if new.type not in ('note','homework','drill','activity','bootcamp_module','practice_test','link','weekly_plan_task') then
     new.notification_policy:='suppressed';
   end if;
 end if;
 if enabled and (tg_op='INSERT' or reissue) and new.notification_policy='legacy_client' then
   raise exception 'Refresh LSAT U before assigning new work. This tab uses an older assignment writer.' using errcode='P0001';
 end if;
 if new.notification_policy='managed' and new.notification_group_id is null then
   raise exception 'Managed assignments require notification_group_id' using errcode='22023';
 end if;
 return new;
end $$;

create or replace function public.retire_superseded_student_work_alerts(p_student uuid,p_table text,p_id uuid,p_issuance integer)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.notifications n set read=true,assignment_superseded_at=coalesce(n.assignment_superseded_at,now()),assignment_superseded_by_issuance=p_issuance
 where n.user_id=p_student and n.type in ('assignment','message') and not n.read
 and (
  exists(select 1 from public.assignment_delivery_events old_event where old_event.id=n.assignment_event_id and old_event.student_id=p_student
   and old_event.source_table=p_table and old_event.source_id=p_id and old_event.issuance<p_issuance)
  or exists(select 1 from public.assignment_notification_legacy_links old_link where old_link.notification_id=n.id and old_link.student_id=p_student
   and old_link.source_table=p_table and old_link.source_id=p_id and old_link.issuance<p_issuance)
  or (n.assignment_group_id is not null and exists(select 1 from public.assignment_delivery_events old_member where old_member.group_id=n.assignment_group_id
   and old_member.student_id=p_student and old_member.source_table=p_table and old_member.source_id=p_id and old_member.issuance<p_issuance))
 )
 and (n.assignment_group_id is null or not exists(
   select 1 from public.assignment_delivery_events member
   where member.group_id=n.assignment_group_id and member.student_id=p_student and member.delivered_at is not null and member.cancelled_at is null
   and (public.student_work_state(member.source_table,member.source_id,p_student)->>'issuance')::integer=member.issuance
   and coalesce((public.student_work_state(member.source_table,member.source_id,p_student)->>'available')::boolean,false)
   and not exists(select 1 from public.student_work_receipts r where r.student_id=p_student and r.source_table=member.source_table and r.source_id=member.source_id and r.issuance=member.issuance)
 ));
end $$;

create or replace function public.queue_student_work_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare s jsonb; ident jsonb; owner uuid; group_owner uuid; group_key uuid;
begin
 if tg_op='DELETE' then
   update public.assignment_delivery_events set cancelled_at=coalesce(cancelled_at,now())
     where source_table=tg_table_name and source_id=old.id and delivered_at is null;
   return old;
 end if;
 if tg_table_name<>'classroom_items' and tg_op='UPDATE' and new.issuance<>old.issuance then
   perform public.retire_superseded_student_work_alerts(new.student_id,tg_table_name,new.id,new.issuance);
   update public.classroom_items c set issuance=new.issuance,notification_policy=new.notification_policy,notification_group_id=new.notification_group_id
   where c.student_id=new.student_id and c.source_table=tg_table_name and public.student_work_row_active(to_jsonb(c))
   and (public.student_work_mirror_identity(to_jsonb(c))->>'source_id')=new.id::text;
 end if;
 if tg_table_name='classroom_items' then
   ident:=public.student_work_mirror_identity(to_jsonb(new));
   if ident is null then return new; end if;
   s:=public.student_work_state(ident->>'source_table',(ident->>'source_id')::uuid,new.student_id);
 else s:=public.student_work_state(tg_table_name,new.id,new.student_id); end if;
 if s is null then return new; end if;
 if tg_table_name='classroom_items' and tg_op='UPDATE' and new.issuance<>old.issuance and s->>'source_table'='classroom_items' then
   perform public.retire_superseded_student_work_alerts(new.student_id,'classroom_items',new.id,new.issuance);
 end if;
 -- Existing legacy/quiet rows never acquire historical events on progress.
 if s->>'policy' not in ('auto','managed') then return new; end if;
 if tg_op='UPDATE' and old.issuance=new.issuance then return new; end if;
 if not (s->>'active')::boolean then return new; end if;
 owner:=(s->>'student_id')::uuid;group_key:=(s->>'group_id')::uuid;
 if group_key is not null then
   insert into public.assignment_notification_groups(id,student_id) values(group_key,owner) on conflict do nothing;
   select student_id into group_owner from public.assignment_notification_groups where id=group_key;
   if group_owner<>owner then raise exception 'An assignment group belongs to one student' using errcode='22023'; end if;
 end if;
 insert into public.assignment_delivery_events(student_id,source_table,source_id,issuance,policy,group_id)
 values(owner,s->>'source_table',(s->>'source_id')::uuid,(s->>'issuance')::integer,s->>'policy',group_key)
 on conflict(student_id,source_table,source_id,issuance) do nothing;
 return new;
end $$;

do $$ declare t text; begin
 foreach t in array array['homework_assignments','ta_assignments','guided_drill_assignments','activity_assignments','practice_test_assignments','classroom_items'] loop
   execute format('drop trigger if exists a_student_work_identity on public.%I',t);
   execute format('drop trigger if exists z_student_work_event on public.%I',t);
   execute format('create trigger a_student_work_identity before insert or update on public.%I for each row execute function public.guard_student_work_identity()',t);
   execute format('create trigger z_student_work_event after insert or update or delete on public.%I for each row execute function public.queue_student_work_event()',t);
 end loop;
end $$;

create or replace function public.guard_assignment_notification_identity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not public.has_role(auth.uid(),'admin') and
   (new.assignment_event_id is distinct from old.assignment_event_id or new.assignment_group_id is distinct from old.assignment_group_id
    or new.assignment_delivery_id is distinct from old.assignment_delivery_id
    or new.assignment_superseded_at is distinct from old.assignment_superseded_at
    or new.assignment_superseded_by_issuance is distinct from old.assignment_superseded_by_issuance) then
   raise exception 'Notification assignment identity is immutable' using errcode='42501';
 end if;
 return new;
end $$;
drop trigger if exists notifications_assignment_identity_guard on public.notifications;
create trigger notifications_assignment_identity_guard before update on public.notifications
for each row execute function public.guard_assignment_notification_identity();

create or replace function public.assignment_notification_group_link(p_link text,p_group uuid)
returns text language plpgsql immutable set search_path=public as $$
declare route text:=split_part(p_link,'#',1);fragment text:=case when position('#' in p_link)>0 then substring(p_link from position('#' in p_link)) else '' end;
begin
 route:=regexp_replace(route,'([?&])workGroup=[^&]*','\1','g');
 route:=regexp_replace(replace(route,'?&','?'),'&{2,}','&','g');
 route:=rtrim(route,'?&');
 if p_group is not null then route:=route||case when position('?' in route)>0 then '&' else '?' end||'workGroup='||p_group::text;end if;
 return route||fragment;
end $$;

create or replace function public.release_assignment_notifications(p_limit integer default 100)
returns integer language plpgsql security definer set search_path=public as $$
declare e record; s jsonb; g public.assignment_notification_groups%rowtype; delivery uuid; cohort text; delivered integer:=0; route text; single_member boolean;
begin
 if not exists(select 1 from public.assignment_delivery_control where singleton and enabled) then return 0; end if;
 for g in select ng.* from public.assignment_notification_groups ng where ng.kind='plan_publication' and ng.finalized_at is not null
   and not exists(select 1 from public.assignment_notification_deliveries d where d.cohort_key='plan:'||ng.id::text)
   order by ng.created_at,ng.id for update skip locked limit least(greatest(p_limit,1),500) loop
   insert into public.assignment_notification_deliveries(group_id,cohort_key,student_id)
   values(g.id,'plan:'||g.id::text,g.student_id) on conflict(cohort_key) do nothing returning id into delivery;
   if delivery is not null then
     insert into public.notifications(user_id,type,title,body,link,assignment_group_id,assignment_delivery_id)
     values(g.student_id,'assignment','Your plan is ready','Your assigned plan is available in My Work.',
       public.assignment_notification_group_link(g.link,g.id),g.id,delivery);
     delivered:=delivered+1;
   end if;
 end loop;
 for e in select ev.* from public.assignment_delivery_events ev where ev.delivered_at is null and ev.cancelled_at is null
   and coalesce((public.student_work_state(ev.source_table,ev.source_id,ev.student_id)->>'available')::boolean,false)
   and (ev.group_id is null or exists(select 1 from public.assignment_notification_groups ng where ng.id=ev.group_id and ng.kind='assignments'
     and (ng.finalized_at is not null or (ev.policy='managed' and ev.created_at<=now()-interval '10 minutes'))))
   and (ev.policy<>'managed' or ev.group_id is not null or ev.created_at<=now()-interval '10 minutes')
   order by ev.created_at,ev.id for update skip locked limit least(greatest(p_limit,1),500) loop
   -- Lock the actual current owner/publication/unlock row before release.
   if not public.student_work_native_table(e.source_table) and e.source_table<>'classroom_items' then continue; end if;
   execute format('select 1 from public.%I where id=$1 and student_id=$2 for update',e.source_table) using e.source_id,e.student_id;
   perform 1 from public.classroom_items where student_id=e.student_id and source_table=e.source_table for update;
   s:=public.student_work_state(e.source_table,e.source_id,e.student_id);
   if s is null or (s->>'issuance')::integer<>e.issuance then
     update public.assignment_delivery_events set cancelled_at=now() where id=e.id;continue;
   end if;
   if not (s->>'available')::boolean or s->>'policy'='suppressed' then continue; end if;
   if e.group_id is not null then
     select * into g from public.assignment_notification_groups where id=e.group_id for update;
     if g.kind='plan_publication' then continue; end if;
     if g.finalized_at is null and (e.policy<>'managed' or e.created_at>now()-interval '10 minutes') then continue; end if;
     select 'group:'||e.group_id::text||':members:'||md5(string_agg(member.id::text,',' order by member.id))||':unlock:'||coalesce(s->>'unlock_at','immediate')
     into cohort from public.assignment_delivery_events member where member.group_id=e.group_id and member.cancelled_at is null
       and (public.student_work_state(member.source_table,member.source_id,member.student_id)->>'issuance')::integer=member.issuance;
     select count(*)=1 into single_member from public.assignment_delivery_events member
       where member.group_id=e.group_id and member.cancelled_at is null
       and (public.student_work_state(member.source_table,member.source_id,member.student_id)->>'issuance')::integer=member.issuance;
     route:=case when single_member then public.assignment_notification_group_link(s->>'link',null) else public.assignment_notification_group_link(g.link,e.group_id) end;
   else
     if e.policy='managed' and e.created_at>now()-interval '10 minutes' then continue; end if;
     cohort:='event:'||e.id::text;route:=s->>'link';single_member:=true;
   end if;
   insert into public.assignment_notification_deliveries(group_id,event_id,cohort_key,student_id)
   values(e.group_id,case when single_member then e.id end,cohort,e.student_id)
   on conflict(cohort_key) do nothing returning id into delivery;
   if delivery is not null then
     insert into public.notifications(user_id,type,title,body,link,assignment_event_id,assignment_group_id,assignment_delivery_id)
     values(e.student_id,'assignment',case when e.group_id is null then 'New assignment: '||(s->>'title') when exists(
         select 1 from public.assignment_delivery_events future where future.group_id=e.group_id and future.cancelled_at is null
         and not coalesce((public.student_work_state(future.source_table,future.source_id,future.student_id)->>'available')::boolean,false)
       ) then 'New assignments' else g.title end,
       case when e.group_id is null then null when exists(
         select 1 from public.assignment_delivery_events future where future.group_id=e.group_id and future.cancelled_at is null
         and not coalesce((public.student_work_state(future.source_table,future.source_id,future.student_id)->>'available')::boolean,false)
       ) then 'New work is available in My Work.' else g.message end,route,
       case when single_member then e.id end,e.group_id,delivery);
     delivered:=delivered+1;
   end if;
   update public.assignment_delivery_events set delivered_at=now() where id=e.id;
 end loop;
 return delivered;
end $$;

create or replace function public.finalize_assignment_notification_group(
 p_group_id uuid,p_title text default 'New assignments',p_message text default null,p_link text default '/my-work/to-do')
returns jsonb language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Only administrators finalize assignment groups' using errcode='42501'; end if;
 if p_link !~ '^/[^/]' then raise exception 'An internal destination is required'; end if;
 update public.assignment_notification_groups set finalized_at=coalesce(finalized_at,now()),title=coalesce(nullif(trim(p_title),''),'New assignments'),
   message=p_message,link=p_link where id=p_group_id and kind='assignments';
 if not found then return jsonb_build_object('group_id',p_group_id,'event_count',0,'delivered_count',0,'pending_count',0); end if;
 n:=public.release_assignment_notifications(500);
 return (select jsonb_build_object('group_id',p_group_id,'event_count',count(*),'delivered_count',count(*) filter(where delivered_at is not null),
   'pending_count',count(*) filter(where delivered_at is null and cancelled_at is null)) from public.assignment_delivery_events where group_id=p_group_id);
end $$;

create or replace function public.publish_assignment_plan_notification(p_group_id uuid,p_student_id uuid,p_link text default '/my-work/to-do')
returns jsonb language plpgsql security definer set search_path=public as $$
declare delivery uuid; g public.assignment_notification_groups%rowtype;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Only administrators publish plans' using errcode='42501'; end if;
 if p_link !~ '^/[^/]' then raise exception 'An internal destination is required'; end if;
 insert into public.assignment_notification_groups(id,student_id,kind,title,message,link,finalized_at)
 values(p_group_id,p_student_id,'plan_publication','Your plan is ready','Your assigned plan is available in My Work.',p_link,now()) on conflict do nothing;
 select * into g from public.assignment_notification_groups where id=p_group_id for update;
 if g.student_id<>p_student_id or g.kind<>'plan_publication' then raise exception 'Plan group identity does not match'; end if;
 if not exists(select 1 from public.assignment_delivery_control where singleton and enabled) then return jsonb_build_object('group_id',p_group_id,'delivered',false); end if;
 insert into public.assignment_notification_deliveries(group_id,cohort_key,student_id)
 values(p_group_id,'plan:'||p_group_id::text,p_student_id) on conflict(cohort_key) do nothing returning id into delivery;
 if delivery is not null then
   insert into public.notifications(user_id,type,title,body,link,assignment_group_id,assignment_delivery_id)
   values(p_student_id,'assignment',g.title,g.message,public.assignment_notification_group_link(g.link,p_group_id),p_group_id,delivery);
 end if;
 return jsonb_build_object('group_id',p_group_id,'delivered',true);
end $$;

create or replace function public.get_student_work_receipts()
returns table(source_table text,source_id uuid,issuance integer,first_opened_at timestamptz,last_opened_at timestamptz,read_at timestamptz)
language sql stable security definer set search_path=public as $$
 select r.source_table,r.source_id,r.issuance,r.first_opened_at,r.last_opened_at,r.read_at from public.student_work_receipts r where r.student_id=auth.uid()
$$;

create or replace function public.acknowledge_student_work(p_source_table text,p_source_id uuid,p_issuance integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();s jsonb;r public.student_work_receipts%rowtype; stamp timestamptz:=now();
begin
 if actor is null or public.has_role(actor,'admin') then raise exception 'Only the assigned student may acknowledge work' using errcode='42501'; end if;
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
 update public.notifications n set read=true where n.user_id=actor and not n.read and n.assignment_group_id is not null and
   not exists(select 1 from public.assignment_delivery_events e where e.group_id=n.assignment_group_id and e.delivered_at is not null and e.cancelled_at is null
    and (public.student_work_state(e.source_table,e.source_id,actor)->>'issuance')::integer=e.issuance
    and coalesce((public.student_work_state(e.source_table,e.source_id,actor)->>'available')::boolean,false)
    and not exists(select 1 from public.student_work_receipts rr where rr.student_id=actor and rr.source_table=e.source_table and rr.source_id=e.source_id and rr.issuance=e.issuance));
 return to_jsonb(r)-'student_id'||jsonb_build_object('acknowledged',true);
end $$;

create or replace function public.acknowledge_assignment_notification_group(p_group_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in to open assigned work' using errcode='42501'; end if;
 update public.assignment_notification_groups set collection_opened_at=coalesce(collection_opened_at,now()) where id=p_group_id and student_id=auth.uid()
 and exists(select 1 from public.notifications n where n.assignment_group_id=p_group_id and n.user_id=auth.uid());
 if not found then raise exception 'Assignment group is unavailable' using errcode='42501'; end if;
 update public.notifications set read=true where assignment_group_id=p_group_id and user_id=auth.uid() and not read;
 return true;
end $$;

create or replace function public.get_assignment_notification_group_items(p_group_id uuid)
returns table(source_table text,source_id uuid,issuance integer,title text,link text,read_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare e record;s jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.assignment_notification_groups g where g.id=p_group_id and g.student_id=auth.uid()
   and exists(select 1 from public.notifications n where n.assignment_group_id=g.id and n.user_id=auth.uid())) then
  raise exception 'Assignment group is unavailable' using errcode='42501';
 end if;
 for e in select ev.* from public.assignment_delivery_events ev where ev.group_id=p_group_id and ev.student_id=auth.uid()
   and ev.delivered_at is not null and ev.cancelled_at is null order by ev.created_at,ev.id loop
  s:=public.student_work_state(e.source_table,e.source_id,auth.uid());
  if s is not null and (s->>'available')::boolean and (s->>'issuance')::integer=e.issuance then
   source_table:=e.source_table;source_id:=e.source_id;issuance:=e.issuance;title:=s->>'title';link:=s->>'link';
   select r.read_at into read_at from public.student_work_receipts r where r.student_id=auth.uid() and r.source_table=e.source_table and r.source_id=e.source_id and r.issuance=e.issuance;
   return next;
  end if;
 end loop;
end $$;

create or replace function public.get_assignment_notification_links()
returns table(notification_id uuid,source_table text,source_id uuid,issuance integer,group_id uuid)
language sql stable security definer set search_path=public as $$
 select n.id,s.state->>'source_table',(s.state->>'source_id')::uuid,(s.state->>'issuance')::integer,n.assignment_group_id
 from public.notifications n left join public.assignment_delivery_events e on e.id=n.assignment_event_id and e.student_id=n.user_id
 left join public.assignment_notification_legacy_links l on l.notification_id=n.id and l.student_id=n.user_id
 left join lateral (select public.student_work_state(coalesce(e.source_table,l.source_table),coalesce(e.source_id,l.source_id),n.user_id) state) s on true
 where n.user_id=auth.uid() and (e.id is not null or l.notification_id is not null or n.assignment_group_id is not null)
$$;

create or replace function public.student_work_evidence_timestamp(p_text text)
returns timestamptz language plpgsql stable set search_path=public as $$
begin
 if p_text !~ '^\d{4}-\d{2}-\d{2}($|T| )' then return null; end if;
 return p_text::timestamptz;
exception when invalid_datetime_format or datetime_field_overflow then return null;
end $$;

-- Silent backfill. Existing read flags and progress/completion are untouched.
do $$ declare t text;r jsonb;stamp timestamptz;begin
 foreach t in array array['homework_assignments','ta_assignments','guided_drill_assignments','activity_assignments','practice_test_assignments'] loop
  for r in execute format('select to_jsonb(a) from public.%I a',t) loop
   stamp:=least(public.student_work_evidence_timestamp(r->>'viewed_at'),public.student_work_evidence_timestamp(r->>'read_card_at'),
    public.student_work_evidence_timestamp(r->>'started_at'),public.student_work_evidence_timestamp(r->>'completed_at'));
   if stamp is not null and (r->>'issuance')::integer=1 then
    insert into public.student_work_receipts(student_id,source_table,source_id,issuance,first_opened_at,last_opened_at,read_at)
    values((r->>'student_id')::uuid,t,(r->>'id')::uuid,(r->>'issuance')::integer,stamp,stamp,stamp) on conflict do nothing;
   end if;
  end loop;
 end loop;
end $$;
insert into public.student_work_receipts(student_id,source_table,source_id,issuance,first_opened_at,last_opened_at,read_at)
select c.student_id,'classroom_items',c.id,c.issuance,public.student_work_evidence_timestamp(c.metadata_json->>'read_at'),public.student_work_evidence_timestamp(c.metadata_json->>'read_at'),public.student_work_evidence_timestamp(c.metadata_json->>'read_at')
from public.classroom_items c where c.issuance=1 and c.type in ('note','session_recap','smartboard_recap','announcement') and public.student_work_evidence_timestamp(c.metadata_json->>'read_at') is not null
on conflict do nothing;

create or replace function public.map_student_work_notification_link(p_notification_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare n record;path text;t text;ident uuid;s jsonb;ci jsonb;uuid_pattern text:='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
begin
 select id,user_id,link into n from public.notifications where id=p_notification_id and type in ('assignment','message')
 and assignment_delivery_id is null and assignment_event_id is null and assignment_group_id is null;
 if not found then return;end if;
  path:=split_part(split_part(n.link,'?',1),'#',1);t:=null;ident:=null;
  if path ~* ('^/classroom/(ta|guided|activity)/'||uuid_pattern||'$') then
   t:=case split_part(path,'/',3) when 'ta' then 'ta_assignments' when 'guided' then 'guided_drill_assignments' else 'activity_assignments' end;
   ident:=split_part(path,'/',4)::uuid;
  elsif path ~* ('^/(activities|guided)/'||uuid_pattern||'$') then
   t:=case split_part(path,'/',2) when 'activities' then 'activity_assignments' else 'guided_drill_assignments' end;
   ident:=split_part(path,'/',3)::uuid;
  elsif path ~* ('^/classroom/item/'||uuid_pattern||'$') then t:='classroom_items';ident:=split_part(path,'/',4)::uuid;
  elsif path ~* ('^/classroom/'||uuid_pattern||'$') then t:='homework_assignments';ident:=split_part(path,'/',3)::uuid;
  elsif path='/reading-center' and (select count(*)=1 from public.classroom_items c where c.student_id=n.user_id
    and split_part(split_part(public.student_work_assigned_route(to_jsonb(c)),'?',1),'#',1)=path) then
    select to_jsonb(c) into ci from public.classroom_items c where c.student_id=n.user_id
    and split_part(split_part(public.student_work_assigned_route(to_jsonb(c)),'?',1),'#',1)=path
    order by c.created_at desc,c.id desc limit 1;
    if ci is not null then t:='classroom_items';ident:=(ci->>'id')::uuid;end if;
  elsif (path ~ '^/(classroom/)?bootcamp/[a-zA-Z0-9/_-]+$'
    or path in ('/conditional-indicators-refresher','/quick-drills/unless-drill','/topics/abstract')) and (
    -- Bootcamp query parameters may select a different module/target. Keep
    -- those parameters and refuse ambiguous editions/instructions entirely.
    select count(distinct jsonb_build_object('type',c.type,'title',c.title,'description',c.description,
      'content_html',c.content_html,'content_markdown',c.content_markdown,'source_table',c.source_table,'source_id',c.source_id,
      'metadata',coalesce(c.metadata_json,'{}')-array['read_at','first_opened_at','last_opened_at','progress']))=1
    from public.classroom_items c where c.student_id=n.user_id
    and split_part(public.student_work_assigned_route(to_jsonb(c)),'#',1)=split_part(n.link,'#',1)
  ) then
    select to_jsonb(c) into ci from public.classroom_items c where c.student_id=n.user_id
    and split_part(public.student_work_assigned_route(to_jsonb(c)),'#',1)=split_part(n.link,'#',1)
    order by c.created_at desc,c.id desc limit 1;
    if ci is not null then t:='classroom_items';ident:=(ci->>'id')::uuid;end if;
  end if;
  if t is not null then
   s:=public.student_work_state(t,ident,n.user_id);
   if s is not null then
    insert into public.assignment_notification_legacy_links(notification_id,student_id,source_table,source_id,issuance)
    values(n.id,n.user_id,s->>'source_table',(s->>'source_id')::uuid,(s->>'issuance')::integer) on conflict do nothing;
   end if;
  end if;

end $$;

-- Preserve historical read flags; map only an exact owner-scoped destination.
do $$ declare n record;begin
 for n in select id from public.notifications where type in ('assignment','message') and assignment_delivery_id is null and assignment_event_id is null and assignment_group_id is null loop
  perform public.map_student_work_notification_link(n.id);
 end loop;
end $$;

create or replace function public.map_inserted_student_work_notification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform public.map_student_work_notification_link(new.id);
 return new;
end $$;
drop trigger if exists notifications_map_exact_work on public.notifications;
create trigger notifications_map_exact_work after insert on public.notifications
for each row when(new.type in ('assignment','message')) execute function public.map_inserted_student_work_notification();

-- All internal helpers are inaccessible through PostgREST. SECURITY DEFINER
-- entry points below validate the actual JWT actor; no client-supplied owner.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('student_work_assigned_route','retire_superseded_student_work_alerts','assignment_notification_group_link','map_student_work_notification_link','map_inserted_student_work_notification','student_work_evidence_timestamp','student_work_native_table','student_work_row_active','student_work_native_row','student_work_mirror_identity','student_work_state','guard_student_work_identity','queue_student_work_event','guard_assignment_notification_identity','release_assignment_notifications',
 'get_student_work_access','get_student_work_receipts','acknowledge_student_work','acknowledge_assignment_notification_group','get_assignment_notification_group_items','get_assignment_notification_links','finalize_assignment_notification_group','publish_assignment_plan_notification') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
grant execute on function public.get_student_work_access(),public.get_student_work_receipts(),public.acknowledge_student_work(text,uuid,integer),public.acknowledge_assignment_notification_group(uuid),public.get_assignment_notification_group_items(uuid),public.get_assignment_notification_links(),public.finalize_assignment_notification_group(uuid,text,text,text),public.publish_assignment_plan_notification(uuid,uuid,text) to authenticated;

create or replace function public.activate_assignment_delivery(p_verified_frontend_sha text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare job bigint;
begin
 if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then raise exception 'Only administrators activate delivery' using errcode='42501'; end if;
 if p_verified_frontend_sha !~ '^[0-9a-f]{40}$' then raise exception 'Verified full frontend SHA required'; end if;
 update public.assignment_delivery_control set enabled=true,verified_frontend_sha=p_verified_frontend_sha,activated_at=coalesce(activated_at,now()) where singleton;
 if exists(select 1 from pg_extension where extname='pg_cron') then
   execute 'select cron.schedule($1,$2,$3)' into job using 'student-work-delivery-v1','* * * * *','select public.release_assignment_notifications(100)';
 end if;
 perform public.release_assignment_notifications(500);
 return jsonb_build_object('enabled',true,'frontend_sha',p_verified_frontend_sha,'cron_job_id',job);
end $$;
revoke all on function public.activate_assignment_delivery(text) from public,anon,authenticated;
-- Activation is deliberately only callable by the reviewed SQL migration
-- operator/service role, after public bundle readback.
grant execute on function public.activate_assignment_delivery(text),public.release_assignment_notifications(integer) to service_role;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
  select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='student_work_receipts'
 ) then alter publication supabase_realtime add table public.student_work_receipts;end if;
end $$;
commit;

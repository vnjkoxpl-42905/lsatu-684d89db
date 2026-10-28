-- Private teacher work. No authenticated client can write these tables directly.
create table public.teacher_post_session_settings (
 owner_id uuid primary key references auth.users(id), enabled boolean not null default false,
 calendar_id text not null, drive_root_id text, activation_cutoff timestamptz,
 covered_through timestamptz, updated_checkpoint timestamptz, last_success_at timestamptz,
 last_attempt_at timestamptz, last_error text, catching_up boolean not null default false,
 lease_token uuid, lease_until timestamptz
);
create table public.teacher_student_folders (
 owner_id uuid not null references public.teacher_post_session_settings(owner_id),
 student_id uuid not null references auth.users(id) on delete cascade, local_slug text not null,
 folder_id text not null check(folder_id ~ '^[A-Za-z0-9_-]{10,200}$'), aliases text[] not null default '{}',
 primary key(owner_id,student_id), unique(owner_id,local_slug)
);
create table public.teacher_post_session_tasks (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.teacher_post_session_settings(owner_id),
 calendar_id text not null,event_id text not null,revision integer not null default 1,
 student_id uuid references auth.users(id) on delete set null,student_name text,manual_match boolean not null default false,
 source_title text not null,starts_at timestamptz not null,ends_at timestamptz not null,
 source_state text not null check(source_state in ('ended','rescheduled','cancelled','unavailable')),
 match_state text not null check(match_state in ('matched','needs_match')),
 source_updated_at timestamptz not null,source_checked_at timestamptz not null default now(),
 transcript_doc_id text check(transcript_doc_id ~ '^[A-Za-z0-9_-]{10,200}$'),
 transcript_source text check(transcript_source in ('auto','manual')),
 transcript_status text not null default 'waiting' check(transcript_status in ('linked','waiting','needs_review')),
 recap_done boolean not null default false,notes_done boolean not null default false,work_assigned boolean not null default false,
 handled_at timestamptz,unique(owner_id,calendar_id,event_id)
);
create table public.teacher_post_session_events (
 id bigint generated always as identity primary key,task_id uuid not null references public.teacher_post_session_tasks(id),
 owner_id uuid not null,actor_id uuid,action text not null,detail jsonb not null default '{}',created_at timestamptz not null default now()
);
create table public.teacher_worker_tickets (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.teacher_post_session_settings(owner_id),
 worker text not null check(worker='teacher-post-session-sync'),expires_at timestamptz not null,used_at timestamptz
);
-- Deliberately separate from booking worker credentials.
alter table public.teacher_worker_tickets enable row level security;
revoke all on public.teacher_worker_tickets from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['teacher_post_session_settings','teacher_student_folders','teacher_post_session_tasks','teacher_post_session_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 if t <> 'teacher_post_session_settings' then execute format('grant select on public.%I to authenticated',t); end if;
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy owner_admin_read on public.%I for select to authenticated using (owner_id=auth.uid() and public.has_role(auth.uid(),''admin''))',t);
 end loop;
end $$;
grant select(owner_id,enabled,calendar_id,drive_root_id,activation_cutoff,covered_through,updated_checkpoint,last_success_at,last_attempt_at,last_error,catching_up) on public.teacher_post_session_settings to authenticated;
create function public.teacher_post_session_task_json(t public.teacher_post_session_tasks) returns jsonb language sql stable security definer set search_path=public, pg_temp as $$
 select to_jsonb(t) || jsonb_build_object('drive_folder_url',case when f.folder_id is not null then 'https://drive.google.com/drive/folders/'||f.folder_id end,'local_slug',f.local_slug)
 from (select 1) seed left join teacher_student_folders f on f.owner_id=t.owner_id and f.student_id=t.student_id;
$$;
create function public.teacher_post_session_home() returns jsonb language plpgsql security definer set search_path=public, pg_temp as $$
declare s teacher_post_session_settings; result jsonb; begin
 if auth.uid() is null or not has_role(auth.uid(),'admin') then raise exception 'forbidden' using errcode='42501'; end if;
 select * into s from teacher_post_session_settings where owner_id=auth.uid();
 select jsonb_build_object('settings',case when s.owner_id is null then null else jsonb_build_object('enabled',s.enabled,'activation_cutoff',s.activation_cutoff,'last_success_at',s.last_success_at,'last_attempt_at',s.last_attempt_at,'last_error',s.last_error,'catching_up',s.catching_up,'drive_root_url',case when s.drive_root_id is not null then 'https://drive.google.com/drive/folders/'||s.drive_root_id end) end,
 'tasks',coalesce((select jsonb_agg(teacher_post_session_task_json(t) order by t.ends_at,t.id) from teacher_post_session_tasks t where t.owner_id=auth.uid() and t.handled_at is null),'[]'::jsonb),
 'handled',coalesce((select jsonb_agg(teacher_post_session_task_json(t) order by t.handled_at desc,t.id) from teacher_post_session_tasks t where t.owner_id=auth.uid() and t.handled_at is not null),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.teacher_post_session_update(_task_id uuid,_expected_revision integer,_action text,_field text default null,_value boolean default null,_doc_id text default null,_student_id uuid default null) returns jsonb language plpgsql security definer set search_path=public, pg_temp as $$
declare t teacher_post_session_tasks;p profiles;begin
 if auth.uid() is null or not has_role(auth.uid(),'admin') then raise exception 'forbidden' using errcode='42501';end if;
 select * into t from teacher_post_session_tasks where id=_task_id and owner_id=auth.uid() for update;
 if not found then raise exception 'task_not_found';end if;
 if t.revision<>_expected_revision then raise exception 'stale_revision' using errcode='40001';end if;
 if _action='handle' then t.handled_at=now();
 elsif _action='reopen' then t.handled_at=null;
 elsif _action='checklist' and _field in ('recap_done','notes_done','work_assigned') and _value is not null then
 if _field='recap_done' then t.recap_done=_value;elsif _field='notes_done' then t.notes_done=_value;else t.work_assigned=_value;end if;
 elsif _action='attach_transcript' and _doc_id ~ '^[A-Za-z0-9_-]{10,200}$' then t.transcript_doc_id=_doc_id;t.transcript_source='manual';t.transcript_status='linked';
 elsif _action='match_student' then
 select * into p from profiles where class_id=_student_id and archived_at is null;
 if not found or has_role(_student_id,'admin') then raise exception 'invalid_student';end if;
 t.student_id=_student_id;t.student_name=p.display_name;t.match_state='matched';t.manual_match=true;
 else raise exception 'invalid_action';end if;
 update teacher_post_session_tasks set handled_at=t.handled_at,recap_done=t.recap_done,notes_done=t.notes_done,work_assigned=t.work_assigned,transcript_doc_id=t.transcript_doc_id,transcript_source=t.transcript_source,transcript_status=t.transcript_status,student_id=t.student_id,student_name=t.student_name,match_state=t.match_state,manual_match=t.manual_match,revision=revision+1 where id=t.id returning * into t;
 insert into teacher_post_session_events(task_id,owner_id,actor_id,action,detail) values(t.id,t.owner_id,auth.uid(),_action,jsonb_build_object('field',_field,'value',_value,'doc_id',_doc_id,'student_id',_student_id));
 return teacher_post_session_task_json(t);
end $$;
create function public.teacher_worker_consume(_ticket uuid) returns uuid language sql security definer set search_path=public, pg_temp as $$
 update teacher_worker_tickets set used_at=now() where id=_ticket and worker='teacher-post-session-sync' and used_at is null and expires_at>now() and has_role(owner_id,'admin') returning owner_id;
$$;
create function public.teacher_post_session_claim(_owner uuid) returns jsonb language plpgsql security definer set search_path=public, pg_temp as $$
declare s teacher_post_session_settings;begin
 update teacher_post_session_settings set lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes' where owner_id=_owner and has_role(_owner,'admin') and enabled and activation_cutoff is not null and (lease_until is null or lease_until<=now()) returning * into s;
 if not found then return null;end if;return to_jsonb(s);end $$;
create function public.teacher_post_session_renew(_owner uuid,_lease uuid) returns void language plpgsql security definer set search_path=public, pg_temp as $$ begin
 update teacher_post_session_settings set lease_until=now()+interval '2 minutes' where owner_id=_owner and lease_token=_lease and lease_until>now() and has_role(_owner,'admin') and enabled;
 if not found then raise exception 'lease_lost';end if;end $$;
create function public.teacher_post_session_source(_owner uuid,_lease uuid,_event text,_source jsonb) returns void language plpgsql security definer set search_path=public, pg_temp as $$
declare s teacher_post_session_settings;t teacher_post_session_tasks;begin
 select * into s from teacher_post_session_settings where owner_id=_owner and lease_token=_lease and lease_until>now() and has_role(_owner,'admin') and enabled for update;
 if not found then raise exception 'lease_lost';end if;
 select * into t from teacher_post_session_tasks where owner_id=_owner and calendar_id=s.calendar_id and event_id=_event for update;
 if t.id is null then
 if _source->>'source_state'<>'ended' or (_source->>'ends_at')::timestamptz<s.activation_cutoff or (_source->>'ends_at')::timestamptz>now() then return;end if;
 insert into teacher_post_session_tasks(owner_id,calendar_id,event_id,source_title,starts_at,ends_at,source_state,source_updated_at,student_id,student_name,match_state,transcript_doc_id,transcript_source,transcript_status)
 values(_owner,s.calendar_id,_event,_source->>'source_title',(_source->>'starts_at')::timestamptz,(_source->>'ends_at')::timestamptz,'ended',(_source->>'source_updated_at')::timestamptz,(_source->>'student_id')::uuid,_source->>'student_name',_source->>'match_state',_source->>'transcript_doc_id',case when _source->>'transcript_doc_id' is not null then 'auto' end,_source->>'transcript_status');
 else
 if _source->>'source_state' <> 'unavailable' and (_source->>'source_updated_at')::timestamptz<t.source_updated_at then
 update teacher_post_session_tasks set source_checked_at=now() where id=t.id;return;end if;
 -- Preserve a durable trace of time changes, even after a later refresh labels the session ended.
 if (_source ? 'starts_at' and t.starts_at is distinct from (_source->>'starts_at')::timestamptz) or (_source ? 'ends_at' and t.ends_at is distinct from (_source->>'ends_at')::timestamptz) then
 insert into teacher_post_session_events(task_id,owner_id,action,detail) values(t.id,_owner,'source_rescheduled',jsonb_build_object('previous_starts_at',t.starts_at,'previous_ends_at',t.ends_at,'starts_at',_source->>'starts_at','ends_at',_source->>'ends_at'));
 end if;
 update teacher_post_session_tasks set source_title=coalesce(_source->>'source_title',source_title),starts_at=coalesce((_source->>'starts_at')::timestamptz,starts_at),ends_at=coalesce((_source->>'ends_at')::timestamptz,ends_at),source_state=_source->>'source_state',source_updated_at=case when _source->>'source_state'='unavailable' then source_updated_at else (_source->>'source_updated_at')::timestamptz end,source_checked_at=now(),
 student_id=case when manual_match or not (_source ? 'student_id') then student_id else (_source->>'student_id')::uuid end,student_name=case when manual_match or not (_source ? 'student_name') then student_name else _source->>'student_name' end,match_state=case when manual_match then match_state else coalesce(_source->>'match_state',match_state) end,
 transcript_doc_id=case when transcript_source='manual' then transcript_doc_id else coalesce(transcript_doc_id,_source->>'transcript_doc_id') end,
 transcript_source=case when transcript_source='manual' then 'manual' when coalesce(_source->>'transcript_doc_id',transcript_doc_id) is not null then 'auto' end,
 transcript_status=case when transcript_source='manual' then 'linked' when _source->>'transcript_status'='needs_review' then 'needs_review' when transcript_doc_id is not null and _source->>'transcript_doc_id' is not null and transcript_doc_id<>_source->>'transcript_doc_id' then 'needs_review' when transcript_doc_id is not null then 'linked' else coalesce(_source->>'transcript_status',transcript_status) end where id=t.id;
 end if;end $$;
create function public.teacher_post_session_finish(_owner uuid,_lease uuid,_expected timestamptz,_covered timestamptz,_updated timestamptz,_catching boolean,_error text default null) returns void language plpgsql security definer set search_path=public, pg_temp as $$begin
 update teacher_post_session_settings set covered_through=case when _error is null then greatest(covered_through,_covered) else covered_through end,updated_checkpoint=case when _error is null then greatest(updated_checkpoint,_updated) else updated_checkpoint end,last_success_at=case when _error is null then now() else last_success_at end,last_error=_error,catching_up=case when _error is null then _catching else catching_up end,lease_token=null,lease_until=null where owner_id=_owner and has_role(_owner,'admin') and enabled and lease_token=_lease and lease_until>now() and covered_through is not distinct from _expected;
 if not found then raise exception 'lease_or_cursor_lost';end if;end $$;
-- Record pre-lease failures only after authenticating the pinned owner/ticket.
create function public.teacher_post_session_attempt(_owner uuid,_started timestamptz,_error text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
 if _error is not null and _error not in ('calendar_owner_mismatch','primary_calendar_identity_unavailable','sync_failed_retry_pending') then raise exception 'invalid_error_code';end if;
 update teacher_post_session_settings set last_attempt_at=least(_started,now()),last_error=coalesce(_error,last_error) where owner_id=_owner and has_role(_owner,'admin') and enabled and (last_attempt_at is null or last_attempt_at<=_started) and (last_success_at is null or last_success_at<=_started);
end $$;
-- The source worker supplies only live-email-verified rows. One transaction owns dry-run validation and import.
create function public.teacher_post_session_import_folders(_owner uuid,_calendar text,_root text,_folders jsonb,_dry_run boolean default true) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f jsonb;accepted jsonb:='[]';unresolved jsonb:='[]';student uuid;slug text;begin
 perform pg_advisory_xact_lock(hashtextextended(_owner::text,0));
 if not has_role(_owner,'admin') or _root !~ '^[A-Za-z0-9_-]{10,200}$' or jsonb_typeof(_folders)<>'array' then raise exception 'invalid_import';end if;
 if exists(select 1 from teacher_post_session_settings where owner_id=_owner and calendar_id<>_calendar) then raise exception 'calendar_owner_mismatch';end if;
 for f in select value from jsonb_array_elements(_folders) loop
 student:=(f->>'student_id')::uuid;slug:=f->>'local_slug';
 if slug !~ '^[a-z0-9][a-z0-9_-]{0,100}$' or (f->>'folder_id') !~ '^[A-Za-z0-9_-]{10,200}$'
 or not exists(select 1 from profiles where class_id=student and archived_at is null) or has_role(student,'admin')
 or (select count(*) from jsonb_array_elements(_folders) x where x->>'local_slug'=slug or x->>'student_id'=student::text)>1
 or exists(select 1 from teacher_student_folders where owner_id=_owner and ((local_slug=slug and student_id<>student) or (student_id=student and local_slug<>slug))) then
 unresolved:=unresolved||jsonb_build_array(jsonb_build_object('slug',slug,'reason','existing_or_manifest_identity_conflict'));continue;end if;
 accepted:=accepted||jsonb_build_array(f);
 end loop;
 if not _dry_run and jsonb_array_length(accepted)>0 then
 insert into teacher_post_session_settings(owner_id,calendar_id,drive_root_id,enabled) values(_owner,_calendar,_root,false) on conflict(owner_id) do update set drive_root_id=excluded.drive_root_id;
 for f in select value from jsonb_array_elements(accepted) loop
 insert into teacher_student_folders(owner_id,student_id,local_slug,folder_id,aliases) values(_owner,(f->>'student_id')::uuid,f->>'local_slug',f->>'folder_id',array(select jsonb_array_elements_text(f->'aliases')))
 on conflict(owner_id,student_id) do update set folder_id=excluded.folder_id,aliases=array(select distinct unnest(teacher_student_folders.aliases||excluded.aliases));
 end loop;end if;
 return jsonb_build_object('ok',true,'dry_run',_dry_run,'linked',accepted,'unresolved',unresolved);
end $$;
-- Remove the default PUBLIC execution grant, including helper functions.
do $$declare f record;begin for f in select p.oid::regprocedure sig,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'teacher_post_session_%' or p.proname='teacher_worker_consume') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);
 if f.proname in ('teacher_post_session_home','teacher_post_session_update') then execute format('grant execute on function %s to authenticated',f.sig);end if;end loop;end $$;


grant all on public.teacher_worker_tickets to service_role;
grant usage, select on sequence public.teacher_post_session_events_id_seq to service_role;

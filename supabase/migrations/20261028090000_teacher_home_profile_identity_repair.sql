-- Repair the already-applied base migration for the deployed TEXT profiles.class_id.
-- Keep UUID RPC inputs, owner checks, eligibility and row-lock semantics unchanged.
-- Apply before the desk migration renames teacher_post_session_update to its base helper.

create or replace function public.teacher_post_session_update(_task_id uuid,_expected_revision integer,_action text,_field text default null,_value boolean default null,_doc_id text default null,_student_id uuid default null) returns jsonb language plpgsql security definer set search_path=public, pg_temp as $$
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
 select * into p from profiles where class_id=_student_id::text and archived_at is null;
 if not found or has_role(_student_id,'admin') then raise exception 'invalid_student';end if;
 t.student_id=_student_id;t.student_name=p.display_name;t.match_state='matched';t.manual_match=true;
 else raise exception 'invalid_action';end if;
 update teacher_post_session_tasks set handled_at=t.handled_at,recap_done=t.recap_done,notes_done=t.notes_done,work_assigned=t.work_assigned,transcript_doc_id=t.transcript_doc_id,transcript_source=t.transcript_source,transcript_status=t.transcript_status,student_id=t.student_id,student_name=t.student_name,match_state=t.match_state,manual_match=t.manual_match,revision=revision+1 where id=t.id returning * into t;
 insert into teacher_post_session_events(task_id,owner_id,actor_id,action,detail) values(t.id,t.owner_id,auth.uid(),_action,jsonb_build_object('field',_field,'value',_value,'doc_id',_doc_id,'student_id',_student_id));
 return teacher_post_session_task_json(t);
end $$;

create or replace function public.teacher_post_session_import_folders(_owner uuid,_calendar text,_root text,_folders jsonb,_dry_run boolean default true) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f jsonb;accepted jsonb:='[]';unresolved jsonb:='[]';student uuid;slug text;begin
 perform pg_advisory_xact_lock(hashtextextended(_owner::text,0));
 if not has_role(_owner,'admin') or _root !~ '^[A-Za-z0-9_-]{10,200}$' or jsonb_typeof(_folders)<>'array' then raise exception 'invalid_import';end if;
 if exists(select 1 from teacher_post_session_settings where owner_id=_owner and calendar_id<>_calendar) then raise exception 'calendar_owner_mismatch';end if;
 for f in select value from jsonb_array_elements(_folders) loop
 student:=(f->>'student_id')::uuid;slug:=f->>'local_slug';
 if slug !~ '^[a-z0-9][a-z0-9_-]{0,100}$' or (f->>'folder_id') !~ '^[A-Za-z0-9_-]{10,200}$'
 or not exists(select 1 from profiles where class_id=student::text and archived_at is null) or has_role(student,'admin')
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

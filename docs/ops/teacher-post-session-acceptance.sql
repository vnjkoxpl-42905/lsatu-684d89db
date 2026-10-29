-- Execute only against a disposable database after applying the migration.
-- Uses existing owner/student identities supplied by the operator; rolls back all changes.
-- psql -v owner_uuid=... -v student_uuid=... -f this-file.sql
begin;
select set_config('test.owner', :'owner_uuid', true);
select set_config('test.student', :'student_uuid', true);
do $test$
declare owner uuid := current_setting('test.owner')::uuid;student uuid := current_setting('test.student')::uuid;
 lease uuid; task uuid; state jsonb; prior integer; ticket uuid;begin
 if not public.has_role(owner,'admin') or public.has_role(student,'admin') then raise exception 'Supply existing test admin and non-admin student';end if;
 insert into public.teacher_post_session_settings(owner_id,calendar_id,enabled,activation_cutoff,covered_through) values(owner,'test@example.com',true,now()-interval '1 day',now()-interval '1 day');
 select (public.teacher_post_session_claim(owner)->>'lease_token')::uuid into lease;
 if lease is null or public.teacher_post_session_claim(owner) is not null then raise exception 'Claim exclusivity failed';end if;
 perform public.teacher_post_session_source(owner,lease,'recurring_instance_1',jsonb_build_object('source_title','Test session','starts_at',now()-interval '2 hours','ends_at',now()-interval '1 hour','source_state','ended','source_updated_at',now(),'student_id',student,'student_name','Test student','match_state','matched','transcript_status','waiting'));
 select id into task from public.teacher_post_session_tasks where owner_id=owner and event_id='recurring_instance_1';
 select revision into prior from public.teacher_post_session_tasks where id=task;
 -- Repeat must keep ID and never create a second task.
 perform public.teacher_post_session_source(owner,lease,'recurring_instance_1',jsonb_build_object('source_state','cancelled','source_updated_at',now()));
 if (select revision from public.teacher_post_session_tasks where id=task)<>prior then raise exception 'Source refresh changed teacher revision';end if;
 if (select count(*) from public.teacher_post_session_tasks where owner_id=owner and event_id='recurring_instance_1')<>1 then raise exception 'Duplicate instance';end if;
 perform public.teacher_post_session_attempt(owner,now(),'primary_calendar_identity_unavailable');
 if not (select last_error='primary_calendar_identity_unavailable' and last_attempt_at is not null from public.teacher_post_session_settings where owner_id=owner) then raise exception 'Prelease failure was hidden';end if;
 perform set_config('request.jwt.claim.sub',owner::text,true);
 select revision into prior from public.teacher_post_session_tasks where id=task;
 state:=public.teacher_post_session_update(task,prior,'checklist','recap_done',true);
 begin perform public.teacher_post_session_update(task,prior,'handle');raise exception 'Stale revision accepted';exception when serialization_failure then null;end;
 state:=public.teacher_post_session_update(task,(state->>'revision')::integer,'attach_transcript',null,null,'manual_document_id');
 state:=public.teacher_post_session_update(task,(state->>'revision')::integer,'handle');
 perform public.teacher_post_session_source(owner,lease,'recurring_instance_1',jsonb_build_object('source_state','cancelled','source_updated_at',now(),'transcript_doc_id','automatic_document_id','transcript_status','linked'));
 if not (select recap_done and handled_at is not null and transcript_doc_id='manual_document_id' from public.teacher_post_session_tasks where id=task) then raise exception 'Source refresh erased work';end if;
 select revision into prior from public.teacher_post_session_tasks where id=task;
 state:=public.teacher_post_session_update(task,prior,'reopen');
 if state->>'handled_at' is not null then raise exception 'Reopen failed';end if;
 perform set_config('request.jwt.claim.sub',student::text,true);
 begin perform public.teacher_post_session_home();raise exception 'Student read accepted';exception when insufficient_privilege then null;end;
 begin perform public.teacher_post_session_update(task,prior,'handle');raise exception 'Student write accepted';exception when insufficient_privilege then null;end;
 insert into public.teacher_worker_tickets(owner_id,worker,expires_at) values(owner,'teacher-post-session-sync',now()+interval '1 minute') returning id into ticket;
 if public.teacher_worker_consume(ticket)<>owner or public.teacher_worker_consume(ticket) is not null then raise exception 'Ticket replay accepted';end if;
 update public.teacher_post_session_settings set lease_until=now()-interval '1 second' where owner_id=owner;
 begin perform public.teacher_post_session_source(owner,lease,'recurring_instance_1',jsonb_build_object('source_state','cancelled','source_updated_at',now()));raise exception 'Expired lease accepted';exception when raise_exception then if sqlerrm<>'lease_lost' then raise;end if;end;
 raise notice 'Atomic work, permissions, tickets, and expired-lease checks passed (transaction will roll back)';
end $test$;
rollback;

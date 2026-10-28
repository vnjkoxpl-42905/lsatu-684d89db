-- PREPARED ONLY. This script is inert: leave the approval flag false.
-- Requires an approved migration, Edge Function deployment, and owner-pinned secrets.
do $activation$
declare approved boolean := false; job bigint;
 function_url constant text := 'https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/teacher-post-session-sync';
begin
 if not approved then raise notice 'Not activated: separate deployment approval required';return;end if;
 if not exists(select 1 from pg_extension where extname='pg_cron') or not exists(select 1 from pg_extension where extname='pg_net') then raise exception 'pg_cron and pg_net must be available; no laptop scheduler substitute';end if;
 if function_url not like 'https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/%' then raise exception 'Verify exact project function URL';end if;
 if not exists(select 1 from public.teacher_post_session_settings where owner_id='5ff160ef-016e-4ab5-aab1-55c7a2ad888f' and drive_root_id is not null) or not exists(select 1 from public.teacher_student_folders where owner_id='5ff160ef-016e-4ab5-aab1-55c7a2ad888f') then raise exception 'Import and verify student folder links before activation';end if;
 -- Set cutoff once at activation; never reset it during a retry or re-deploy.
 update public.teacher_post_session_settings set enabled=true,activation_cutoff=coalesce(activation_cutoff,now()),covered_through=coalesce(covered_through,now()) where owner_id='5ff160ef-016e-4ab5-aab1-55c7a2ad888f' and calendar_id='contact@aspiringattorneys.com';
 if not found then raise exception 'Import verified owner settings first';end if;
 -- Existing named job must be inspected rather than silently duplicated.
 if exists(select 1 from cron.job where jobname='teacher-post-session-sync') then raise exception 'Job already exists; inspect before changing';end if;
 select cron.schedule('teacher-post-session-sync','*/5 * * * *',$job$
 with ticket as (
 insert into public.teacher_worker_tickets(owner_id,worker,expires_at)
 select owner_id,'teacher-post-session-sync',now()+interval '2 minutes'
 from public.teacher_post_session_settings where owner_id='5ff160ef-016e-4ab5-aab1-55c7a2ad888f' and enabled
 returning id
 )
 select net.http_post(
 url := 'https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/teacher-post-session-sync',
 headers := '{"Content-Type":"application/json"}'::jsonb,
 body := jsonb_build_object('action','sync','ticket',id),timeout_milliseconds := 60000)
 from ticket;
 $job$) into job;
 raise notice 'Scheduled job %; verify run details and Home readback',job;
end $activation$;
-- Rollback/pause (after explicit instruction): UPDATE ... SET enabled=false;
-- Disabling settings prevents claims and lease renewals even for outstanding tickets.

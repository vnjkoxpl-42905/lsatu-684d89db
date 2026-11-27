-- Disabled on installation. The owner and deployment must be enabled separately
-- after the delivery path is reviewed. Keep all queue internals outside PostgREST.
create schema lsatu_inbox_alerts;
revoke all on schema lsatu_inbox_alerts from public, anon, authenticated, service_role;

create table lsatu_inbox_alerts.settings (
  singleton boolean primary key default true check (singleton),
  owner_id uuid references auth.users(id) on delete cascade,
  project_ref text check (project_ref ~ '^[a-z]{20}$'),
  enabled_at timestamptz,
  check (enabled_at is null or (owner_id is not null and project_ref is not null))
);
insert into lsatu_inbox_alerts.settings (singleton) values (true);

create table lsatu_inbox_alerts.outbox (
  message_id uuid primary key,
  thread_id uuid not null,
  recipient_id uuid not null,
  enqueued_at timestamptz not null default clock_timestamp(),
  next_attempt_at timestamptz not null default clock_timestamp(),
  first_attempt_at timestamptz,
  attempts integer not null default 0,
  request_id bigint,
  request_at timestamptz,
  response_status integer,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'failed', 'skipped')),
  finished_at timestamptz
);
alter table lsatu_inbox_alerts.settings enable row level security;
alter table lsatu_inbox_alerts.outbox enable row level security;
revoke all on all tables in schema lsatu_inbox_alerts from public, anon, authenticated, service_role;
create index inbox_alert_due_idx on lsatu_inbox_alerts.outbox (next_attempt_at) where status = 'pending';

create function lsatu_inbox_alerts.enqueue_student_message()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select s.owner_id into owner
  from lsatu_inbox_alerts.settings s
  join auth.users u on u.id = s.owner_id
  where s.enabled_at <= clock_timestamp()
    and u.email_confirmed_at is not null
    and public.has_role(u.id, 'admin');
  if owner is null or new.sender_id = owner
    or auth.uid() is distinct from new.sender_id
    or public.has_role(new.sender_id, 'admin')
    or not exists (select 1 from public.profiles p where p.class_id::text = new.sender_id::text)
    or not public.is_conversation_participant(new.conversation_id, new.sender_id)
    or not public.is_conversation_participant(new.conversation_id, owner)
  then
    return new;
  end if;

  insert into lsatu_inbox_alerts.outbox (message_id, thread_id, recipient_id)
  values (new.id, new.conversation_id, owner)
  on conflict (message_id) do nothing;
  return new;
end;
$$;
revoke all on function lsatu_inbox_alerts.enqueue_student_message() from public, anon, authenticated, service_role;

create trigger lsatu_enqueue_student_inbox_alert
after insert on public.messages for each row
execute function lsatu_inbox_alerts.enqueue_student_message();

-- Run once a minute under the DB owner via pg_cron only after staging
-- verification. All outbound HTTP goes to the one exact worker path.
create function lsatu_inbox_alerts.dispatch()
returns void
language plpgsql
set search_path = ''
as $$
declare
  config lsatu_inbox_alerts.settings%rowtype;
  job lsatu_inbox_alerts.outbox%rowtype;
  signing_secret text;
  signed_at bigint;
  signature text;
  submitted bigint;
  result_code integer;
  result_found boolean;
begin
  -- Serialize runs, including recovery from a worker pause.
  if not pg_try_advisory_xact_lock(hashtextextended('lsatu_inbox_alerts.dispatch', 0)) then
    return;
  end if;
  select s.* into config
  from lsatu_inbox_alerts.settings s
  join auth.users u on u.id = s.owner_id
  where s.enabled_at <= clock_timestamp()
    and u.email_confirmed_at is not null
    and public.has_role(u.id, 'admin');
  if not found then return; end if;

  signing_secret := (select decrypted_secret from vault.decrypted_secrets where name = 'lsatu_inbox_alert_signing_secret');
  if length(coalesce(signing_secret, '')) < 32 then
    raise exception 'Inbox alert signing secret is missing or too short';
  end if;

  for job in
    select * from lsatu_inbox_alerts.outbox
    where status = 'pending' and next_attempt_at <= clock_timestamp()
    order by next_attempt_at, message_id
    limit 20 for update skip locked
  loop
    if job.request_id is not null then
      select r.status_code into result_code from net._http_response r where r.id = job.request_id;
      result_found := found;
      if result_code between 200 and 299 then
        update lsatu_inbox_alerts.outbox
        set status = 'accepted', response_status = result_code, finished_at = clock_timestamp()
        where message_id = job.message_id;
        continue;
      end if;
      if result_code between 400 and 499 and result_code not in (408, 409, 429) then
        update lsatu_inbox_alerts.outbox
        set status = 'failed', response_status = result_code, finished_at = clock_timestamp()
        where message_id = job.message_id;
        continue;
      end if;
      if not result_found and job.request_at > clock_timestamp() - interval '3 minutes' then
        continue;
      end if;
      update lsatu_inbox_alerts.outbox
      set request_id = null, request_at = null, response_status = result_code,
          next_attempt_at = clock_timestamp() + make_interval(mins => least(60, 1 << least(6, job.attempts - 1)))
      where message_id = job.message_id;
      continue;
    end if;
    if job.recipient_id <> config.owner_id or job.enqueued_at < config.enabled_at
      or not public.is_conversation_participant(job.thread_id, config.owner_id)
      or not exists (
        select 1 from public.messages m
        where m.id = job.message_id and m.conversation_id = job.thread_id
          and not public.has_role(m.sender_id, 'admin')
          and public.is_conversation_participant(m.conversation_id, m.sender_id)
      )
    then
      update lsatu_inbox_alerts.outbox set status = 'skipped', finished_at = clock_timestamp()
      where message_id = job.message_id;
      continue;
    end if;
    -- Resend retains idempotency keys for 24 hours. Never retry beyond this
    -- shorter window, including cases where the original response was lost.
    if job.first_attempt_at <= clock_timestamp() - interval '22 hours' then
      update lsatu_inbox_alerts.outbox set status = 'failed', finished_at = clock_timestamp()
      where message_id = job.message_id;
      continue;
    end if;

    signed_at := floor(extract(epoch from clock_timestamp()));
    signature := encode(extensions.hmac(
      'lsatu-inbox-alert-v1:' || config.project_ref || ':' || signed_at || ':' || job.thread_id || ':' || job.message_id,
      signing_secret, 'sha256'
    ), 'hex');
    submitted := net.http_post(
      url := 'https://' || config.project_ref || '.supabase.co/functions/v1/inbox-alert-delivery',
      body := jsonb_build_object('thread_id', job.thread_id, 'message_id', job.message_id, 'signed_at', signed_at),
      headers := jsonb_build_object('Content-Type', 'application/json', 'X-LSatu-Signature', signature),
      timeout_milliseconds := 15000
    );
    update lsatu_inbox_alerts.outbox
    set attempts = attempts + 1, request_id = submitted, request_at = clock_timestamp(),
        first_attempt_at = coalesce(first_attempt_at, clock_timestamp()), next_attempt_at = clock_timestamp() + interval '1 minute'
    where message_id = job.message_id;
  end loop;
end;
$$;
revoke all on function lsatu_inbox_alerts.dispatch() from public, anon, authenticated, service_role;

\set ON_ERROR_STOP on
begin;

-- Run only in a new isolated PostgreSQL database. The database owner defines
-- minimal Supabase auth, storage, and HTTP infrastructure fixtures here.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end;
$$;

create schema auth;
create schema storage;
create schema extensions;
create schema vault;
create schema net;
create extension pgcrypto with schema extensions;
create table auth.users (id uuid primary key, email text not null, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to authenticated;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (bucket_id text, name text);
create function storage.foldername(filename text) returns text[] language sql immutable as $$
  select string_to_array(filename, '/');
$$;
create table public.profiles (class_id text primary key, display_name text);
alter table public.profiles enable row level security;
create table public.drive_files (id uuid primary key);
create publication supabase_realtime;
\ir ../../migrations/20260415210932_559f5a00-37ac-4655-a4b8-54418240d074.sql
\ir ../../migrations/20260416234013_49bfd508-03f2-4942-a636-2763f1f3af5b.sql
\ir ../../migrations/20260421013408_4f64bd4c-8eb3-4f12-874c-5bd6902f2845.sql
\ir ../../migrations/20261105120000_message_reply_to.sql

-- Fixtures for the existing MCP audit and admin guard. Other Classroom tables
-- from the migration that owns them are outside this Inbox test.
create table public.mcp_write_audit (
  actor_id uuid not null, tool_name text not null, idempotency_key text not null,
  result jsonb not null, unique (actor_id, tool_name, idempotency_key)
);
create function public.mcp_require_admin() returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null or not public.has_role(caller, 'admin') then
    raise exception using errcode = '42501', message = 'admin authentication required';
  end if;
  return caller;
end;
$$;
grant select on public.profiles, public.conversations, public.conversation_participants, public.message_attachments to authenticated;
grant select, insert on public.messages to authenticated;

-- In-memory stand-in for pg_net and Vault. No real HTTP is possible.
create table vault.decrypted_secrets (name text unique, decrypted_secret text);
create table net._http_response (id bigint, status_code integer);
create table net.requests (id bigint generated always as identity, url text, body jsonb, headers jsonb);
create function net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds integer)
returns bigint language sql as $$
  insert into net.requests(url, body, headers) values ($1, $2, $3) returning id;
$$;
\ir ../../migrations/20261127211000_mcp_inbox.sql
\ir ../../migrations/20261127212000_inbox_alert_outbox.sql

insert into auth.users values
  ('10000000-0000-4000-8000-000000000001', 'teacher-login@example.test', now()),
  ('10000000-0000-4000-8000-000000000002', 'other-teacher@example.test', now()),
  ('10000000-0000-4000-8000-000000000003', 'test-student@example.test', now());
insert into public.user_roles (user_id, role) values
  ('10000000-0000-4000-8000-000000000001', 'admin'),
  ('10000000-0000-4000-8000-000000000002', 'admin'),
  ('10000000-0000-4000-8000-000000000003', 'user');
insert into public.profiles (class_id, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'Mailbox owner'),
  ('10000000-0000-4000-8000-000000000002', 'Other teacher'),
  ('10000000-0000-4000-8000-000000000003', 'Synthetic student');
insert into public.conversations (id, created_by) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002');
insert into public.conversation_participants (conversation_id, user_id, last_read_at) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '2020-01-01 UTC'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', '2020-01-01 UTC'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '2020-01-01 UTC'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '2020-01-01 UTC');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
insert into public.messages (id, conversation_id, sender_id, body, created_at) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', auth.uid(), 'First', '2020-01-02 UTC'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', auth.uid(), 'Unrelated', '2020-01-03 UTC');
do $$
begin
  begin
    perform public.mcp_list_inbox();
    raise exception 'Student unexpectedly accessed Inbox MCP';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

insert into public.message_attachments (message_id, storage_path, file_name, file_size, mime_type)
values ('30000000-0000-4000-8000-000000000001', 'fixture-private-storage-path', 'fixture.pdf', 20, 'application/pdf');
do $$
begin
  if exists (select 1 from lsatu_inbox_alerts.outbox) then raise exception 'Alerts were enabled by default'; end if;
  update lsatu_inbox_alerts.settings
  set owner_id = '10000000-0000-4000-8000-000000000001', project_ref = 'atrcqxpmqrynmtvvyjju',
      enabled_at = clock_timestamp() - interval '1 second';
end;
$$;
insert into vault.decrypted_secrets values ('lsatu_inbox_alert_signing_secret', repeat('synthetic-credential-', 4));

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
insert into public.messages (id, conversation_id, sender_id, body, created_at) values
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', auth.uid(), 'Unrelated follow-up', '2020-01-04 UTC'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', auth.uid(), 'New', '2020-01-05 UTC');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$
declare
  owned uuid := '20000000-0000-4000-8000-000000000001';
  unrelated uuid := '20000000-0000-4000-8000-000000000002';
  first_message uuid := '30000000-0000-4000-8000-000000000001';
  unrelated_message uuid := '30000000-0000-4000-8000-000000000002';
  recent_message uuid := '30000000-0000-4000-8000-000000000004';
  result jsonb;
  reply jsonb;
  replay jsonb;
begin
  result := public.mcp_list_inbox(true, 1, 0);
  if (result->>'unread_messages')::int <> 2 or (result->>'unread_conversations')::int <> 1
     or jsonb_array_length(result->'conversations') <> 1
     or (result#>>'{conversations,0,thread_id}')::uuid <> owned
  then raise exception 'Wrong unread count or conversation scope: %', result; end if;
  result := public.mcp_read_inbox_thread(owned, null, null, 1);
  if (result#>>'{messages,0,id}')::uuid <> recent_message
     or (result->>'next_before_message_id')::uuid <> recent_message
  then raise exception 'Wrong message page: %', result; end if;
  result := public.mcp_read_inbox_thread(owned, null, recent_message, 1);
  if (result#>>'{messages,0,id}')::uuid <> first_message
     or result#>>'{messages,0,attachments,0,file_name}' <> 'fixture.pdf'
     or result::text like '%fixture-private-storage-path%'
  then raise exception 'Wrong message page or attachment shape: %', result; end if;
  result := public.mcp_read_inbox_thread(owned, recent_message);
  if (result#>>'{messages,0,id}')::uuid <> recent_message or jsonb_array_length(result->'messages') <> 1
  then raise exception 'Alert message lookup did not target one exact message'; end if;
  if (select last_read_at from public.conversation_participants where conversation_id = owned and user_id = auth.uid())
      <> '2020-01-01 UTC'::timestamptz
  then raise exception 'Reading changed the read receipt'; end if;

  begin
    perform public.mcp_read_inbox_thread(unrelated);
    raise exception 'Admin policy leaked a thread with no participation';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.mcp_reply_inbox_thread(unrelated, 'Unauthorized', null, 'unauthorized-reply', true);
    raise exception 'Admin policy allowed a send to a thread with no participation';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.mcp_read_inbox_thread(owned, unrelated_message);
    raise exception 'Cross-thread alert message was readable';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.mcp_reply_inbox_thread(owned, 'Unauthorized quote', unrelated_message, 'unauthorized-quote', true);
    raise exception 'Cross-thread quote succeeded';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.mcp_reply_inbox_thread(owned, 'Not approved', null, 'unapproved-reply', false);
    raise exception 'Reply sent without explicit approval';
  exception when invalid_parameter_value then null;
  end;

  reply := public.mcp_reply_inbox_thread(owned, E'  Hello\n\nTest  ', recent_message, 'approved-inbox-reply', true);
  replay := public.mcp_reply_inbox_thread(owned, E'  Hello\n\nTest  ', recent_message, 'approved-inbox-reply', true);
  if replay->>'message_id' is distinct from reply->>'message_id'
     or replay->>'reused' <> 'true'
     or reply#>>'{delivery,inbox}' <> 'persisted'
     or reply#>>'{delivery,email}' <> 'not_requested'
     or (select count(*) from public.messages where conversation_id = owned and sender_id = auth.uid()) <> 1
  then raise exception 'Reply retry produced duplicate or misleading delivery'; end if;
  if not exists (select 1 from public.messages where id = (reply->>'message_id')::uuid
     and body = E'Hello\n\nTest' and reply_to_message_id = recent_message and sender_id = auth.uid())
  then raise exception 'Stored reply differs from approved body or quote'; end if;
  begin
    perform public.mcp_reply_inbox_thread(owned, 'Changed', recent_message, 'approved-inbox-reply', true);
    raise exception 'Conflicting key was silently accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;

do $$
declare
  alert_message uuid := '30000000-0000-4000-8000-000000000004';
  alert_thread uuid := '20000000-0000-4000-8000-000000000001';
  expected_signature text;
  sent net.requests%rowtype;
begin
  if (select count(*) from public.mcp_write_audit) <> 1 then raise exception 'Unexpected audit count'; end if;
  if (select count(*) from lsatu_inbox_alerts.outbox) <> 1
     or not exists (select 1 from lsatu_inbox_alerts.outbox where message_id = alert_message and thread_id = alert_thread)
  then raise exception 'Wrong privacy or dedup scope for alert enqueue'; end if;

  perform lsatu_inbox_alerts.dispatch();
  select * into strict sent from net.requests;
  expected_signature := encode(extensions.hmac(
    'lsatu-inbox-alert-v1:atrcqxpmqrynmtvvyjju:' || (sent.body->>'signed_at') || ':' || alert_thread || ':' || alert_message,
    repeat('synthetic-credential-', 4), 'sha256'
  ), 'hex');
  if sent.body - 'signed_at' <> jsonb_build_object('thread_id', alert_thread, 'message_id', alert_message)
     or sent.headers->>'X-LSatu-Signature' <> expected_signature
     or sent.url <> 'https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/inbox-alert-delivery'
  then raise exception 'Unsafe alert envelope or invalid signature'; end if;

  insert into net._http_response values (sent.id, 502);
  update lsatu_inbox_alerts.outbox set next_attempt_at = clock_timestamp() - interval '1 minute';
  perform lsatu_inbox_alerts.dispatch();
  if not exists (select 1 from lsatu_inbox_alerts.outbox where status = 'pending' and request_id is null and attempts = 1)
  then raise exception 'Transient delivery failure was not scheduled for retry'; end if;
  update lsatu_inbox_alerts.outbox set next_attempt_at = clock_timestamp() - interval '1 minute';
  perform lsatu_inbox_alerts.dispatch();
  insert into net._http_response select max(id), 204 from net.requests;
  update lsatu_inbox_alerts.outbox set next_attempt_at = clock_timestamp() - interval '1 minute';
  perform lsatu_inbox_alerts.dispatch();
  if not exists (select 1 from lsatu_inbox_alerts.outbox where status = 'accepted' and attempts = 2 and response_status = 204)
  then raise exception 'Successful retry was not recorded'; end if;
  perform lsatu_inbox_alerts.dispatch();
  if (select count(*) from net.requests) <> 2 then raise exception 'Accepted job was sent again'; end if;

  -- Simulate recovery after a prolonged outage. This fixture rolls back.
  update lsatu_inbox_alerts.outbox set status = 'pending', request_id = null,
    next_attempt_at = clock_timestamp() - interval '1 minute',
    first_attempt_at = clock_timestamp() - interval '23 hours';
  perform lsatu_inbox_alerts.dispatch();
  if not exists (select 1 from lsatu_inbox_alerts.outbox where status = 'failed')
     or (select count(*) from net.requests) <> 2
  then raise exception 'A stale ambiguous send was retried past the safe provider window'; end if;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform public.mcp_list_inbox();
    raise exception 'Anonymous caller had Inbox access';
  exception when insufficient_privilege then null;
  end;
  begin
    perform lsatu_inbox_alerts.dispatch();
    raise exception 'Anonymous caller could dispatch Inbox alerts';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;

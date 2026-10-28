-- This script is exclusively loaded into the named disposable Docker database.
drop schema if exists public cascade;
drop schema if exists auth cascade;
create schema public;
create schema auth;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
grant usage on schema public,auth to authenticated,anon,service_role;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $body$select nullif(current_setting('request.jwt.claim.role',true),'')$body$;
create table auth.users(id uuid primary key);
create table public.user_roles(user_id uuid,role text);
create function public.has_role(p_user uuid,p_role text) returns boolean language sql stable security definer as $$select exists(select 1 from public.user_roles where user_id=p_user and role=p_role)$$;
create function public.mcp_require_admin() returns uuid language plpgsql security definer as $$begin if not public.has_role(auth.uid(),'admin') then raise exception 'admin required' using errcode='42501';end if;return auth.uid();end$$;
create function public.mcp_get_or_create_admin_student_conversation(p_admin uuid,p_student uuid) returns uuid language sql as $$select '90000000-0000-0000-0000-000000000001'::uuid$$;
create table public.ai_ta_drafts(id uuid primary key,student_id uuid not null,created_by uuid,draft_type text,draft_json jsonb,status text default 'draft',posted_at timestamptz);
create table public.profiles(class_id text primary key);
create table public.homework_sets(id uuid primary key,title text,description text,question_qids text[],class_id uuid);
create table public.mcp_write_audit(actor_id uuid,tool_name text,idempotency_key text,student_id uuid,result jsonb);
create table public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid,sender_id uuid,body text,created_at timestamptz default now());
-- Column types and RLS ownership mirror the live evidence and native migration
-- definitions. Snapshot-only fields are retained for the real MCP SQL bodies.
create table public.classroom_items(id uuid primary key default gen_random_uuid(),student_id uuid not null,class_id uuid,created_by uuid,type text not null,title text not null,description text,content_html text,content_markdown text,source_table text,source_id text,status text default 'assigned',unlock_at timestamptz,due_at timestamptz,completed_at timestamptz,priority integer default 0,visible_to_student boolean default true,metadata_json jsonb default '{}',created_at timestamptz default now(),updated_at timestamptz default now());
create table public.homework_assignments(id uuid primary key default gen_random_uuid(),set_id uuid,student_id uuid not null,question_qids text[] default '{}',set_title text default 'Homework',set_description text,status text default 'assigned',assigned_by uuid,class_id uuid,created_at timestamptz default now(),started_at timestamptz,completed_at timestamptz,score numeric);
create table public.ta_assignments(id uuid primary key default gen_random_uuid(),student_id uuid not null,title text default 'TA',content_html text,response_schema jsonb,response_data jsonb default '{}',answer_key_html text,assigned_by uuid,status text default 'assigned',assigned_at timestamptz default now(),created_at timestamptz default now(),viewed_at timestamptz,completed_at timestamptz,response_saved_at timestamptz);
create table public.guided_drill_assignments(id uuid primary key default gen_random_uuid(),student_id uuid not null,title text default 'Guided drill',status text default 'assigned',created_at timestamptz default now(),assigned_at timestamptz default now(),read_card_at timestamptz,unlock_at timestamptz,completed_at timestamptz);
create table public.activity_assignments(id uuid primary key default gen_random_uuid(),student_id uuid not null,title text default 'Activity',status text default 'assigned',created_at timestamptz default now(),completed_at timestamptz);
create table public.activities(id uuid primary key,class_id uuid,title text,subtitle text,instructions jsonb,item_format text,items jsonb,created_by uuid,mode text,time_goal_minutes numeric,source_section text);
alter table public.activity_assignments add column activity_id uuid,add column class_id uuid,add column subtitle text,add column instructions jsonb,add column item_format text,add column items jsonb,add column started_at timestamptz,add column assigned_by uuid,add column mode text,add column time_goal_minutes numeric,add column source_section text;
create table public.activity_item_responses(id uuid primary key default gen_random_uuid(),assignment_id uuid);
grant select,insert on public.activity_item_responses to authenticated;
alter table public.activity_item_responses enable row level security;
create policy response_owner on public.activity_item_responses for all to authenticated
using(exists(select 1 from public.activity_assignments a where a.id=assignment_id and a.student_id=auth.uid()))
with check(exists(select 1 from public.activity_assignments a where a.id=assignment_id and a.student_id=auth.uid()));
create table public.practice_test_assignments(id uuid primary key default gen_random_uuid(),student_id uuid not null,pt integer not null,assigned_by uuid,assigned_at timestamptz default now(),unlock_at timestamptz,status text default 'assigned',unique(student_id,pt));
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null,type text not null,title text not null,body text,link text,read boolean not null default false,created_at timestamptz default now());
-- Existing live guard, retained alongside the new linkage guard.
create function public.guard_notification_immutables() returns trigger language plpgsql set search_path=public as $$begin
 if public.has_role(auth.uid(),'admin') then return new;end if;
 if new.user_id is distinct from old.user_id or new.type is distinct from old.type or new.title is distinct from old.title or new.body is distinct from old.body or new.link is distinct from old.link or new.created_at is distinct from old.created_at then
 raise exception 'notifications: only the read flag is mutable for non-admin users';end if;
 if old.read and not new.read then raise exception 'notifications: read flag cannot be flipped back to false';end if;
 return new;end$$;
create trigger notifications_guard_immutables before update on notifications for each row execute function guard_notification_immutables();
grant all on all tables in schema public to service_role;
do $$declare t text;begin
 foreach t in array array['classroom_items','homework_assignments','ta_assignments','guided_drill_assignments','activity_assignments','practice_test_assignments'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy student_read on public.%I for select to authenticated using(student_id=auth.uid())',t);
 execute format('create policy student_update on public.%I for update to authenticated using(student_id=auth.uid()) with check(student_id=auth.uid())',t);
 execute format('create policy admin_all on public.%I for all to authenticated using(public.has_role(auth.uid(),''admin'')) with check(public.has_role(auth.uid(),''admin''))',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end$$;
alter table public.notifications enable row level security;
create policy owner_notification on public.notifications for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,update,delete on public.notifications to authenticated;
insert into auth.users values('10000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000002');
insert into public.user_roles values('10000000-0000-0000-0000-000000000001','admin');
insert into public.profiles select id::text from auth.users;
insert into public.ta_assignments(id,student_id,viewed_at) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','2026-10-01 12:00Z');
insert into public.classroom_items(id,student_id,type,title,metadata_json) values('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','note','Historical note','{"read_at":"2026-10-02T12:00:00Z","kept":"yes"}');
insert into public.practice_test_assignments(id,student_id,pt) values('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001',140);
insert into public.homework_assignments(id,student_id,status,started_at) values('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','in_progress','2026-10-03 12:00Z');
insert into public.activity_assignments(id,student_id,status,completed_at) values('30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001','completed','2026-10-04 12:00Z'),('30000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000001','completed',null);
insert into public.classroom_items(id,student_id,type,title,metadata_json) values
 ('32000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','bootcamp_module','Module A','{"assigned_route":"/bootcamp/conditionals?module=a"}'),
 ('32000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','bootcamp_module','Module B','{"assigned_route":"/bootcamp/conditionals?module=b"}');
insert into public.classroom_items(id,student_id,type,title,metadata_json) values('33000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','announcement','Previously read announcement','{"read_at":"2026-10-05T12:00:00Z"}');
insert into public.notifications(user_id,type,title,link,read) values('20000000-0000-0000-0000-000000000001','assignment','Old note','/classroom/item/30000000-0000-0000-0000-000000000002?x=1',false),('20000000-0000-0000-0000-000000000001','assignment','Generic','/classroom',false);
insert into public.notifications(user_id,type,title,link) values('20000000-0000-0000-0000-000000000001','assignment','Module A alert','/bootcamp/conditionals?module=a');
-- Actual deployed route families, rather than guessed /classroom aliases.
insert into guided_drill_assignments(id,student_id) values('34000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
insert into activity_assignments(id,student_id) values('34000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001');
insert into classroom_items(id,student_id,type,title,metadata_json) values
 ('35000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','bootcamp_module','Refresher','{"assigned_route":"/conditional-indicators-refresher"}'),
 ('35000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','bootcamp_module','Unless','{"assigned_route":"/quick-drills/unless-drill"}'),
 ('35000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','bootcamp_module','Abstract','{"assigned_route":"/topics/abstract"}'),
 ('35000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','activity','Reading Center','{"assigned_route":"/reading-center"}');
insert into classroom_items(id,student_id,type,title,source_table,source_id,metadata_json) values
 ('35000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001','bootcamp_module','Intro','bootcamps','/bootcamp/intro-to-lr','{"bootcamp_id":"intro-to-lr","progress":{}}');
insert into notifications(user_id,type,title,link) values
 ('20000000-0000-0000-0000-000000000001','assignment','Legacy native guided','/guided/34000000-0000-0000-0000-000000000001?returnTo=%2Fclassroom'),
 ('20000000-0000-0000-0000-000000000001','assignment','Legacy native activity','/activities/34000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000001','assignment','Legacy alias refresher','/conditional-indicators-refresher'),
 ('20000000-0000-0000-0000-000000000001','assignment','Legacy alias unless','/quick-drills/unless-drill'),
 ('20000000-0000-0000-0000-000000000001','assignment','Legacy alias abstract','/topics/abstract'),
 ('20000000-0000-0000-0000-000000000001','assignment','Legacy alias reading','/reading-center'),
 ('20000000-0000-0000-0000-000000000001','assignment','Legacy alias bootcamp','/bootcamp/intro-to-lr'),
 ('20000000-0000-0000-0000-000000000001','assignment','Legacy native TA','/classroom/ta/30000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001','assignment','Legacy native homework','/classroom/30000000-0000-0000-0000-000000000004'),
 ('20000000-0000-0000-0000-000000000001','assignment','Retired bootcamp','/bootcamp/fallacy-flaw'),
 ('20000000-0000-0000-0000-000000000001','message','Legacy inbox','/inbox');

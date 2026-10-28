-- Unapplied additive foundation only. No public mutating RPC is installed.
-- Complete section writer, linked source guards and atomic closeout must precede activation.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';

do $$ begin
  if not exists(select 1 from pg_roles where rolname='timed_section_executor') then
    create role timed_section_executor nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
  if exists(select 1 from pg_roles where rolname='timed_section_executor' and
    (rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolbypassrls))
    or pg_has_role('authenticated','timed_section_executor','MEMBER')
    or pg_has_role('anon','timed_section_executor','MEMBER') then
    raise exception 'Unsafe standalone section executor configuration';
  end if;
end $$;
grant usage on schema public to timed_section_executor;
-- No membership is granted to authenticated/anon or the PT executor.

create table public.timed_section_configuration_v1 (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  manifest_sha256 text check(manifest_sha256 ~ '^[a-f0-9]{64}$'),
  lease_ms integer not null default 30000 check(lease_ms between 10000 and 120000),
  check(not enabled or manifest_sha256 is not null)
);
insert into public.timed_section_configuration_v1(singleton) values(true);

create table public.timed_section_sittings_v1 (
  id uuid primary key,
  owner_id uuid not null references auth.users(id),
  kind text not null check(kind in ('lr','rc')),
  source_kind text not null check(source_kind='manual-canonical'),
  source_key text not null,
  pt integer not null check(pt>0),
  section integer not null check(section>0),
  manifest_sha256 text not null check(manifest_sha256 ~ '^[a-f0-9]{64}$'),
  frozen_source jsonb not null check(jsonb_typeof(frozen_source)='object'),
  frozen_qids text[] not null check(cardinality(frozen_qids)>0),
  pace text not null check(pace in ('standard','time-and-a-half','double-time','untimed')),
  budget_ms bigint check(budget_ms>0),
  lease_ms integer not null check(lease_ms between 10000 and 120000),
  phase text not null default 'ready' check(phase in ('ready','running','paused','complete','abandoned')),
  revision bigint not null default 1 check(revision>0),
  writer_epoch bigint not null default 1 check(writer_epoch>0),
  device_id text not null check(length(device_id) between 1 and 128),
  elapsed_ms bigint not null default 0 check(elapsed_ms>=0),
  clock_anchor_at timestamptz,
  lease_expires_at timestamptz,
  current_index integer not null default 0 check(current_index>=0),
  snapshot jsonb not null default '{"answers":[],"questionStates":[]}' check(jsonb_typeof(snapshot)='object'),
  result jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(id,owner_id),
  foreign key(manifest_sha256,pt) references public.timed_content_manifests_v1(manifest_sha256,pt),
  check(source_key=kind||'::pt'||pt::text||'-s'||section::text),
  check((pace='untimed')=(budget_ms is null)),
  check(budget_ms is null or budget_ms=case pace when 'standard' then 2100000 when 'time-and-a-half' then 3150000 when 'double-time' then 4200000 end),
  check(result is null or jsonb_typeof(result)='object'),
  check(current_index<cardinality(frozen_qids)),
  check((phase='running')=(clock_anchor_at is not null and lease_expires_at is not null)),
  check(phase='running' or (clock_anchor_at is null and lease_expires_at is null)),
  check((phase='complete')=(result is not null and completed_at is not null)),
  check(phase='complete' or (result is null and completed_at is null))
);
create unique index timed_section_active_source_v1
  on public.timed_section_sittings_v1(owner_id,source_kind,source_key)
  where phase in ('ready','running','paused');

create table public.timed_section_receipts_v1 (
  owner_id uuid not null,
  sitting_id uuid not null,
  command_id uuid not null,
  canonical_command jsonb not null check(jsonb_typeof(canonical_command)='object'),
  committed_revision bigint not null check(committed_revision>0),
  result jsonb not null check(jsonb_typeof(result)='object'),
  committed_at timestamptz not null default clock_timestamp(),
  primary key(owner_id,sitting_id,command_id),
  foreign key(sitting_id,owner_id) references public.timed_section_sittings_v1(id,owner_id)
);

create table public.timed_section_source_bindings_v1 (
  sitting_id uuid primary key,
  owner_id uuid not null,
  kind text not null check(kind in ('lr','rc')),
  namespace text,
  record_id text,
  rc_session_id uuid,
  foreign key(sitting_id,owner_id) references public.timed_section_sittings_v1(id,owner_id),
  check((kind='lr' and namespace='practice_sessions' and record_id='timed-section::'||sitting_id::text and rc_session_id is null)
    or (kind='rc' and namespace is null and record_id is null and rc_session_id is not null)),
  unique(owner_id,namespace,record_id),
  unique(rc_session_id)
);

create function public.guard_timed_section_foundation_v1() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare canonical jsonb;
begin
  if current_user<>'timed_section_executor' then
    raise exception 'Protected section write requires its versioned executor' using errcode='42501';
  end if;
  if TG_OP='DELETE' then raise exception 'Section authority is retained' using errcode='42501'; end if;
  if TG_TABLE_NAME='timed_section_sittings_v1' then
    if TG_OP='INSERT' then
      select leg into canonical from public.timed_content_manifests_v1 m,
        lateral jsonb_array_elements(m.blueprint->'legs') leg
        where m.manifest_sha256=NEW.manifest_sha256 and m.pt=NEW.pt
          and leg->>'kind'=NEW.kind and (leg->>'section')::integer=NEW.section;
      if canonical is null or canonical<>NEW.frozen_source
        or to_jsonb(NEW.frozen_qids)<>canonical->'qids' then
        raise exception 'Section must match the canonical catalog' using errcode='42501'; end if;
      if NEW.phase<>'ready' or NEW.revision<>1 or NEW.writer_epoch<>1 or NEW.elapsed_ms<>0
        or NEW.current_index<>0 or NEW.result is not null then
        raise exception 'Section must begin from fresh authority' using errcode='42501'; end if;
    end if;
    if TG_OP='UPDATE' then
      if row(NEW.id,NEW.owner_id,NEW.kind,NEW.source_kind,NEW.source_key,NEW.pt,NEW.section,
        NEW.manifest_sha256,NEW.frozen_source,NEW.frozen_qids,NEW.pace,NEW.budget_ms,NEW.lease_ms,NEW.created_at)
        is distinct from row(OLD.id,OLD.owner_id,OLD.kind,OLD.source_kind,OLD.source_key,OLD.pt,OLD.section,
        OLD.manifest_sha256,OLD.frozen_source,OLD.frozen_qids,OLD.pace,OLD.budget_ms,OLD.lease_ms,OLD.created_at) then
        raise exception 'Frozen section identity is immutable' using errcode='42501';
      end if;
      if OLD.phase in ('complete','abandoned') then raise exception 'Terminal section is immutable' using errcode='42501'; end if;
      if NEW.revision<>OLD.revision+1 or NEW.writer_epoch<OLD.writer_epoch or NEW.writer_epoch>OLD.writer_epoch+1
        or NEW.elapsed_ms<OLD.elapsed_ms then raise exception 'Invalid section transition' using errcode='42501'; end if;
      if NEW.device_id<>OLD.device_id and NEW.writer_epoch<>OLD.writer_epoch+1 then
        raise exception 'Device change requires a new epoch' using errcode='42501'; end if;
    end if;
  elsif TG_OP<>'INSERT' then
    raise exception 'Section receipts and bindings are append-only' using errcode='42501';
  elsif TG_TABLE_NAME='timed_section_source_bindings_v1' then
    if not exists(select 1 from public.timed_section_sittings_v1 s where s.id=NEW.sitting_id and s.owner_id=NEW.owner_id and s.kind=NEW.kind) then
      raise exception 'Binding must match the frozen section kind' using errcode='42501'; end if;
  end if;
  return NEW;
end $$;

create trigger timed_section_sitting_guard before insert or update or delete on public.timed_section_sittings_v1
  for each row execute function public.guard_timed_section_foundation_v1();
create trigger timed_section_receipt_guard before insert or update or delete on public.timed_section_receipts_v1
  for each row execute function public.guard_timed_section_foundation_v1();
create trigger timed_section_binding_guard before insert or update or delete on public.timed_section_source_bindings_v1
  for each row execute function public.guard_timed_section_foundation_v1();

alter table public.timed_section_configuration_v1 enable row level security;
alter table public.timed_section_sittings_v1 enable row level security;
alter table public.timed_section_receipts_v1 enable row level security;
alter table public.timed_section_source_bindings_v1 enable row level security;
grant select on public.timed_section_sittings_v1,public.timed_section_receipts_v1,public.timed_section_source_bindings_v1 to authenticated;
create policy section_owner_read_v1 on public.timed_section_sittings_v1 for select to authenticated using(owner_id=auth.uid());
create policy section_receipt_owner_read_v1 on public.timed_section_receipts_v1 for select to authenticated using(owner_id=auth.uid());
create policy section_binding_owner_read_v1 on public.timed_section_source_bindings_v1 for select to authenticated using(owner_id=auth.uid());
grant select,insert,update on public.timed_section_sittings_v1 to timed_section_executor;
grant select on public.timed_content_manifests_v1 to timed_section_executor;
create policy section_manifest_executor_read_v1 on public.timed_content_manifests_v1 for select to timed_section_executor using(true);
grant select,insert on public.timed_section_receipts_v1,public.timed_section_source_bindings_v1 to timed_section_executor;
create policy section_executor_v1 on public.timed_section_sittings_v1 for all to timed_section_executor using(true) with check(true);
create policy section_receipt_executor_v1 on public.timed_section_receipts_v1 for select to timed_section_executor using(true);
create policy section_receipt_executor_insert_v1 on public.timed_section_receipts_v1 for insert to timed_section_executor with check(true);
create policy section_binding_executor_v1 on public.timed_section_source_bindings_v1 for select to timed_section_executor using(true);
create policy section_binding_executor_insert_v1 on public.timed_section_source_bindings_v1 for insert to timed_section_executor with check(true);
revoke all on function public.guard_timed_section_foundation_v1() from public,authenticated,anon;

-- Capability reports unavailable until the complete writer is separately installed.
create function public.timed_section_capability_v1() returns jsonb
language sql security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('contractVersion',1,'workKind','standalone-section','enabled',false,
    'operations',jsonb_build_array('read'),'stage','foundation-only');
$$;
revoke all on function public.timed_section_capability_v1() from public,anon;
grant execute on function public.timed_section_capability_v1() to authenticated;
commit;

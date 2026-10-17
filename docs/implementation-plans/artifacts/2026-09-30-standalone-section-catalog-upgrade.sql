-- Additive standalone catalog upgrade. No configuration activation or record rewrite.
begin;
create table public.timed_section_content_manifests_v1(
  manifest_sha256 text not null check(manifest_sha256 ~ '^[0-9a-f]{64}$'),
  pt integer not null check(pt>0), kind text not null check(kind in ('lr','rc')),
  section integer not null check(section>0), definition jsonb not null,
  primary key(manifest_sha256,pt,kind,section),
  check(coalesce(jsonb_typeof(definition)='object' and definition->>'kind'=kind
    and jsonb_typeof(definition->'section')='number' and (definition->>'section')::integer=section
    and jsonb_typeof(definition->'qids')='array' and jsonb_typeof(definition->'questions')='array'
    and jsonb_array_length(definition->'qids')>0
    and jsonb_array_length(definition->'qids')=jsonb_array_length(definition->'questions')
    and (definition->>'questionCount')::integer=jsonb_array_length(definition->'qids'),false))
);
-- Copy every installed version, including hashes referenced by older sittings.
insert into public.timed_section_content_manifests_v1
select m.manifest_sha256,m.pt,leg->>'kind',(leg->>'section')::integer,leg
from public.timed_content_manifests_v1 m,lateral jsonb_array_elements(m.blueprint->'legs') leg;
do $$ begin
  if exists(select 1 from public.timed_content_manifests_v1 m,lateral jsonb_array_elements(m.blueprint->'legs') leg
    where not exists(select 1 from public.timed_section_content_manifests_v1 s where s.manifest_sha256=m.manifest_sha256 and s.pt=m.pt
      and s.kind=leg->>'kind' and s.section=(leg->>'section')::integer and s.definition=leg)) then
    raise exception 'Copied standalone definitions differ'; end if;
end $$;
create function public.guard_timed_section_catalog_v1() returns trigger
language plpgsql set search_path=pg_catalog,public as $$ begin
  raise exception 'Standalone catalog versions are immutable' using errcode='42501';
end $$;
create trigger timed_section_catalog_immutable_v1 before update or delete on public.timed_section_content_manifests_v1
for each row execute function public.guard_timed_section_catalog_v1();
revoke all on function public.guard_timed_section_catalog_v1() from public,authenticated,anon;
alter table public.timed_section_content_manifests_v1 enable row level security;
revoke all on public.timed_section_content_manifests_v1 from public,authenticated,anon,timed_section_executor;
grant select on public.timed_section_content_manifests_v1 to timed_section_executor;
create policy standalone_catalog_executor_read_v1 on public.timed_section_content_manifests_v1 for select to timed_section_executor using(true);
-- Validate new identity before dropping the old narrower FK. Existing rows remain exact.
alter table public.timed_section_sittings_v1 add constraint timed_section_catalog_source_v1
foreign key(manifest_sha256,pt,kind,section) references public.timed_section_content_manifests_v1(manifest_sha256,pt,kind,section);
do $$ declare old_fk text; matches integer; begin
  select count(*),min(conname::text) into matches,old_fk from pg_constraint where conrelid='public.timed_section_sittings_v1'::regclass
    and confrelid='public.timed_content_manifests_v1'::regclass and contype='f';
  if matches<>1 then raise exception 'Unexpected prior standalone catalog FK'; end if;
  execute format('alter table public.timed_section_sittings_v1 drop constraint %I',old_fk);
end $$;
create or replace function public.guard_timed_section_foundation_v1() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare canonical jsonb;
begin
  if current_user<>'timed_section_executor' then
    raise exception 'Protected section write requires its versioned executor' using errcode='42501';
  end if;
  if TG_OP='DELETE' then raise exception 'Section authority is retained' using errcode='42501'; end if;
  if TG_TABLE_NAME='timed_section_sittings_v1' then
    if TG_OP='INSERT' then
      select m.definition into canonical from public.timed_section_content_manifests_v1 m
        where m.manifest_sha256=NEW.manifest_sha256 and m.pt=NEW.pt
          and m.kind=NEW.kind and m.section=NEW.section;
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
-- Preserve caller effective role, preexisting membership options and schema ACL.
create temporary table standalone_catalog_membership_v1 on commit drop as
select current_user::text migration_role,m.admin_option,m.set_option,m.inherit_option,
has_schema_privilege('timed_section_executor','public','CREATE') had_schema_create,
not pg_has_role(current_user,'timed_section_executor','SET') needed_set
from(select 1) seed left join pg_auth_members m on m.roleid=(select oid from pg_roles where rolname='timed_section_executor')
and m.member=(select oid from pg_roles where rolname=current_user)
and m.grantor=(select oid from pg_roles where rolname=current_user);
grant select on standalone_catalog_membership_v1 to timed_section_executor;
do $$ declare state record; begin
 select * into state from standalone_catalog_membership_v1;
 if state.needed_set then execute format('grant timed_section_executor to %I with set true',state.migration_role); end if;
 if not state.had_schema_create then grant create on schema public to timed_section_executor; end if;
end $$;
set local role timed_section_executor;
create or replace function public.create_timed_section_v1(p_command jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
<<create_section>>
declare actor uuid:=public.timed_pt_actor_v1(); r public.timed_section_sittings_v1; rec public.timed_section_receipts_v1;
  c public.timed_section_configuration_v1; payload jsonb:=p_command->'payload'; frozen jsonb; id uuid; cid uuid;
  source_kind text; pt integer; section integer; pace text; seconds integer; at_time timestamptz;
begin
  if actor is null then raise exception 'Authentication required' using errcode='PT401'; end if;
  perform public.timed_section_validate_command_v1(p_command,true);
  perform public.timed_pt_check_keys_v1(payload,array['kind','pt','section','pace']);
  id:=(p_command->>'workId')::uuid; cid:=(p_command->>'commandId')::uuid;
  -- Serialize a missing sitting and exact creation receipt before row existence.
  perform pg_advisory_xact_lock(hashtextextended('timed-section-create:'||actor::text||':'||id::text,0));
  select * into r from public.timed_section_sittings_v1 where timed_section_sittings_v1.id=create_section.id and owner_id=actor for update;
  if found then
    select * into rec from public.timed_section_receipts_v1 where sitting_id=r.id and owner_id=actor and command_id=cid;
    if found and rec.canonical_command=p_command then return public.timed_section_response_v1(r,rec,true); end if;
    if found then raise exception 'Changed command replay' using errcode='PT412'; end if;
    raise exception 'Sitting identity already exists' using errcode='PT409';
  end if;
  select * into c from public.timed_section_configuration_v1 where singleton for share;
  if not coalesce(c.enabled,false) then raise exception 'Standalone timed writer inactive' using errcode='PT503'; end if;
  perform public.timed_section_require_access_v1(actor);
  if jsonb_typeof(payload->'kind') is distinct from 'string' or payload->>'kind' not in ('lr','rc')
    or jsonb_typeof(payload->'pt') is distinct from 'number' or payload->>'pt' !~ '^[1-9][0-9]*$'
    or jsonb_typeof(payload->'section') is distinct from 'number' or payload->>'section' !~ '^[1-9][0-9]*$'
    or jsonb_typeof(payload->'pace') is distinct from 'string' or payload->>'pace' not in ('standard','time-and-a-half','double-time','untimed') then
    raise exception 'Canonical section and pace required' using errcode='PT422'; end if;
  pt:=(payload->>'pt')::integer; section:=(payload->>'section')::integer; pace:=payload->>'pace';
  source_kind:=payload->>'kind';
  select m.definition into frozen from public.timed_section_content_manifests_v1 m
    where m.manifest_sha256=c.manifest_sha256 and m.pt=create_section.pt
      and m.kind=source_kind and m.section=create_section.section;
  if frozen is null then raise exception 'Canonical section unavailable in selected catalog' using errcode='PT422'; end if;
  seconds:=case pace when 'standard' then 2100 when 'time-and-a-half' then 3150 when 'double-time' then 4200 else null end;
  at_time:=clock_timestamp();
  insert into public.timed_section_sittings_v1(id,owner_id,kind,source_kind,source_key,pt,section,manifest_sha256,frozen_source,frozen_qids,
    pace,budget_ms,lease_ms,device_id,created_at,updated_at)
    values(id,actor,source_kind,'manual-canonical',source_kind||'::pt'||pt::text||'-s'||section::text,pt,section,c.manifest_sha256,frozen,
      array(select jsonb_array_elements_text(frozen->'qids')),pace,seconds::bigint*1000,c.lease_ms,p_command->>'deviceId',at_time,at_time) returning * into r;
  insert into public.timed_section_receipts_v1(owner_id,sitting_id,command_id,canonical_command,committed_revision,result)
    values(actor,r.id,cid,p_command,r.revision,jsonb_build_object('operation','create')) returning * into rec;
  return public.timed_section_response_v1(r,rec,false);
exception when unique_violation then raise exception 'An active sitting already owns this canonical source' using errcode='PT409';
end $$;
do $$ declare state record; begin
 select * into state from standalone_catalog_membership_v1;
 execute format('set local role %I',state.migration_role);
end $$;
do $$ declare state record; begin
 select * into state from standalone_catalog_membership_v1;
 if not state.had_schema_create then revoke create on schema public from timed_section_executor; end if;
 if state.needed_set and state.admin_option is null then execute format('revoke timed_section_executor from %I',state.migration_role);
 elsif state.needed_set then
  execute format('grant timed_section_executor to %I with set %s',state.migration_role,case when state.set_option then 'true' else 'false' end);
  execute format('grant timed_section_executor to %I with inherit %s',state.migration_role,case when state.inherit_option then 'true' else 'false' end);
 end if;
end $$;
commit;

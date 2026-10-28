// Generate a companion upgrade without rewriting any already deployed artifact.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const directory=resolve('docs/implementation-plans/artifacts');
const foundation=readFileSync(resolve(directory,'2026-09-30-standalone-timed-control-foundation.sql'),'utf8');
const writer=readFileSync(resolve(directory,'2026-09-30-standalone-timed-writer.sql'),'utf8');
function replaceOnce(source,before,after) {
  if(source.split(before).length!==2) throw new Error('Reviewed catalog replacement boundary changed');
  return source.replace(before,after);
}
let guard=foundation.match(/create function public\.guard_timed_section_foundation_v1\(\)[\s\S]*?end \$\$;/)?.[0];
let create=writer.match(/create function public\.create_timed_section_v1\(p_command jsonb\)[\s\S]*?end \$\$;/)?.[0];
if(!guard||!create) throw new Error('Missing installed standalone function boundary');
guard=replaceOnce(guard,`select leg into canonical from public.timed_content_manifests_v1 m,
        lateral jsonb_array_elements(m.blueprint->'legs') leg
        where m.manifest_sha256=NEW.manifest_sha256 and m.pt=NEW.pt
          and leg->>'kind'=NEW.kind and (leg->>'section')::integer=NEW.section;`,`select m.definition into canonical from public.timed_section_content_manifests_v1 m
        where m.manifest_sha256=NEW.manifest_sha256 and m.pt=NEW.pt
          and m.kind=NEW.kind and m.section=NEW.section;`);
create=replaceOnce(create,`select leg into frozen from public.timed_content_manifests_v1 m,lateral jsonb_array_elements(m.blueprint->'legs') leg
    where m.manifest_sha256=c.manifest_sha256 and m.pt=create_section.pt
      and leg->>'kind'=source_kind and (leg->>'section')::integer=create_section.section;`,`select m.definition into frozen from public.timed_section_content_manifests_v1 m
    where m.manifest_sha256=c.manifest_sha256 and m.pt=create_section.pt
      and m.kind=source_kind and m.section=create_section.section;`);
guard=guard.replace('create function','create or replace function');create=create.replace('create function','create or replace function');
const sql=`-- Additive standalone catalog upgrade. No configuration activation or record rewrite.
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
${guard}
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
${create}
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
`;
const output=resolve(directory,'2026-09-30-standalone-section-catalog-upgrade.sql');
if(process.argv.includes('--check')) {
 if(readFileSync(output,'utf8')!==sql) throw new Error('Standalone catalog upgrade is stale');
} else writeFileSync(output,sql);
console.log(JSON.stringify({output,configurationChanged:false,prepTestChanged:false,check:process.argv.includes('--check')}));

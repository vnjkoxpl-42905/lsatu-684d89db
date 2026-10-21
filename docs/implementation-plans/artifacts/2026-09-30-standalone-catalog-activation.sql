-- Reviewed standalone-only catalog selection. Does not enable a disabled writer.
-- Parent executes only after installed content proof and frontend verification.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.timed_section_content_manifests_v1,public.timed_content_manifests_v1 in share mode;
do $activate$ declare
  old_hash constant text := 'c27b478f2d50f8353a98d4a1a905d2f94f87929ba2ea2179230d4f7a3d51c25c';
  new_hash constant text := '714b27008d5c301c660d830d59562cc69814d06baae9d1e767240bece48b0c95';
  expected_digest constant text := '86e8ed3eef6936e488684e07fcd68017';
  section_before public.timed_section_configuration_v1;
  pt_before public.timed_pt_configuration_v1;
  count_sections integer; actual_digest text; changed integer;
begin
  select * into section_before from public.timed_section_configuration_v1 where singleton for update;
  select * into pt_before from public.timed_pt_configuration_v1 where singleton for share;
  if section_before.manifest_sha256 is distinct from old_hash or not section_before.enabled or section_before.lease_ms<>30000 then
    raise exception 'Standalone configuration changed; activation aborted'; end if;
  if pt_before.manifest_sha256 is distinct from old_hash or not pt_before.enabled or pt_before.lease_ms<>30000 then
    raise exception 'Full PrepTest configuration changed; activation aborted'; end if;
  select count(*),md5(string_agg(md5(definition::text),'' order by pt,kind,section))
    into count_sections,actual_digest from public.timed_section_content_manifests_v1 where manifest_sha256=new_hash;
  if count_sections<>236 or actual_digest is distinct from expected_digest then
    raise exception 'Installed standalone definitions differ; activation aborted'; end if;
  if exists(select 1 from public.timed_content_manifests_v1 m,lateral jsonb_array_elements(m.blueprint->'legs') leg
    where not exists(select 1 from public.timed_section_content_manifests_v1 s where s.manifest_sha256=m.manifest_sha256
      and s.pt=m.pt and s.kind=leg->>'kind' and s.section=(leg->>'section')::integer and s.definition=leg)) then
    raise exception 'Old catalog preservation differs; activation aborted'; end if;
  if exists(select 1 from public.timed_section_sittings_v1 r where not exists(select 1 from public.timed_section_content_manifests_v1 s
    where s.manifest_sha256=r.manifest_sha256 and s.pt=r.pt and s.kind=r.kind and s.section=r.section and s.definition=r.frozen_source)) then
    raise exception 'Existing frozen section differs; activation aborted'; end if;
  update public.timed_section_configuration_v1 set manifest_sha256=new_hash
    where singleton and manifest_sha256=old_hash and enabled=section_before.enabled and lease_ms=section_before.lease_ms;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'Standalone configuration CAS failed'; end if;
  if (select to_jsonb(c) from public.timed_pt_configuration_v1 c where singleton) is distinct from to_jsonb(pt_before) then
    raise exception 'Full PrepTest configuration changed'; end if;
end $activate$;
select to_jsonb(c) standalone_configuration from public.timed_section_configuration_v1 c;
select to_jsonb(c) unchanged_pt_configuration from public.timed_pt_configuration_v1 c;
commit;

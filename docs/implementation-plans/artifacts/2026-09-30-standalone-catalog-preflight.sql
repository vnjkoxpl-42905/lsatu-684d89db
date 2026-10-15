-- Read-only fresh baseline. Compare with post-install snapshot.
with preserved as (
select 'practice_test_runs' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.practice_test_runs t
union all
select 'attempts' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.attempts t
union all
select 'bootcamp_kv' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.bootcamp_kv t
union all
select 'section_history' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.section_history t
union all
select 'rc_drill_sessions' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.rc_drill_sessions t
union all
select 'rc_attempts' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.rc_attempts t
union all
select 'wrong_answer_journal' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.wrong_answer_journal t
union all
select 'profiles' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.profiles t
union all
select 'user_roles' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.user_roles t
union all
select 'practice_test_assignments' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.practice_test_assignments t
union all
select 'timed_pt_configuration_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.timed_pt_configuration_v1 t
union all
select 'timed_content_manifests_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.timed_content_manifests_v1 t
union all
select 'timed_pt_receipts_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.timed_pt_receipts_v1 t
union all
select 'timed_pt_lr_bindings_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.timed_pt_lr_bindings_v1 t
union all
select 'timed_section_configuration_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.timed_section_configuration_v1 t
union all
select 'timed_section_sittings_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.timed_section_sittings_v1 t
union all
select 'timed_section_receipts_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.timed_section_receipts_v1 t
union all
select 'timed_section_source_bindings_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.timed_section_source_bindings_v1 t
union all
select 'review_episodes_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.review_episodes_v1 t
union all
select 'review_episode_events_v1' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.review_episode_events_v1 t
union all
select 'intro_lr_attempts' table_name,count(*) row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public.intro_lr_attempts t
), unchanged_functions as (
 select md5(coalesce(string_agg(pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')||p.proowner::text,'' order by p.oid),'')) digest
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'
 and p.proname not in ('create_timed_section_v1','guard_timed_section_foundation_v1','guard_timed_section_catalog_v1')
), unchanged_policies as (
 select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by tablename,policyname),'')) digest
 from pg_policies p where schemaname='public' and tablename<>'timed_section_content_manifests_v1'
), memberships as (
 select md5(coalesce(string_agg(to_jsonb(m)::text,'' order by oid),'')) digest from pg_auth_members m
 where roleid in(select oid from pg_roles where rolname in ('timed_pt_executor','timed_section_executor'))
)
select jsonb_build_object(
 'preservedTables',(select jsonb_agg(to_jsonb(p) order by table_name) from preserved p),
 'unchangedFunctions',(select digest from unchanged_functions),
 'unchangedPolicies',(select digest from unchanged_policies),
 'executorMemberships',(select digest from memberships),
 'publicSchemaAcl',(select nspacl::text from pg_namespace where nspname='public'),
 'ptConfiguration',(select to_jsonb(c) from public.timed_pt_configuration_v1 c),
 'sectionConfiguration',(select to_jsonb(c) from public.timed_section_configuration_v1 c),
 'ordinaryExecutorSet',pg_has_role('authenticated','timed_section_executor','SET'),
 'ordinaryExecutorInherit',pg_has_role('authenticated','timed_section_executor','USAGE'),
 'standaloneSittingCount',(select count(*) from public.timed_section_sittings_v1),
 'standaloneCatalogExists',to_regclass('public.timed_section_content_manifests_v1') is not null
 ) preservation_snapshot;

-- READ-ONLY post-deployment inspection. No deletion or permission changes.
select to_regclass('public.rc_recall_passage_progress') as progress_table;
select c.relrowsecurity, c.relforcerowsecurity, c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='rc_recall_passage_progress';

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='rc_recall_passage_progress'
order by policyname;
-- Expected: owner/admin SELECT, entitled unfinished-owner INSERT/UPDATE,
-- no DELETE policy. Explicit table ACL excludes DELETE for authenticated/anon.
select grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='rc_recall_passage_progress'
order by grantee,privilege_type;

select p.proname, p.prosecdef as security_definer, p.proacl,
 pg_get_functiondef(p.oid) as deployed_definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('save_rc_recall_passage_progress','rc_recall_passage_progress_guard');
-- Expected RPC: SECURITY INVOKER, auth.uid() owner filter, current entitlement,
-- selected passage/position validation, attempt FOR SHARE lock, advisory retry
-- lock, completed-row return, no new progress on a finished attempt.

select t.tgname,t.tgenabled from pg_trigger t
where t.tgrelid=to_regclass('public.rc_recall_passage_progress') and not t.tgisinternal;
select conname,pg_get_constraintdef(oid) as constraint_definition
from pg_constraint where conrelid=to_regclass('public.rc_recall_passage_progress');

-- Compare these counts before/after deployment; the additive migration must not
-- remove or rewrite existing attempts, recaps, captures or grades.
select 'attempts' as relation,count(*) from public.rc_recall_attempts
union all select 'recaps',count(*) from public.rc_recall_recaps
union all select 'captures',count(*) from public.rc_recall_captures
union all select 'grades',count(*) from public.rc_recall_grades;

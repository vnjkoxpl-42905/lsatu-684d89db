-- Tag acceptance on configured tester only. All tag/metadata writes roll back.
begin;
create temp table rc_tag_results(name text,passed boolean);
grant select,insert on rc_tag_results to authenticated;
create or replace function pg_temp.rc_tag_assert(p_name text,p_passed boolean)
returns void language plpgsql as $$ begin
  if p_passed is distinct from true then raise exception 'RC tag assertion failed: %',p_name; end if;
  insert into rc_tag_results values(p_name,true);
end; $$;
create or replace function pg_temp.rc_tag_error(p_sql text,p_code text)
returns boolean language plpgsql as $$ declare actual text; begin
  execute p_sql; return false;
exception when others then
  get stacked diagnostics actual=returned_sqlstate;
  return actual=p_code;
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','d763bfe6-d710-4c4b-90ff-4b3a20929211',true);
select set_config('request.jwt.claims','{"sub":"d763bfe6-d710-4c4b-90ff-4b3a20929211","role":"authenticated"}',true);
select pg_temp.rc_tag_assert('tester has current assigned access',public.has_reading_center_access());
select pg_temp.rc_tag_assert('temporary fixture names absent before probe',(
  select count(*)=0 from public.reading_center_tags where user_id=auth.uid()
    and name in ('RC Probe Original 20261013','RC Probe Target 20261013','RC Probe Renamed 20261013')
));
insert into public.reading_center_tags(user_id,name,color) values
  (auth.uid(),'RC Probe Original 20261013',1),(auth.uid(),'RC Probe Target 20261013',2);
insert into public.reading_center_passage_metadata(user_id,passage_id,tags)
select auth.uid(),id,array['RC Probe Original 20261013','RC Probe Target 20261013']
from public.reading_center_passages where slug='living-in-a-rational-society'
on conflict(user_id,passage_id) do update set tags=excluded.tags;

select public.reading_center_rename_tag('RC Probe Original 20261013','RC Probe Original 20261013',24);
select pg_temp.rc_tag_assert('same-name maximum color updates without renaming',(
  select color=24 from public.reading_center_tags where user_id=auth.uid() and name='RC Probe Original 20261013'
));
select public.reading_center_rename_tag('RC Probe Original 20261013','RC Probe Original 20261013',0);
select pg_temp.rc_tag_assert('same-name minimum color updates without renaming',(
  select color=0 from public.reading_center_tags where user_id=auth.uid() and name='RC Probe Original 20261013'
));
select pg_temp.rc_tag_assert('duplicate target rejects with unique violation',pg_temp.rc_tag_error(
  $q$select public.reading_center_rename_tag('RC Probe Original 20261013','RC Probe Target 20261013',5)$q$,'23505'));
select pg_temp.rc_tag_assert('duplicate rejection preserves both tag names and colors',(
  select count(*)=2 and bool_and(case name when 'RC Probe Original 20261013' then color=0 else color=2 end)
  from public.reading_center_tags where user_id=auth.uid() and name in ('RC Probe Original 20261013','RC Probe Target 20261013')
));
select pg_temp.rc_tag_assert('duplicate rejection preserves passage tag array',(
  select m.tags=array['RC Probe Original 20261013','RC Probe Target 20261013']
  from public.reading_center_passage_metadata m join public.reading_center_passages p on p.id=m.passage_id
  where m.user_id=auth.uid() and p.slug='living-in-a-rational-society'
));

select pg_temp.rc_tag_assert('unknown source tag rejected',pg_temp.rc_tag_error(
  $q$select public.reading_center_rename_tag('RC Probe Missing 20261013','New name',5)$q$,'22023'));
select pg_temp.rc_tag_assert('blank name rejected',pg_temp.rc_tag_error(
  $q$select public.reading_center_rename_tag('RC Probe Original 20261013','  ',5)$q$,'22023'));
select pg_temp.rc_tag_assert('overlength name rejected',pg_temp.rc_tag_error(
  $q$select public.reading_center_rename_tag('RC Probe Original 20261013',repeat('x',101),5)$q$,'22023'));
select pg_temp.rc_tag_assert('negative color rejected',pg_temp.rc_tag_error(
  $q$select public.reading_center_rename_tag('RC Probe Original 20261013','RC Probe Original 20261013',-1)$q$,'22023'));
select pg_temp.rc_tag_assert('color above maximum rejected',pg_temp.rc_tag_error(
  $q$select public.reading_center_rename_tag('RC Probe Original 20261013','RC Probe Original 20261013',25)$q$,'22023'));
select pg_temp.rc_tag_assert('null color rejected',pg_temp.rc_tag_error(
  $q$select public.reading_center_rename_tag('RC Probe Original 20261013','RC Probe Original 20261013',null)$q$,'22023'));

select public.reading_center_rename_tag('RC Probe Original 20261013','  RC Probe Renamed 20261013  ',7);
select pg_temp.rc_tag_assert('new name trimmed and source removed',(
  select count(*)=1 and bool_and(name='RC Probe Renamed 20261013' and color=7)
  from public.reading_center_tags where user_id=auth.uid() and name in ('RC Probe Original 20261013','RC Probe Renamed 20261013')
));
select pg_temp.rc_tag_assert('new name propagated into passage metadata preserving other tag',(
  select cardinality(m.tags)=2 and 'RC Probe Renamed 20261013'=any(m.tags) and 'RC Probe Target 20261013'=any(m.tags)
    and not 'RC Probe Original 20261013'=any(m.tags)
  from public.reading_center_passage_metadata m join public.reading_center_passages p on p.id=m.passage_id
  where m.user_id=auth.uid() and p.slug='living-in-a-rational-society'
));
reset role;
select pg_temp.rc_tag_assert('all expected tag assertions executed',(select count(*)=15 from rc_tag_results));
rollback;
select '16 live tag assertions passed; all tag and metadata fixture writes rolled back' as result,
  (select count(*) from public.reading_center_tags where user_id='d763bfe6-d710-4c4b-90ff-4b3a20929211'
    and name in ('RC Probe Original 20261013','RC Probe Target 20261013','RC Probe Renamed 20261013')) as remaining_tag_fixtures,
  (select jsonb_agg(jsonb_build_object('id',id,'source_table',source_table,'source_id',source_id,
    'visible_to_student',visible_to_student,'status',status,'unlock_at',unlock_at))
    from public.classroom_items where student_id='d763bfe6-d710-4c4b-90ff-4b3a20929211'
      and source_table='reading_center' and source_id='library') as tester_assignment_readback;

-- Proposal only. Review and authorize the exact SQL before managed execution.
-- Retain existing function owner, grants and security configuration.
begin;

do $patch$
declare
  current_definition text := pg_get_functiondef(
    'public.timed_section_close_v1(public.timed_section_sittings_v1,jsonb,timestamptz)'::regprocedure
  );
  previous_expression text := $old$case when data ? 'regulation_answered_qids' then not data->'regulation_answered_qids' ? (q->>'qid') else null end$old$;
  intended_expression text := $new$case when data ? 'regulation_answered_qids' then a is not null and not (data->'regulation_answered_qids' ? (q->>'qid')) else null end$new$;
begin
  if strpos(current_definition, intended_expression) > 0 then
    return;
  end if;

  if length(current_definition) - length(replace(current_definition, previous_expression, ''))
     <> length(previous_expression) then
    raise exception 'Protected close-out definition differs from the reviewed expression';
  end if;

  execute replace(current_definition, previous_expression, intended_expression);
end
$patch$;

commit;

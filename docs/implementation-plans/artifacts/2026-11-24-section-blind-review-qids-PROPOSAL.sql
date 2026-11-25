-- PROPOSAL ONLY. Review against the deployed schema and roles before execution.
-- Deploy this read function before the client that uses it for assigned BR.
-- The result preserves the close-out order and has no answers, scores or diagnosis.
begin;

create or replace function public.section_blind_review_qids_v1(p_history_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select jsonb_agg(q->>'qid' order by position)
    from public.section_history h
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(h.questions_json) = 'array' then h.questions_json
           else '[]'::jsonb end
    ) with ordinality as questions(q, position)
    where h.id = p_history_id
      and h.user_id = auth.uid()
      and h.mode = 'full-section'
      and h.completed_at is not null
      and h.practice_test_run_id is null
      and h.release_requires_br is true
      and jsonb_typeof(q->'qid') = 'string'
  ), '[]'::jsonb);
$$;

revoke all on function public.section_blind_review_qids_v1(uuid) from public, anon;
grant execute on function public.section_blind_review_qids_v1(uuid) to authenticated;

commit;

-- Verify as the owner that the order matches the saved snapshot, including
-- after changing the assignment question list. Verify a non-owner gets [],
-- unauthenticated calls are denied, and practice-test legs return [].
-- For sealed BR, the existing write RPC grades the review against the saved
-- snapshot. The client derives diagnosis only after release. Persisting that
-- diagnosis needs a separate approved server contract.

-- PROPOSAL ONLY (DO NOT RUN WITHOUT JOSHUA'S APPROVAL)
-- Finding F1: Server-enforced seal for assigned sections and unfinished practice-test legs.
--
-- Why this is needed (tradeoffs in plain words):
-- Today `public.section_history` has an owner SELECT policy that lets any signed-in
-- student query their own rows directly with the Supabase JS client. Even though the
-- app now uses a two-step fetch (`fetchOwnedSectionReport`) so the UI never downloads
-- outcome columns while a section is sealed, a student who calls the database REST API
-- directly with their own browser login token could still read `initial_score`,
-- `questions_json`, or `analysis_json` on a sealed row.
--
-- Tradeoff:
-- Option A (recommended below): Tighten the owner SELECT policy on `public.section_history`
-- (or move direct reads behind a security-definer projection) so direct REST queries can
-- read outcome columns ONLY when the row is released (not an incomplete practice-test run
-- and not `release_requires_br = true` without a completed `section_review_records` row).
-- Expose `get_owned_section_report_v1(p_history_id uuid)` as the single authoritative
-- server function that returns metadata-only when sealed, and the full row + review
-- record only when released.
--
-- Note: Tightening `section_history` owner SELECT RLS to hide sealed rows completely from
-- direct `select()` means all client list readers (`SectionHistoryList`, `practiceSectionAttempts`,
-- `firstAnswerSources`, `RecentPerformanceWidget`) would also automatically stop receiving
-- sealed rows at the database layer; `get_owned_section_report_v1` would supply the safe
-- non-outcome shell (`id`, `pt`, `section`, `completed_at`, `reason`, `question_qids`) so the
-- student can still launch "Do blind review" on `/review/section/:historyId`.

create or replace function public.get_owned_section_report_v1(p_history_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  row_ public.section_history;
  rec public.section_review_records;
  pt_status text;
  is_sealed boolean := false;
  seal_reason text := null;
  qids text[] := array[]::text[];
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select * into row_
  from public.section_history
  where id = p_history_id
    and user_id = uid
    and mode = 'full-section'
    and completed_at is not null;

  if row_.id is null then
    return jsonb_build_object('state', 'not-found');
  end if;

  if row_.practice_test_run_id is not null then
    select status into pt_status
    from public.practice_test_runs
    where id = row_.practice_test_run_id
      and user_id = uid;

    if pt_status is distinct from 'complete' then
      is_sealed := true;
      seal_reason := 'practice-test';
    end if;
  end if;

  select * into rec
  from public.section_review_records
  where history_id = row_.id
    and user_id = uid;

  if not is_sealed and coalesce(row_.release_requires_br, false) then
    if rec.br_completed_at is null or jsonb_typeof(rec.br_results) is distinct from 'array' then
      is_sealed := true;
      seal_reason := 'blind-review';
    end if;
  end if;

  if is_sealed then
    if seal_reason = 'blind-review' and row_.assignment_id is not null then
      select coalesce(ha.question_qids, array[]::text[]) into qids
      from public.homework_assignments ha
      where ha.id::text = row_.assignment_id
        and ha.student_id = uid;
    end if;

    return jsonb_build_object(
      'state', 'sealed',
      'reason', seal_reason,
      'id', row_.id,
      'pt', row_.pt,
      'section', row_.section,
      'completed_at', row_.completed_at,
      'question_qids', coalesce(qids, array[]::text[])
    );
  end if;

  return jsonb_build_object(
    'state', 'released',
    'row', to_jsonb(row_),
    'review_record', case when rec.history_id is null then null else to_jsonb(rec) end
  );
end $$;

revoke all on function public.get_owned_section_report_v1(uuid) from public, anon;
grant execute on function public.get_owned_section_report_v1(uuid) to authenticated;

-- Optional RLS tightening (apply only after switching all client list readers off direct sealed-row reads):
-- drop policy if exists section_history_owner_read on public.section_history;
-- create policy section_history_owner_read on public.section_history
--   for select to authenticated
--   using (
--     user_id = auth.uid()
--     and (
--       practice_test_run_id is null
--       or exists (
--         select 1 from public.practice_test_runs ptr
--         where ptr.id = practice_test_run_id and ptr.user_id = auth.uid() and ptr.status = 'complete'
--       )
--     )
--     and (
--       coalesce(release_requires_br, false) = false
--       or exists (
--         select 1 from public.section_review_records srr
--         where srr.history_id = id and srr.user_id = auth.uid() and srr.br_completed_at is not null
--       )
--     )
--   );

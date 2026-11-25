-- Proposal for PR #291 N4. Requires Joshua's approval before database execution.
-- Apply after the standalone section schema and before publishing the matching client.
-- Records completion from the authenticated owner's immutable close-out winner.
-- The acknowledgment contains no scores, answers, or assessment data.

begin;

create or replace function public.reconcile_standalone_section_v1(
  p_sitting_id uuid,
  p_history_id uuid
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  sitting public.standalone_section_sittings;
  saved public.section_history;
  storage_key text;
  hash_input text;
  forward_hash bigint := 2166136261;
  reverse_hash bigint := 2166136261;
  resume_id text;
  queue jsonb;
  answers jsonb := '[]'::jsonb;
  closed_resume jsonb;
  released boolean;
  canonical_score numeric;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into sitting from public.standalone_section_sittings
  where id = p_sitting_id and user_id = uid;
  if not found then
    raise exception 'section unavailable' using errcode = '42501';
  end if;
  -- Same lock and re-read order as open, restart, and close-out.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || '|' || sitting.pool_key, 0));
  select * into sitting from public.standalone_section_sittings
  where id = p_sitting_id and user_id = uid;
  if not found or sitting.state <> 'closed' or sitting.history_id is distinct from p_history_id then
    raise exception 'section unavailable' using errcode = '42501';
  end if;
  select * into saved from public.section_history
  where id = p_history_id and user_id = uid and client_sitting_id = sitting.id
    and timed_section_sitting_id is null and practice_test_run_id is null and mode = 'full-section';
  if not found then
    raise exception 'section unavailable' using errcode = '42501';
  end if;
  released := not coalesce(saved.release_requires_br, false) or exists (
    select 1 from public.section_review_records r
    where r.history_id = saved.id and r.user_id = uid and r.br_completed_at is not null
      and jsonb_typeof(r.br_results) = 'array'
  );

  storage_key := sitting.pool_key || '#' ||
    case when sitting.adopted_from_record_id is not null then 'adopted-g1' else sitting.id::text end;
  hash_input := uid::text || '::' || storage_key;
  -- Matches practiceSessionIdFor for the ASCII alphabet accepted by pool_key.
  for char_index in 1..length(hash_input) loop
    forward_hash := ((forward_hash # ascii(substr(hash_input, char_index, 1))) * 16777619) & 4294967295;
    reverse_hash := ((reverse_hash # ascii(substr(hash_input, length(hash_input) - char_index + 1, 1))) * 16777619) & 4294967295;
  end loop;
  resume_id := '00000000-0000-4000-8000-' ||
    lpad(to_hex(forward_hash), 8, '0') || left(lpad(to_hex(reverse_hash), 8, '0'), 4);

  select coalesce(jsonb_agg(q->'qid' order by ordinal), '[]'::jsonb) into queue
  from jsonb_array_elements(saved.questions_json) with ordinality as questions(q, ordinal);

  -- Ordinary bootcamp_kv requests can read the completion marker. Keep all
  -- scored content of a sealed sitting in the release-aware report record.
  if released then
    select coalesce(jsonb_agg(jsonb_build_object(
      'qid', q->'qid',
      'selected_answer', q->'initialAnswer',
      'correct', q->'initialCorrect',
      'time_ms', greatest(0, coalesce(round((q->>'timeMs')::numeric), 0)),
      'switch_count', greatest(0, coalesce((q->>'switchCount')::integer, 0)),
      'flagged', coalesce((q->>'flagged')::boolean, false)
    ) order by ordinal), '[]'::jsonb) into answers
    from jsonb_array_elements(saved.questions_json) with ordinality as questions(q, ordinal)
    where q->>'initialAnswer' in ('A', 'B', 'C', 'D', 'E');
  end if;

  closed_resume := jsonb_build_object(
    'id', resume_id,
    'user_id', uid,
    'pool_slug', storage_key,
    'completion_id', storage_key,
    'data_version', 2,
    'question_queue', queue,
    'current_index', greatest(jsonb_array_length(queue) - 1, 0),
    'attempts', answers,
    'status', 'completed',
    'started_at', to_char(sitting.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updated_at', to_char(sitting.closed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  insert into public.bootcamp_kv as kv (user_id, table_name, record_id, data)
  values (uid, 'practice_sessions', resume_id, closed_resume)
  on conflict (user_id, table_name, record_id) do update set data = excluded.data
  where kv.data is distinct from excluded.data;

  if saved.assignment_id is not null then
    if released then
      canonical_score := least(100, greatest(0,
        coalesce(round(100 * saved.initial_score::numeric / nullif(saved.initial_total, 0), 2), 0)));
    end if;
    update public.homework_assignments a
    set status = 'completed', completed_at = sitting.closed_at,
      score = canonical_score
    where a.id::text = saved.assignment_id and a.student_id = uid
      and (a.status <> 'completed'
        or (a.completed_at = sitting.closed_at and a.score is null and canonical_score is not null));

    update public.weekly_plan_items i set status = 'completed'
    where i.student_id = uid and i.status <> 'completed'
      and i.metadata_json->'action'->>'ref_id' = saved.assignment_id;
  end if;

  update public.classroom_items c set status = 'completed', completed_at = sitting.closed_at
  where c.student_id = uid and c.status in ('assigned', 'in_progress')
    and c.visible_to_student and c.created_at <= sitting.closed_at
    and (c.unlock_at is null or c.unlock_at <= sitting.closed_at)
    and (
      (c.source_table = 'homework_assignments' and c.source_id = saved.assignment_id)
      or (c.source_table is distinct from 'homework_assignments' and c.type = 'homework'
        and c.metadata_json->>'kind' = 'timed_section'
        and c.metadata_json->'pt' = to_jsonb(saved.pt)
        and c.metadata_json->'section' = to_jsonb(saved.section)
        and coalesce(c.metadata_json->>'section_kind', 'lr') = 'lr')
    );

  return jsonb_build_object('status', 'reconciled');
end $$;

revoke all on function public.reconcile_standalone_section_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reconcile_standalone_section_v1(uuid, uuid) to authenticated;

-- New closes reconcile in the original transaction, including when the
-- browser never receives the response. The callable RPC repairs older
-- committed closes and confirms the same result on retries.
create or replace function public.reconcile_standalone_section_on_close_v1()
returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() = new.user_id then
    perform public.reconcile_standalone_section_v1(new.id, new.history_id);
  end if;
  return new;
end $$;
revoke all on function public.reconcile_standalone_section_on_close_v1() from public, anon, authenticated;

drop trigger if exists reconcile_standalone_section_on_close on public.standalone_section_sittings;
create trigger reconcile_standalone_section_on_close
after update of state on public.standalone_section_sittings
for each row when (old.state = 'open' and new.state = 'closed')
execute function public.reconcile_standalone_section_on_close_v1();

-- The same transaction that records blind review releases the grade for the
-- owner's completed homework. No score is written to the ordinary homework
-- row while the section is sealed.
create or replace function public.reconcile_standalone_section_after_br_v1()
returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  sitting_id uuid;
begin
  if auth.uid() is distinct from new.user_id or new.br_completed_at is null
      or jsonb_typeof(new.br_results) is distinct from 'array' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.br_completed_at is not null and jsonb_typeof(old.br_results) = 'array' then
      return new;
    end if;
  end if;
  select h.client_sitting_id into sitting_id from public.section_history h
  where h.id = new.history_id and h.user_id = new.user_id and h.release_requires_br is true
    and h.assignment_id is not null and h.practice_test_run_id is null and h.timed_section_sitting_id is null;
  if sitting_id is not null then
    perform public.reconcile_standalone_section_v1(sitting_id, new.history_id);
  end if;
  return new;
end $$;
revoke all on function public.reconcile_standalone_section_after_br_v1() from public, anon, authenticated;

drop trigger if exists reconcile_standalone_section_after_br on public.section_review_records;
create trigger reconcile_standalone_section_after_br
after insert or update of br_completed_at, br_results on public.section_review_records
for each row execute function public.reconcile_standalone_section_after_br_v1();

commit;

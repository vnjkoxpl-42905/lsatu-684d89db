-- Forward migration for the deployed 0049_teacher_transcript_assignment.
begin;

alter table public.homework_assignments
  add column section_timing_mode text
  check (section_timing_mode in ('35', '52.5', '70', 'unlimited')),
  add column section_kind text,
  add column section_preptest integer,
  add column section_number integer,
  add column section_manifest_sha256 text,
  add constraint homework_assignment_section_source_check check (
    (section_kind is null and section_preptest is null and section_number is null and section_manifest_sha256 is null)
    or
    (section_kind is not null and section_kind = 'rc' and section_preptest is not null
      and section_number is not null and section_manifest_sha256 is not null
      and section_timing_mode is not null and section_preptest between 1 and 999 and section_number between 1 and 4
      and coalesce(cardinality(question_qids), 0) > 0)
  ),
  add constraint homework_assignment_section_source_fk foreign key (
    section_manifest_sha256, section_preptest, section_kind, section_number
  ) references public.timed_section_content_manifests_v1 (manifest_sha256, pt, kind, section);

create function public.guard_homework_assignment_section_timing()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.section_timing_mode is distinct from old.section_timing_mode then
    raise exception 'Assigned section timing is immutable' using errcode = '42501';
  end if;
  if (new.section_kind, new.section_preptest, new.section_number, new.section_manifest_sha256)
    is distinct from (old.section_kind, old.section_preptest, old.section_number, old.section_manifest_sha256)
    or (old.section_kind = 'rc' and new.question_qids is distinct from old.question_qids) then
    raise exception 'Assigned section source is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger homework_assignment_section_timing_immutable
  before update of section_timing_mode, section_kind, section_preptest, section_number, section_manifest_sha256, question_qids
  on public.homework_assignments
  for each row execute function public.guard_homework_assignment_section_timing();

-- Share only the active RC addresses with the authenticated teacher endpoint.
create function public.teacher_transcript_rc_catalog()
returns table(preptest integer, section integer, kind text)
language sql stable security definer set search_path = public, pg_temp as $$
  select m.pt, m.section, m.kind::text
  from timed_section_configuration_v1 configuration
  join timed_section_content_manifests_v1 m on m.manifest_sha256 = configuration.manifest_sha256
  where configuration.singleton and configuration.enabled and m.kind = 'rc'
    and not exists (
      select from timed_section_content_manifests_v1 conflicting
      where conflicting.manifest_sha256 = m.manifest_sha256 and conflicting.pt = m.pt
        and conflicting.section = m.section and conflicting.kind <> m.kind
    )
  order by m.pt, m.section;
$$;
revoke all on function public.teacher_transcript_rc_catalog() from public, anon, authenticated;
grant execute on function public.teacher_transcript_rc_catalog() to service_role;

drop function public.teacher_transcript_assignment(
  uuid, uuid, text, text, uuid, integer, integer, integer, text, uuid, uuid, integer
);

create function public.teacher_transcript_assignment(
  p_owner uuid, p_session uuid, p_document text, p_hash text,
  p_student uuid, p_source_revision integer, p_pt integer default null,
  p_section integer default null, p_excerpt text default null,
  p_accept uuid default null, p_replace uuid default null, p_selected_section integer default null,
  p_selected_pt integer default null, p_timing_mode text default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  source teacher_post_session_tasks%rowtype;
  preview teacher_transcript_assignment_previews%rowtype;
  snapshot jsonb;
  canonical text[];
  consecutive boolean;
  rc_definition jsonb;
  rc_manifest_sha256 text;
  catalog jsonb;
  default_timing_mode text;
  timing_mode text;
  assignment_id uuid;
  route text;
  result jsonb;
  corrected boolean := false;
begin
  if not exists (select from user_roles where user_id = p_owner and role = 'admin') then
    raise exception 'Teacher access required';
  end if;

  -- One transaction can update the current preview or create its assignment at a time.
  select * into source from teacher_post_session_tasks
    where id = p_session and owner_id = p_owner for update;
  if not found then raise exception 'Session unavailable'; end if;

  select * into preview from teacher_transcript_assignment_previews
    where session_id = source.id and superseded_at is null;
  if preview.receipt is not null then
    if p_replace is not null or (p_accept is not null and p_accept <> preview.id) then
      raise exception 'Preview changed';
    end if;
    return to_jsonb(preview);
  end if;

  if source.source_state <> 'ended' or source.match_state <> 'matched'
    or source.transcript_status <> 'linked' or source.transcript_source is distinct from 'auto'
    or source.student_id is distinct from p_student
    or source.transcript_doc_id is distinct from p_document
    or source.revision is distinct from p_source_revision then
    raise exception 'Session changed';
  end if;

  select case lsat_accommodation
    when 'accommodation_53' then '52.5'
    when 'accommodation_70' then '70'
    else '35'
  end into default_timing_mode
  from profiles where class_id = p_student::text and has_classroom_access and archived_at is null
  for share;
  if not found or exists (select from user_roles where user_id = p_student and role = 'admin') then
    raise exception 'Student unavailable';
  end if;
  timing_mode := default_timing_mode;

  if p_accept is not null or p_replace is not null then
    if preview.id is distinct from coalesce(p_accept, p_replace)
      or preview.document_hash is distinct from p_hash
      or preview.document_id is distinct from p_document or preview.student_id is distinct from p_student
      or preview.source_revision is distinct from p_source_revision then
      raise exception 'Preview changed';
    end if;
    p_pt := (preview.snapshot->>'pt')::integer;
    p_section := (preview.snapshot->>'section')::integer;
    p_excerpt := preview.snapshot->>'excerpt';
    corrected := coalesce((preview.snapshot->>'corrected')::boolean, false);
    timing_mode := coalesce(preview.snapshot->>'timing_mode', default_timing_mode);
    if p_replace is not null then
      if p_accept is not null then raise exception 'Invalid correction'; end if;
      corrected := true;
      p_pt := coalesce(p_selected_pt, p_pt);
      p_section := coalesce(p_selected_section, p_section);
      timing_mode := coalesce(p_timing_mode, timing_mode);
      if p_pt is null or p_section is null then raise exception 'Choose a section'; end if;
    end if;
  elsif preview.document_hash = p_hash and preview.document_id = p_document
    and preview.student_id = p_student and preview.source_revision = p_source_revision
    and (preview.snapshot->>'corrected')::boolean then
    corrected := true;
    p_pt := (preview.snapshot->>'pt')::integer;
    p_section := (preview.snapshot->>'section')::integer;
    p_excerpt := preview.snapshot->>'excerpt';
    timing_mode := coalesce(preview.snapshot->>'timing_mode', default_timing_mode);
  end if;

  if (p_pt is null) <> (p_section is null)
    or (p_pt is not null and (p_pt not between 1 and 999 or p_section not between 1 and 4))
    or timing_mode not in ('35', '52.5', '70', 'unlimited') then
    raise exception 'Invalid section or timing';
  end if;

  -- The active protected catalog supplies the exact RC question order and source hash.
  if p_pt is not null then
    select m.definition, m.manifest_sha256 into rc_definition, rc_manifest_sha256
    from timed_section_configuration_v1 configuration
    join timed_section_content_manifests_v1 m on m.manifest_sha256 = configuration.manifest_sha256
    where configuration.singleton and configuration.enabled
      and m.pt = p_pt and m.section = p_section and m.kind = 'rc'
      and not exists (
        select from timed_section_content_manifests_v1 conflicting
        where conflicting.manifest_sha256 = m.manifest_sha256 and conflicting.pt = m.pt
          and conflicting.section = m.section and conflicting.kind <> m.kind
      )
    for share of configuration;
  end if;

  if rc_definition is not null then
    select array_agg(qid order by ordinal) into canonical
    from jsonb_array_elements_text(rc_definition->'qids') with ordinality as questions(qid, ordinal)
    having count(*) > 0 and count(distinct qid) = count(*)
      and count(*) = (rc_definition->>'questionCount')::integer
      and bool_and(qid <> '');
    if canonical is not null then
      catalog := jsonb_build_object('kind', 'rc',
        'title', format('PT%s, Section %s', p_pt, p_section), 'question_qids', canonical,
        'manifest_sha256', rc_manifest_sha256);
    end if;
  elsif p_pt is not null then
    select array_agg(qid order by question_number), min(question_number) = 1 and max(question_number) = count(*)
    into canonical, consecutive
    from (
      select qid, question_number from lr_questions
      where preptest = p_pt and section = p_section for share
    ) as questions
    having count(*) > 0 and count(distinct question_number) = count(*)
      and bool_and(qid = format('PT%s-S%s-Q%s', p_pt, p_section, question_number));
    -- A published section can omit a withdrawn question number. Accept a gap
    -- only when the resulting ordered question list matches a published manifest.
    if canonical is not null and (consecutive or exists (
      select from timed_section_content_manifests_v1 manifest
      where manifest.pt = p_pt and manifest.section = p_section and manifest.kind = 'lr'
        and manifest.definition->'qids' = to_jsonb(canonical)
    )) then
      catalog := jsonb_build_object('kind', 'lr',
        'title', format('PT%s, Section %s', p_pt, p_section), 'question_qids', canonical);
    end if;
  end if;

  snapshot := jsonb_build_object('pt', p_pt, 'section', p_section, 'excerpt', p_excerpt,
    'student_name', source.student_name, 'catalog', catalog, 'notify', false,
    'corrected', corrected, 'timing_mode', timing_mode);

  if p_accept is null then
    if preview.document_hash = p_hash and preview.document_id = p_document
      and preview.student_id = p_student and preview.source_revision = p_source_revision
      and preview.snapshot = snapshot then
      return to_jsonb(preview);
    end if;
    update teacher_transcript_assignment_previews set superseded_at = clock_timestamp()
      where id = preview.id;
    if p_excerpt is null then return null; end if;
    insert into teacher_transcript_assignment_previews
      (session_id, owner_id, student_id, document_id, document_hash, source_revision, snapshot)
      values (p_session, p_owner, p_student, p_document, p_hash, p_source_revision, snapshot)
      returning * into preview;
    return to_jsonb(preview);
  end if;

  if catalog is null or preview.snapshot is distinct from snapshot then
    raise exception 'Preview changed';
  end if;

  -- The assignment, Classroom mirror, audit entry and approval receipt commit together.
  insert into homework_assignments (
    student_id, class_id, assigned_by, set_title, question_qids, status,
    section_timing_mode, section_kind, section_preptest, section_number, section_manifest_sha256,
    notification_policy, notification_group_id
  ) values (
    p_student, p_student, p_owner, catalog->>'title', canonical, 'assigned',
    timing_mode,
    case when catalog->>'kind' = 'rc' then 'rc' end,
    case when catalog->>'kind' = 'rc' then p_pt end,
    case when catalog->>'kind' = 'rc' then p_section end,
    case when catalog->>'kind' = 'rc' then rc_manifest_sha256 end,
    'suppressed', gen_random_uuid()
  ) returning id into assignment_id;

  route := case when catalog->>'kind' = 'rc' then '/testing/sections/assigned/' else '/classroom/' end
    || assignment_id::text;
  insert into classroom_items (
    student_id, created_by, type, title, source_table, source_id, status, visible_to_student, metadata_json
  ) values (
    p_student, p_owner, 'homework', catalog->>'title', 'homework_assignments', assignment_id, 'assigned', true,
    jsonb_build_object('assigned_route', route, 'section_kind', catalog->>'kind', 'pt', p_pt,
      'section', p_section, 'section_timing_mode', timing_mode)
  );

  result := jsonb_build_object('ok', true, 'kind', 'homework_section',
    'assignment_id', assignment_id, 'student_id', p_student, 'title', catalog->>'title',
    'route', route, 'already_assigned', false, 'notified', false, 'timing_mode', timing_mode);
  insert into mcp_write_audit (actor_id, tool_name, idempotency_key, student_id, result)
    values (p_owner, 'assign_transcript_section', 'teacher-transcript:' || source.id, p_student, result);

  update teacher_transcript_assignment_previews
    set receipt = jsonb_build_object('approved_at', clock_timestamp(), 'approved_by', p_owner,
      'preview_id', preview.id, 'assignment', result)
    where id = preview.id returning * into preview;
  return to_jsonb(preview);
end;
$$;

revoke all on function public.teacher_transcript_assignment(
  uuid, uuid, text, text, uuid, integer, integer, integer, text, uuid, uuid, integer, integer, text
) from public, anon, authenticated;
grant execute on function public.teacher_transcript_assignment(
  uuid, uuid, text, text, uuid, integer, integer, integer, text, uuid, uuid, integer, integer, text
) to service_role;

commit;

begin;

create table public.teacher_transcript_assignment_previews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.teacher_post_session_tasks(id),
  owner_id uuid not null,
  student_id uuid not null,
  document_id text not null,
  document_hash text not null,
  source_revision integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  superseded_at timestamptz,
  receipt jsonb
);

create unique index teacher_transcript_current_preview
  on public.teacher_transcript_assignment_previews(session_id)
  where superseded_at is null;
alter table public.teacher_transcript_assignment_previews enable row level security;
revoke all on public.teacher_transcript_assignment_previews from public, anon, authenticated;
grant select on public.teacher_transcript_assignment_previews to service_role;

create function public.teacher_transcript_assignment(
  p_owner uuid, p_session uuid, p_document text, p_hash text,
  p_student uuid, p_source_revision integer, p_pt integer default null,
  p_section integer default null, p_excerpt text default null,
  p_accept uuid default null, p_replace uuid default null, p_selected_section integer default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  source teacher_post_session_tasks%rowtype;
  preview teacher_transcript_assignment_previews%rowtype;
  snapshot jsonb;
  canonical text[];
  catalog jsonb;
  candidate_count integer;
  result jsonb;
  corrected boolean := false;
begin
  if not exists (select from user_roles where user_id = p_owner and role = 'admin') then
    raise exception 'Teacher access required';
  end if;

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

  perform 1 from profiles
    where class_id = p_student::text and has_classroom_access and archived_at is null
    for share;
  if not found or exists (select from user_roles where user_id = p_student and role = 'admin') then
    raise exception 'Student unavailable';
  end if;

  if p_accept is not null or p_replace is not null then
    if preview.id is distinct from coalesce(p_accept, p_replace) or preview.document_hash is distinct from p_hash
      or preview.document_id is distinct from p_document or preview.student_id is distinct from p_student
      or preview.source_revision is distinct from p_source_revision then
      raise exception 'Preview changed';
    end if;
    p_pt := (preview.snapshot->>'pt')::integer;
    p_section := (preview.snapshot->>'section')::integer;
    p_excerpt := preview.snapshot->>'excerpt';
    corrected := coalesce((preview.snapshot->>'corrected')::boolean, false);
    if p_replace is not null then
      if p_accept is not null or p_selected_section is null or p_selected_section not between 1 and 4 then
        raise exception 'Invalid correction';
      end if;
      corrected := true;
      p_section := p_selected_section;
    end if;
  elsif preview.document_hash = p_hash and preview.document_id = p_document
    and preview.student_id = p_student and preview.source_revision = p_source_revision
    and (preview.snapshot->>'corrected')::boolean then
    corrected := true;
    p_pt := (preview.snapshot->>'pt')::integer;
    p_section := (preview.snapshot->>'section')::integer;
    p_excerpt := preview.snapshot->>'excerpt';
  end if;

  select array_agg(qid order by question_number) into canonical from (
    select qid, question_number from lr_questions
    where preptest = p_pt and section = p_section for share
  ) questions;
  select count(*), (jsonb_agg(to_jsonb(sets))->0) into candidate_count, catalog from (
    select id, title, description, question_qids, class_id
      from homework_sets where created_by = p_owner and question_qids = canonical
      for share
  ) sets;
  if candidate_count <> 1 then catalog := null; end if;
  snapshot := jsonb_build_object('pt', p_pt, 'section', p_section, 'excerpt', p_excerpt,
    'student_name', source.student_name, 'catalog', catalog, 'notify', false, 'corrected', corrected);

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

  -- The service-only caller authenticated this teacher before reading Drive.
  -- Attribute the existing transactional writer to that teacher.
  perform set_config('request.jwt.claim.sub', p_owner::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_owner, 'role', 'authenticated')::text, true);
  result := public.mcp_assign_homework_set(
    (catalog->>'id')::uuid, p_student, 'teacher-transcript:' || source.id, false
  );
  perform 1 from homework_assignments
    where id = (result->>'assignment_id')::uuid and student_id = p_student
      and set_id = (catalog->>'id')::uuid and question_qids = canonical
      and set_title = catalog->>'title' and set_description is not distinct from catalog->>'description'
      and status <> 'completed';
  if not found then raise exception 'Assignment does not match preview'; end if;

  update teacher_transcript_assignment_previews
    set receipt = jsonb_build_object('approved_at', clock_timestamp(), 'approved_by', p_owner,
      'preview_id', preview.id, 'assignment', result)
    where id = preview.id returning * into preview;
  return to_jsonb(preview);
end;
$$;

revoke all on function public.teacher_transcript_assignment(uuid,uuid,text,text,uuid,integer,integer,integer,text,uuid,uuid,integer)
  from public, anon, authenticated;
grant execute on function public.teacher_transcript_assignment(uuid,uuid,text,text,uuid,integer,integer,integer,text,uuid,uuid,integer)
  to service_role;

commit;

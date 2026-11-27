-- Isolated PGlite prerequisites for the real assignment/delivery migrations.
create schema auth;
create role anon;
create role authenticated;
create role service_role;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table public.fixture_teachers (id uuid primary key references auth.users(id));
create function public.has_role(actor uuid, wanted text) returns boolean language sql stable as $$
  select wanted = 'admin' and exists (select from public.fixture_teachers where id = actor)
$$;
create function public.mcp_require_admin() returns uuid language plpgsql as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Only administrators assign work'; end if;
  return auth.uid();
end $$;
create table public.profiles (class_id text primary key, display_name text not null);
create table public.student_context (id uuid primary key, student_id uuid not null, content_text text not null);
create table public.student_sessions (id uuid primary key, student_id uuid not null, transcript_id uuid not null references student_context);
create table public.fixture_enrollments (
  teacher_id uuid not null references auth.users, student_id uuid not null references auth.users,
  primary key (teacher_id, student_id)
);
create table public.session_note_ingestions (
  session_id uuid not null references student_sessions,
  actor_id uuid not null references auth.users,
  transcript_id uuid not null references student_context,
  primary key (session_id, actor_id, transcript_id)
);
create table public.homework_sets (
  id uuid primary key, title text not null, description text, question_qids text[] not null, class_id uuid
);
create table public.fixture_sections (
  pt integer not null, section integer not null, set_id uuid not null references homework_sets,
  active boolean not null default true, primary key (pt, section)
);
create table public.homework_assignments (
  id uuid primary key default gen_random_uuid(), set_id uuid not null references homework_sets,
  student_id uuid not null references auth.users, question_qids text[] not null, set_title text not null,
  set_description text, status text not null, assigned_by uuid not null references auth.users,
  class_id uuid, created_at timestamptz not null default now(), unique (set_id, student_id)
);
create table public.classroom_items (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references auth.users,
  class_id uuid, created_by uuid, type text not null, title text, description text,
  source_table text, source_id uuid, status text, visible_to_student boolean default false,
  metadata_json jsonb, content_html text, content_markdown text, created_at timestamptz not null default now()
);
create table public.ta_assignments (id uuid primary key, student_id uuid not null);
create table public.guided_drill_assignments (like public.ta_assignments including all);
create table public.activity_assignments (like public.ta_assignments including all);
create table public.practice_test_assignments (like public.ta_assignments including all);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
  type text not null, title text not null, body text, link text, read boolean not null default false
);
create table public.mcp_write_audit (
  actor_id uuid not null, tool_name text not null, idempotency_key text not null, student_id uuid not null,
  result jsonb not null, primary key (actor_id, tool_name, idempotency_key)
);
create table public.fixture_conversations (
  id uuid primary key default gen_random_uuid(), actor uuid not null, student uuid not null, unique (actor, student)
);
create function public.mcp_get_or_create_admin_student_conversation(p_actor uuid, p_student uuid)
returns uuid language sql as $$
  insert into public.fixture_conversations(actor, student) values (p_actor, p_student)
  on conflict (actor, student) do update set student = excluded.student returning id
$$;
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references fixture_conversations,
  sender_id uuid not null references auth.users, body text not null
);
create table public.fixture_actions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users,
  student_id uuid not null references auth.users,
  session_id uuid not null references student_sessions,
  source_anchor text not null,
  matched_anchor text,
  source_transcript_id uuid not null references student_context(id),
  conflict jsonb,
  excerpt text not null,
  pt integer not null,
  section integer not null,
  state text not null check (state in ('pending', 'pin', 'done', 'dismissed')),
  current_revision uuid,
  receipt jsonb,
  unique (teacher_id, student_id, session_id, source_anchor)
);
create table public.fixture_action_reconciliation (
  teacher_id uuid not null references auth.users(id),
  student_id uuid not null references auth.users(id),
  session_id uuid not null references student_sessions(id),
  transcript_id uuid not null references student_context(id),
  source_anchor text not null,
  excerpt text not null,
  primary key (teacher_id, student_id, session_id, transcript_id, source_anchor)
);
create table public.fixture_previews (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references fixture_actions,
  actor uuid not null references auth.users,
  student_id uuid not null references auth.users,
  pt integer not null,
  section integer not null,
  set_id uuid not null references homework_sets,
  title text not null,
  question_qids text[] not null,
  notification text not null
);

create function public.fixture_require_current_source(p_action public.fixture_actions) returns void
language plpgsql as $$
begin
  perform 1 from public.student_sessions
    where id = p_action.session_id and transcript_id = p_action.source_transcript_id
    for share;
  if not found then raise exception 'Transcript changed'; end if;
  if p_action.conflict is not null then raise exception 'Resolve the transcript conflict first'; end if;
end $$;

create function public.fixture_preview(p_action uuid, p_section integer) returns jsonb
language plpgsql as $$
declare
  action public.fixture_actions;
  new_preview public.fixture_previews;
begin
  select * into action from public.fixture_actions where id = p_action for update;
  if not found or action.teacher_id is distinct from auth.uid() then raise exception 'Not your task'; end if;
  perform 1 from public.fixture_enrollments where teacher_id = auth.uid() and student_id = action.student_id for share;
  if not found then raise exception 'Student enrollment changed'; end if;
  if action.state in ('done', 'dismissed') then raise exception 'Action is closed'; end if;
  perform public.fixture_require_current_source(action);

  insert into public.fixture_previews(action_id, actor, student_id, pt, section, set_id, title, question_qids, notification)
    select action.id, action.teacher_id, action.student_id, c.pt, c.section, s.id, s.title, s.question_qids,
      'In-app assignment notification and an inbox message'
    from public.fixture_sections c join public.homework_sets s on s.id = c.set_id
    where c.pt = action.pt and c.section = p_section and c.active
    returning * into new_preview;
  if not found then raise exception 'Section is not assignable'; end if;
  update public.fixture_actions set section = p_section, state = 'pending', current_revision = new_preview.id where id = action.id;
  return to_jsonb(new_preview);
end $$;

create function public.fixture_execute(p_action uuid, p_revision uuid) returns jsonb
language plpgsql as $$
declare
  action public.fixture_actions;
  preview public.fixture_previews;
  result jsonb;
begin
  select * into action from public.fixture_actions where id = p_action for update;
  if not found or action.teacher_id is distinct from auth.uid() then raise exception 'Not your task'; end if;
  perform 1 from public.fixture_enrollments where teacher_id = auth.uid() and student_id = action.student_id for share;
  if not found then raise exception 'Student enrollment changed'; end if;
  if action.current_revision is distinct from p_revision or p_revision is null then raise exception 'Preview changed'; end if;
  if action.receipt is not null then return action.receipt; end if;
  perform public.fixture_require_current_source(action);
  select * into strict preview from public.fixture_previews where id = p_revision and action_id = action.id;
  if action.state <> 'pending' or preview.actor <> auth.uid() or preview.student_id <> action.student_id then
    raise exception 'Approval does not match the current action';
  end if;
  perform 1 from public.fixture_sections c join public.homework_sets s on s.id = c.set_id
    where c.pt = preview.pt and c.section = preview.section and c.active and c.set_id = preview.set_id
      and s.title = preview.title and s.question_qids = preview.question_qids
    for share of c, s;
  if not found then raise exception 'Section changed'; end if;
  perform 1 from public.assignment_delivery_control where singleton and enabled for share;
  if not found then raise exception 'Assignment notifications unavailable'; end if;

  result := public.mcp_assign_homework_set(preview.set_id, preview.student_id, action.id::text, true);
  update public.fixture_actions set state = 'done', receipt = result where id = action.id;
  return result;
end $$;


create function public.fixture_dismiss(p_action uuid) returns jsonb
language plpgsql as $$
declare
  action public.fixture_actions;
begin
  update public.fixture_actions set state = 'dismissed', current_revision = null
    where id = p_action and teacher_id = auth.uid() and state in ('pin', 'pending', 'dismissed')
    returning * into action;
  if not found then raise exception 'Action is closed or belongs to another teacher'; end if;
  return to_jsonb(action);
end $$;

create function public.fixture_resolve_source(
  p_action uuid, p_conflict uuid, p_choice text, p_revised_index integer
) returns jsonb language plpgsql as $$
declare
  action public.fixture_actions;
  candidate jsonb;
begin
  select * into action from public.fixture_actions where id = p_action for update;
  if not found or action.teacher_id is distinct from auth.uid() then raise exception 'Not your task'; end if;
  perform 1 from public.fixture_enrollments where teacher_id = auth.uid() and student_id = action.student_id for share;
  if not found then raise exception 'Student enrollment changed'; end if;
  if action.state in ('done', 'dismissed') or (action.conflict->>'id')::uuid is distinct from p_conflict or p_conflict is null then
    raise exception 'Conflict changed';
  end if;
  perform 1 from public.student_sessions where id = action.session_id and transcript_id = action.source_transcript_id for share;
  if not found then raise exception 'Transcript changed'; end if;
  if p_choice = 'revised' then
    if p_revised_index is null or p_revised_index < 0 then raise exception 'Choose a revised excerpt'; end if;
    candidate := action.conflict->'revised_excerpts'->p_revised_index;
    if candidate is null then raise exception 'Choose a revised excerpt'; end if;
    if exists (
      select from public.fixture_actions other
      where other.teacher_id = action.teacher_id and other.student_id = action.student_id
        and other.session_id = action.session_id and other.id <> action.id
        and coalesce(other.matched_anchor, other.source_anchor) = candidate->>'anchor'
    ) then raise exception 'The revised statement belongs to a different item'; end if;
    update public.fixture_actions
      set matched_anchor = candidate->>'anchor', excerpt = candidate->>'excerpt',
          pt = (candidate->>'pt')::int, section = (candidate->>'section')::int,
          state = candidate->>'state'
      where id = action.id;
  elsif p_choice is distinct from 'keep' then
    raise exception 'Choose how to resolve this conflict';
  end if;
  update public.fixture_actions set conflict = null, current_revision = null
    where id = action.id returning * into action;
  if action.state = 'pending' then
    perform public.fixture_preview(action.id, action.section);
    select * into action from public.fixture_actions where id = p_action;
  end if;
  return to_jsonb(action);
end $$;

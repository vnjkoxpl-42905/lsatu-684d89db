-- Teaching notes an admin writes under a drill question.
-- One note per (author, question). Admin-only end to end: no student can read,
-- write, or learn that a note exists. Plain text, not an annotation layer.
create table if not exists public.admin_question_notes (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users (id) on delete cascade,
  qid         text not null,
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- The note is keyed by question, so writing is an upsert on this pair and a
  -- second note for the same question can never be created by a double-save.
  unique (author_id, qid)
);

comment on table public.admin_question_notes is
  'Admin-authored teaching notes shown under a drill question. One row per (author, qid). Admin-only at the RLS layer - students never read these.';

comment on column public.admin_question_notes.qid is
  'Question bank qid the note belongs to. Text, matching the qid used throughout the drill surfaces.';

alter table public.admin_question_notes enable row level security;

-- One policy per command rather than a single `for all`, so a future change to
-- (say) delete cannot silently widen select. Each is the same two-part test:
-- the caller is an admin, AND the row is their own. Being an admin does not
-- grant sight of another admin's notes; these are personal teaching notes.
--
-- Each create is preceded by a guarded drop. This same migration exists in two
-- places (supabase/migrations and drizzle/migrations) after a parallel session
-- and a Lovable commit produced it independently. The table and trigger were
-- already idempotent; the policies were not, so applying both would fail here
-- on the first create. Consolidating to one home is still worth doing.
drop policy if exists "admins read their own question notes" on public.admin_question_notes;
create policy "admins read their own question notes"
  on public.admin_question_notes for select
  using (public.has_role(auth.uid(), 'admin') and author_id = auth.uid());

drop policy if exists "admins write their own question notes" on public.admin_question_notes;
create policy "admins write their own question notes"
  on public.admin_question_notes for insert
  with check (public.has_role(auth.uid(), 'admin') and author_id = auth.uid());

drop policy if exists "admins update their own question notes" on public.admin_question_notes;
create policy "admins update their own question notes"
  on public.admin_question_notes for update
  using (public.has_role(auth.uid(), 'admin') and author_id = auth.uid())
  with check (public.has_role(auth.uid(), 'admin') and author_id = auth.uid());

drop policy if exists "admins delete their own question notes" on public.admin_question_notes;
create policy "admins delete their own question notes"
  on public.admin_question_notes for delete
  using (public.has_role(auth.uid(), 'admin') and author_id = auth.uid());

-- updated_at is what the UI shows as "saved", so it must not depend on the
-- client remembering to send it.
create or replace function public.touch_admin_question_notes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_question_notes_touch on public.admin_question_notes;

create trigger admin_question_notes_touch
  before update on public.admin_question_notes
  for each row execute function public.touch_admin_question_notes();

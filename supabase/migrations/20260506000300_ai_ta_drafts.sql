-- ai_ta_drafts: approval queue for AI-generated outputs (weekly plans,
-- next assignments, recaps, messages, full classroom-update bundles).
-- Admin-only. Students never see this table; output reaches them only
-- after Joshua approves and the draft is materialised as classroom_items.

create table if not exists public.ai_ta_drafts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid,
  created_by uuid not null,
  draft_type text not null check (draft_type in (
    'weekly_plan','next_assignment','session_recap','next_session_plan',
    'classroom_update_bundle','message'
  )),
  prompt text,
  input_snapshot_json jsonb not null default '{}'::jsonb,
  draft_json jsonb,
  draft_markdown text,
  status text not null default 'draft' check (status in (
    'draft','approved','rejected','posted'
  )),
  approved_by uuid,
  approved_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_ta_drafts_student_idx
  on public.ai_ta_drafts (student_id, status, created_at desc);

create or replace function public.touch_ai_ta_drafts_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists ai_ta_drafts_touch on public.ai_ta_drafts;
create trigger ai_ta_drafts_touch before update on public.ai_ta_drafts
  for each row execute function public.touch_ai_ta_drafts_updated_at();

alter table public.ai_ta_drafts enable row level security;

-- Admin-only. No student SELECT policy at all.
create policy ai_ta_drafts_admin_all on public.ai_ta_drafts
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
